import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = event.requestContext.authorizer?.claims?.sub;
    if (!userId) return resp(401, { error: 'Unauthorized' });

    const body = JSON.parse(event.body || '{}');
    const { pushToken } = body;

    if (!pushToken) {
      return resp(400, { error: 'pushToken required' });
    }

    await client.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `USER#${userId}`,
          SK: `DEVICE#${pushToken}`,
          userId,
          pushToken,
          platform: body.platform || 'expo',
          registeredAt: new Date().toISOString(),
        },
      })
    );

    return resp(200, { success: true, message: 'Device registered' });
  } catch (err) {
    console.error('Register device error:', err);
    return resp(500, { success: false, error: 'Registration failed' });
  }
};

function resp(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  };
}
