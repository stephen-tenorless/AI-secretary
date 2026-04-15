import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const bedrock = new BedrockRuntimeClient({});
const TABLE_NAME = process.env.TABLE_NAME!;
const MODEL_ID = 'anthropic.claude-sonnet-4-20250514';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = event.requestContext.authorizer?.claims?.sub;
    if (!userId) return resp(401, { error: 'Unauthorized' });

    // Fetch all user data
    const [tasksResult, eventsResult] = await Promise.all([
      dynamo.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: {
            ':pk': `USER#${userId}`,
            ':prefix': 'TASK#',
          },
        })
      ),
      dynamo.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :pk',
          ExpressionAttributeValues: {
            ':pk': `USER#${userId}#EVENT`,
          },
        })
      ),
    ]);

    const tasks = (tasksResult.Items || []).filter(
      (t: any) => t.status !== 'completed' && t.status !== 'cancelled'
    );
    const events_data = eventsResult.Items || [];

    const analysisPrompt = `Analyze this user's task list and schedule. Provide actionable insights.

## Pending Tasks (${tasks.length}):
${tasks
  .map(
    (t: any) =>
      `- [${t.priority}/${t.category}] ${t.title}${t.location ? ` @ ${t.location}` : ''}${t.dueDate ? ` due: ${t.dueDate}` : ''}`
  )
  .join('\n')}

## Upcoming Events (${events_data.length}):
${events_data
  .map(
    (e: any) =>
      `- ${e.title} at ${e.startTime}${e.location ? ` @ ${e.location}` : ''}`
  )
  .join('\n')}

Provide:
1. **Insights**: What patterns do you see? Overdue items? Overloaded days?
2. **Suggestions**: What should the user focus on? What can be grouped? What's at risk?

Be specific and actionable. Format as JSON with "insights" (string[]) and "suggestions" (string[]) arrays.`;

    const response = await bedrock.send(
      new ConverseCommand({
        modelId: MODEL_ID,
        messages: [{ role: 'user', content: [{ text: analysisPrompt }] }],
        system: [
          {
            text: 'You are an AI Secretary analyzing a user\'s tasks and schedule. Respond with a JSON object containing "insights" and "suggestions" arrays. Be specific and actionable.',
          },
        ],
      })
    );

    let analysisText = '';
    for (const block of response.output?.message?.content || []) {
      if (block.text) analysisText += block.text;
    }

    // Parse JSON from response
    let analysis;
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { insights: [analysisText], suggestions: [] };
    } catch {
      analysis = { insights: [analysisText], suggestions: [] };
    }

    return resp(200, { success: true, data: analysis });
  } catch (err) {
    console.error('AI Analyze error:', err);
    return resp(500, { success: false, error: 'Analysis failed' });
  }
};

function resp(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  };
}
