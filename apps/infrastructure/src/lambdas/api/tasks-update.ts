import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

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

    const body = JSON.parse(event.body || '{}');
    const now = new Date().toISOString();

    // Build update expression dynamically
    const allowedFields = [
      'title', 'description', 'category', 'priority', 'status',
      'dueDate', 'scheduledDate', 'estimatedMinutes', 'location',
      'tags', 'prerequisites', 'subtasks', 'projectId', 'completedAt',
    ];

    const expressionParts: string[] = ['#updatedAt = :updatedAt'];
    const names: Record<string, string> = { '#updatedAt': 'updatedAt' };
    const values: Record<string, any> = { ':updatedAt': now };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        const attrName = `#${field}`;
        const attrValue = `:${field}`;
        expressionParts.push(`${attrName} = ${attrValue}`);
        names[attrName] = field;
        values[attrValue] = body[field];
      }
    }

    // Update GSI1SK if status or dueDate changed
    if (body.status || body.dueDate) {
      expressionParts.push('#gsi1sk = :gsi1sk');
      names['#gsi1sk'] = 'GSI1SK';
      values[':gsi1sk'] = `${body.status || 'pending'}#${body.dueDate || '9999-12-31'}`;
    }

    const result = await client.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: `TASK#${taskId}` },
        UpdateExpression: `SET ${expressionParts.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
        ConditionExpression: 'attribute_exists(PK)',
      })
    );

    const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...task } =
      result.Attributes || {};
    return response(200, { success: true, data: task });
  } catch (err: any) {
    if (err.name === 'ConditionalCheckFailedException') {
      return response(404, { success: false, error: 'Task not found' });
    }
    console.error('Update task error:', err);
    return response(500, { success: false, error: 'Failed to update task' });
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
