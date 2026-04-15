import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = event.requestContext.authorizer?.claims?.sub;
    if (!userId) {
      return response(401, { error: 'Unauthorized' });
    }

    const { status, category } = event.queryStringParameters || {};

    // Query using GSI1 for status-based filtering
    let result;
    if (status) {
      result = await client.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :status)',
          ExpressionAttributeValues: {
            ':pk': `USER#${userId}#TASK`,
            ':status': status,
          },
        })
      );
    } else {
      result = await client.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: {
            ':pk': `USER#${userId}`,
            ':prefix': 'TASK#',
          },
        })
      );
    }

    let tasks = (result.Items || []).map(stripDynamoKeys);

    // Client-side category filter
    if (category) {
      tasks = tasks.filter((t: any) => t.category === category);
    }

    return response(200, { success: true, data: tasks });
  } catch (err) {
    console.error('List tasks error:', err);
    return response(500, { success: false, error: 'Failed to list tasks' });
  }
};

function stripDynamoKeys(item: Record<string, any>) {
  const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...rest } = item;
  return rest;
}

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
