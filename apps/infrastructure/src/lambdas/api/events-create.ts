import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sqs = new SQSClient({});
const TABLE_NAME = process.env.TABLE_NAME!;
const AI_QUEUE_URL = process.env.AI_QUEUE_URL!;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = event.requestContext.authorizer?.claims?.sub;
    if (!userId) {
      return response(401, { error: 'Unauthorized' });
    }

    const body = JSON.parse(event.body || '{}');
    const eventId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    const scheduleEvent = {
      id: eventId,
      userId,
      title: body.title,
      description: body.description,
      startTime: body.startTime,
      endTime: body.endTime,
      location: body.location,
      isAllDay: body.isAllDay || false,
      source: body.source || 'manual',
      linkedTaskId: body.linkedTaskId,
      reminders: body.reminders || [],
      createdAt: now,
      updatedAt: now,
    };

    await dynamo.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `USER#${userId}`,
          SK: `EVENT#${eventId}`,
          GSI1PK: `USER#${userId}#EVENT`,
          GSI1SK: scheduleEvent.startTime,
          ...scheduleEvent,
        },
      })
    );

    // Trigger AI analysis to generate context-aware reminders
    await sqs.send(
      new SendMessageCommand({
        QueueUrl: AI_QUEUE_URL,
        MessageBody: JSON.stringify({
          type: 'analyze_event',
          userId,
          eventId,
          event: scheduleEvent,
        }),
      })
    );

    return response(201, { success: true, data: scheduleEvent });
  } catch (err) {
    console.error('Create event error:', err);
    return response(500, { success: false, error: 'Failed to create event' });
  }
};

function response(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}
