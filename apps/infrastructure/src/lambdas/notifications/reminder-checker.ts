import { ScheduledEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sqs = new SQSClient({});
const TABLE_NAME = process.env.TABLE_NAME!;
const NOTIFICATION_QUEUE_URL = process.env.NOTIFICATION_QUEUE_URL!;

/**
 * Runs every 5 minutes via EventBridge.
 * Queries GSI2 for reminders that should fire in the current 5-minute window.
 * Sends matching reminders to the notification queue for delivery.
 */
export const handler = async (_event: ScheduledEvent) => {
  try {
    const now = new Date();
    const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);

    const todayStr = now.toISOString().split('T')[0];
    const nowTime = now.toISOString().split('T')[1].substring(0, 5);
    const laterTime = fiveMinutesLater.toISOString().split('T')[1].substring(0, 5);

    // Query reminders scheduled for the current time window
    const result = await dynamo.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :pk AND GSI2SK BETWEEN :start AND :end',
        ExpressionAttributeValues: {
          ':pk': `SCHEDULE#${todayStr}`,
          ':start': nowTime,
          ':end': laterTime + 'Z', // Slightly past to include boundary
        },
        FilterExpression: 'delivered = :false',
        ExpressionAttributeNames: undefined,
      })
    );

    const reminders = result.Items || [];
    console.log(
      `Found ${reminders.length} reminders to send for ${todayStr} ${nowTime}-${laterTime}`
    );

    // Send each reminder to the notification queue
    for (const reminder of reminders) {
      await sqs.send(
        new SendMessageCommand({
          QueueUrl: NOTIFICATION_QUEUE_URL,
          MessageBody: JSON.stringify({
            userId: reminder.userId,
            title: reminder.title,
            body: reminder.body,
            reminderId: reminder.id,
            data: {
              type: 'reminder',
              reminderId: reminder.id,
              relatedTaskId: reminder.relatedTaskId,
              relatedEventId: reminder.relatedEventId,
            },
          }),
        })
      );
    }
  } catch (err) {
    console.error('Reminder checker error:', err);
  }
};
