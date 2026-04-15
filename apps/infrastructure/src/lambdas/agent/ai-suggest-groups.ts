import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const bedrock = new BedrockRuntimeClient({});
const TABLE_NAME = process.env.TABLE_NAME!;
const MODEL_ID = 'anthropic.claude-sonnet-4-20250514';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = event.requestContext.authorizer?.claims?.sub;
    if (!userId) return resp(401, { error: 'Unauthorized' });

    // Fetch pending tasks
    const tasksResult = await dynamo.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':prefix': 'TASK#',
        },
      })
    );

    const tasks = (tasksResult.Items || []).filter(
      (t: any) => t.status === 'pending' || t.status === 'in_progress'
    );

    if (tasks.length < 2) {
      return resp(200, {
        success: true,
        data: [],
        message: 'Not enough tasks to group',
      });
    }

    const prompt = `Analyze these tasks and find groups that can be done together (same store, same area, related work, etc.).

## Tasks:
${tasks
  .map(
    (t: any) =>
      `- ID: ${t.id} | "${t.title}" [${t.category}]${t.location ? ` @ ${t.location}` : ''}${t.dueDate ? ` due: ${t.dueDate}` : ''}`
  )
  .join('\n')}

Find logical groupings. Consider:
- Tasks at the same store/location
- Errands that are near each other geographically
- Home projects that use the same tools/materials
- Tasks that have a natural sequence

Respond with a JSON array of groups:
[{
  "name": "Group name (e.g., 'Home Depot Run')",
  "taskIds": ["id1", "id2"],
  "reasoning": "Why these go together",
  "suggestedRoute": "Optional: best order of stops",
  "estimatedTotalMinutes": 60
}]

Only suggest groups with 2+ tasks. If no good groups exist, return [].`;

    const response = await bedrock.send(
      new ConverseCommand({
        modelId: MODEL_ID,
        messages: [{ role: 'user', content: [{ text: prompt }] }],
        system: [
          {
            text: 'You are a task optimization AI. Analyze tasks and suggest logical groupings. Respond ONLY with a JSON array.',
          },
        ],
      })
    );

    let responseText = '';
    for (const block of response.output?.message?.content || []) {
      if (block.text) responseText += block.text;
    }

    let groups: any[] = [];
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      groups = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      groups = [];
    }

    // Save groups to DynamoDB
    const now = new Date().toISOString();
    const savedGroups = [];

    for (const group of groups) {
      const groupId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      await dynamo.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: `USER#${userId}`,
            SK: `GROUP#${groupId}`,
            GSI1PK: `USER#${userId}#GROUP`,
            GSI1SK: group.suggestedDate || now,
            id: groupId,
            userId,
            name: group.name,
            taskIds: group.taskIds,
            reason: group.reasoning,
            suggestedRoute: group.suggestedRoute,
            estimatedTotalMinutes: group.estimatedTotalMinutes || 60,
            accepted: false,
            createdAt: now,
          },
        })
      );

      savedGroups.push({
        id: groupId,
        ...group,
        accepted: false,
        createdAt: now,
      });
    }

    return resp(200, { success: true, data: savedGroups });
  } catch (err) {
    console.error('AI Suggest Groups error:', err);
    return resp(500, { success: false, error: 'Grouping analysis failed' });
  }
};

function resp(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  };
}
