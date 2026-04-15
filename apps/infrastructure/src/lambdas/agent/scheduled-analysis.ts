import { ScheduledEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const bedrock = new BedrockRuntimeClient({});
const TABLE_NAME = process.env.TABLE_NAME!;
const MODEL_ID = 'anthropic.claude-sonnet-4-20250514';

/**
 * Runs every 30 minutes. For each user, checks if there's anything
 * that warrants a proactive notification.
 */
export const handler = async (_event: ScheduledEvent) => {
  try {
    // Get all users (in production, paginate or use a user list)
    const usersResult = await dynamo.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'SK = :sk',
        ExpressionAttributeValues: { ':sk': 'PROFILE' },
        ProjectionExpression: 'PK, id, #n, timezone, preferences',
        ExpressionAttributeNames: { '#n': 'name' },
      })
    );

    for (const user of usersResult.Items || []) {
      await analyzeUserContext(user);
    }
  } catch (err) {
    console.error('Scheduled analysis error:', err);
  }
};

async function analyzeUserContext(user: any) {
  const userId = user.id;
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const tomorrowStr = new Date(now.getTime() + 86400000)
    .toISOString()
    .split('T')[0];

  // Fetch upcoming tasks and events
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
        KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK BETWEEN :start AND :end',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}#EVENT`,
          ':start': todayStr,
          ':end': tomorrowStr + 'T23:59:59Z',
        },
      })
    ),
  ]);

  const pendingTasks = (tasksResult.Items || []).filter(
    (t: any) => t.status === 'pending'
  );
  const upcomingEvents = eventsResult.Items || [];

  // Check if there's anything worth notifying about
  const overdueTasks = pendingTasks.filter(
    (t: any) => t.dueDate && t.dueDate < todayStr
  );
  const todayTasks = pendingTasks.filter(
    (t: any) => t.dueDate && t.dueDate.startsWith(todayStr)
  );

  // Only call AI if there's something to analyze
  if (overdueTasks.length === 0 && todayTasks.length === 0 && upcomingEvents.length === 0) {
    return;
  }

  const prompt = `Current time: ${now.toISOString()}
User: ${user.name || 'User'} (${user.timezone || 'America/New_York'})

Overdue tasks: ${overdueTasks.map((t: any) => `"${t.title}" (due ${t.dueDate})`).join(', ') || 'None'}
Today's tasks: ${todayTasks.map((t: any) => `"${t.title}"`).join(', ') || 'None'}
Upcoming events (today/tomorrow): ${upcomingEvents.map((e: any) => `"${e.title}" at ${e.startTime}`).join(', ') || 'None'}

Should we send a proactive notification to the user right now? Consider:
- Are there overdue items they need to act on?
- Is there an event coming up in the next few hours with prerequisites?
- Is it a good time to remind them based on their timezone?

If yes, provide the notification. If no, say "NO_NOTIFICATION".
Format: {"notify": true/false, "title": "...", "body": "..."}`;

  try {
    const response = await bedrock.send(
      new ConverseCommand({
        modelId: MODEL_ID,
        messages: [{ role: 'user', content: [{ text: prompt }] }],
        system: [
          {
            text: 'You are a proactive AI secretary. Decide if the user needs a notification right now. Only notify when genuinely helpful. Respond with JSON.',
          },
        ],
      })
    );

    let responseText = '';
    for (const block of response.output?.message?.content || []) {
      if (block.text) responseText += block.text;
    }

    if (responseText.includes('NO_NOTIFICATION')) return;

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      if (result?.notify) {
        // Store notification for delivery
        const notifId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        await dynamo.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: {
              PK: `USER#${userId}`,
              SK: `NOTIF#${now.toISOString()}`,
              id: notifId,
              userId,
              title: result.title,
              body: result.body,
              delivered: false,
              createdAt: now.toISOString(),
            },
          })
        );
      }
    } catch {
      // Parse error - skip notification
    }
  } catch (err) {
    console.error(`AI analysis failed for user ${userId}:`, err);
  }
}
