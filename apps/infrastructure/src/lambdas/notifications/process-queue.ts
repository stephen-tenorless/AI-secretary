import { SQSHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME!;

/**
 * Processes notification messages from the SQS queue.
 * Sends push notifications via Expo Push Notification Service.
 */
export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) {
    try {
      const notification = JSON.parse(record.body);
      const { userId, title, body, reminderId } = notification;

      // Get user's push tokens
      const devicesResult = await dynamo.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: {
            ':pk': `USER#${userId}`,
            ':prefix': 'DEVICE#',
          },
        })
      );

      const devices = devicesResult.Items || [];

      // Send to each registered device via Expo Push API
      for (const device of devices) {
        if (device.pushToken) {
          await sendExpoPush(device.pushToken, title, body, notification.data);
        }
      }

      // Mark reminder as delivered if applicable
      if (reminderId) {
        await dynamo.send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: `USER#${userId}`, SK: `REMINDER#${reminderId}` },
            UpdateExpression: 'SET delivered = :d, deliveredAt = :t',
            ExpressionAttributeValues: {
              ':d': true,
              ':t': new Date().toISOString(),
            },
          })
        );
      }

      console.log(
        `Notification sent to ${devices.length} devices for user ${userId}`
      );
    } catch (err) {
      console.error('Process notification error:', err);
      // Don't throw - let other messages in the batch process
    }
  }
};

async function sendExpoPush(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        title,
        body,
        data: data || {},
        sound: 'default',
        badge: 1,
        priority: 'high',
      }),
    });

    if (!response.ok) {
      console.error('Expo push failed:', await response.text());
    }
  } catch (err) {
    console.error('Failed to send Expo push:', err);
  }
}
