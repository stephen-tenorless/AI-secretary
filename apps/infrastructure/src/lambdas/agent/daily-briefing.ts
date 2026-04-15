import { ScheduledEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const bedrock = new BedrockRuntimeClient({});
const TABLE_NAME = process.env.TABLE_NAME!;
const MODEL_ID = 'anthropic.claude-sonnet-4-20250514';

/**
 * Daily morning briefing generator.
 * Runs once a day, generates a personalized daily summary for each user.
 */
export const handler = async (_event: ScheduledEvent) => {
  try {
    const usersResult = await dynamo.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'SK = :sk',
        ExpressionAttributeValues: { ':sk': 'PROFILE' },
      })
    );

    for (const user of usersResult.Items || []) {
      if (user.preferences?.enableProactiveReminders !== false) {
        await generateBriefing(user);
      }
    }
  } catch (err) {
    console.error('Daily briefing error:', err);
  }
};

async function generateBriefing(user: any) {
  const userId = user.id;
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

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
        KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK >= :today',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}#EVENT`,
          ':today': todayStr,
        },
      })
    ),
  ]);

  const allTasks = tasksResult.Items || [];
  const pendingTasks = allTasks.filter(
    (t: any) => t.status === 'pending' || t.status === 'in_progress'
  );
  const overdueTasks = pendingTasks.filter(
    (t: any) => t.dueDate && t.dueDate < todayStr
  );
  const todayTasks = pendingTasks.filter(
    (t: any) => t.dueDate && t.dueDate.startsWith(todayStr)
  );
  const todayEvents = (eventsResult.Items || []).filter(
    (e: any) => e.startTime.startsWith(todayStr)
  );

  const prompt = `Generate a concise, friendly morning briefing for ${user.name || 'the user'}.

Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.

## Today's Schedule (${todayEvents.length} events):
${todayEvents.map((e: any) => `- ${new Date(e.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}: ${e.title}${e.location ? ` @ ${e.location}` : ''}`).join('\n') || 'No events scheduled'}

## Overdue Tasks (${overdueTasks.length}):
${overdueTasks.map((t: any) => `- [${t.priority}] ${t.title} (was due ${t.dueDate})`).join('\n') || 'None - great job!'}

## Today's Tasks (${todayTasks.length}):
${todayTasks.map((t: any) => `- [${t.priority}] ${t.title}${t.location ? ` @ ${t.location}` : ''}`).join('\n') || 'Nothing specifically due today'}

## All Pending (${pendingTasks.length} total):
${pendingTasks.slice(0, 10).map((t: any) => `- [${t.priority}/${t.category}] ${t.title}`).join('\n')}

Generate a brief, actionable morning summary. Include:
1. A quick overview of the day
2. Top priorities to focus on
3. Any potential issues or conflicts
4. One helpful suggestion

Keep it under 200 words. Be friendly but efficient.`;

  try {
    const response = await bedrock.send(
      new ConverseCommand({
        modelId: MODEL_ID,
        messages: [{ role: 'user', content: [{ text: prompt }] }],
        system: [
          {
            text: 'You are an AI Secretary generating a morning briefing. Be concise, warm, and actionable.',
          },
        ],
      })
    );

    let briefingText = '';
    for (const block of response.output?.message?.content || []) {
      if (block.text) briefingText += block.text;
    }

    // Save as notification
    const notifId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    await dynamo.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `USER#${userId}`,
          SK: `NOTIF#${now.toISOString()}`,
          id: notifId,
          userId,
          title: 'Good Morning - Daily Briefing',
          body: briefingText,
          type: 'daily_briefing',
          delivered: false,
          createdAt: now.toISOString(),
        },
      })
    );
  } catch (err) {
    console.error(`Briefing generation failed for user ${userId}:`, err);
  }
}
