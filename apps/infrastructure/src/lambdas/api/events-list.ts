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

    const { startDate, endDate } = event.queryStringParameters || {};

    const params: any = {
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}#EVENT`,
      },
    };

    // Add date range filter
    if (startDate && endDate) {
      params.KeyConditionExpression += ' AND GSI1SK BETWEEN :start AND :end';
      params.ExpressionAttributeValues[':start'] = startDate;
      params.ExpressionAttributeValues[':end'] = endDate + 'T23:59:59Z';
    } else if (startDate) {
      params.KeyConditionExpression += ' AND GSI1SK >= :start';
      params.ExpressionAttributeValues[':start'] = startDate;
    }

    const result = await client.send(new QueryCommand(params));
    const events = (result.Items || []).map(stripDynamoKeys);

    return response(200, { success: true, data: events });
  } catch (err) {
    console.error('List events error:', err);
    return response(500, { success: false, error: 'Failed to list events' });
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
