import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = event.requestContext.authorizer?.claims?.sub;
    if (!userId) {
      return response(401, { error: 'Unauthorized' });
    }

    const taskId = event.pathParameters?.id;
    if (!taskId) {
      return response(400, { error: 'Task ID required' });
    }

    const result = await client.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: `TASK#${taskId}` },
      })
    );

    if (!result.Item) {
      return response(404, { success: false, error: 'Task not found' });
    }

    const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...task } = result.Item;
    return response(200, { success: true, data: task });
  } catch (err) {
    console.error('Get task error:', err);
    return response(500, { success: false, error: 'Failed to get task' });
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
