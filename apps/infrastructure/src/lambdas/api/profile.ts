import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = event.requestContext.authorizer?.claims?.sub;
    const email = event.requestContext.authorizer?.claims?.email;
    if (!userId) return response(401, { error: 'Unauthorized' });

    if (event.httpMethod === 'GET') {
      const result = await client.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
        })
      );

      if (!result.Item) {
        // Create default profile
        const defaultProfile = {
          id: userId,
          email: email || '',
          name: event.requestContext.authorizer?.claims?.name || '',
          timezone: 'America/New_York',
          preferences: {
            wakeUpTime: '07:00',
            sleepTime: '22:00',
            workStartTime: '09:00',
            workEndTime: '17:00',
            preferredReminderLeadMinutes: 15,
            enableSmartGrouping: true,
            enableProactiveReminders: true,
            notificationChannels: ['push'],
          },
          integrations: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await client.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: {
              PK: `USER#${userId}`,
              SK: 'PROFILE',
              GSI1PK: `EMAIL#${email}`,
              GSI1SK: 'USER',
              ...defaultProfile,
            },
          })
        );

        return response(200, { success: true, data: defaultProfile });
      }

      const { PK, SK, GSI1PK, GSI1SK, ...profile } = result.Item;
      return response(200, { success: true, data: profile });
    }

    // PUT - Update profile
    const body = JSON.parse(event.body || '{}');
    const now = new Date().toISOString();

    const allowedFields = ['name', 'timezone', 'preferences'];
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

    const result = await client.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
        UpdateExpression: `SET ${expressionParts.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
      })
    );

    const { PK, SK, GSI1PK, GSI1SK, ...profile } = result.Attributes || {};
    return response(200, { success: true, data: profile });
  } catch (err) {
    console.error('Profile error:', err);
    return response(500, { success: false, error: 'Failed to handle profile' });
  }
};

function response(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  };
}
