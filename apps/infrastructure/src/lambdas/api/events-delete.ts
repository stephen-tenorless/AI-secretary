import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = event.requestContext.authorizer?.claims?.sub;
    if (!userId) return response(401, { error: 'Unauthorized' });

    const eventId = event.pathParameters?.id;
    if (!eventId) return response(400, { error: 'Event ID required' });

    await client.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: `EVENT#${eventId}` },
        ConditionExpression: 'attribute_exists(PK)',
      })
    );

    return response(200, { success: true });
  } catch (err: any) {
    if (err.name === 'ConditionalCheckFailedException') {
      return response(404, { success: false, error: 'Event not found' });
    }
    console.error('Delete event error:', err);
    return response(500, { success: false, error: 'Failed to delete event' });
  }
};

function response(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  };
}
