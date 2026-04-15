import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = event.requestContext.authorizer?.claims?.sub;
    if (!userId) return response(401, { error: 'Unauthorized' });

    const eventId = event.pathParameters?.id;
    if (!eventId) return response(400, { error: 'Event ID required' });

    const body = JSON.parse(event.body || '{}');
    const now = new Date().toISOString();

    const allowedFields = [
      'title', 'description', 'startTime', 'endTime',
      'location', 'isAllDay', 'reminders', 'linkedTaskId',
    ];

    const expressionParts: string[] = ['#updatedAt = :updatedAt'];
    const names: Record<string, string> = { '#updatedAt': 'updatedAt' };
    const values: Record<string, any> = { ':updatedAt': now };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        expressionParts.push(`#${field} = :${field}`);
        names[`#${field}`] = field;
        values[`:${field}`] = body[field];
      }
    }

    if (body.startTime) {
      expressionParts.push('#gsi1sk = :gsi1sk');
      names['#gsi1sk'] = 'GSI1SK';
      values[':gsi1sk'] = body.startTime;
    }

    const result = await client.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: `EVENT#${eventId}` },
        UpdateExpression: `SET ${expressionParts.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
        ConditionExpression: 'attribute_exists(PK)',
      })
    );

    const { PK, SK, GSI1PK, GSI1SK, ...updated } = result.Attributes || {};
    return response(200, { success: true, data: updated });
  } catch (err: any) {
    if (err.name === 'ConditionalCheckFailedException') {
      return response(404, { success: false, error: 'Event not found' });
    }
    console.error('Update event error:', err);
    return response(500, { success: false, error: 'Failed to update event' });
  }
};

function response(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  };
}
