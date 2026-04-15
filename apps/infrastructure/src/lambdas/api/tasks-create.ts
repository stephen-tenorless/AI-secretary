import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = event.requestContext.authorizer?.claims?.sub;
    if (!userId) {
      return response(401, { error: 'Unauthorized' });
    }

    const body = JSON.parse(event.body || '{}');
    const taskId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    const task = {
      id: taskId,
      userId,
      title: body.title,
      description: body.description,
      category: body.category || 'personal',
      priority: body.priority || 'medium',
      status: 'pending',
      dueDate: body.dueDate,
      scheduledDate: body.scheduledDate,
      estimatedMinutes: body.estimatedMinutes,
      location: body.location,
      tags: body.tags || [],
      prerequisites: body.prerequisites || [],
      subtasks: body.subtasks || [],
      projectId: body.projectId,
      createdAt: now,
      updatedAt: now,
    };

    await client.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `USER#${userId}`,
          SK: `TASK#${taskId}`,
          GSI1PK: `USER#${userId}#TASK`,
          GSI1SK: `${task.status}#${task.dueDate || '9999-12-31'}`,
          ...task,
        },
      })
    );

    return response(201, { success: true, data: task });
  } catch (err) {
    console.error('Create task error:', err);
    return response(500, { success: false, error: 'Failed to create task' });
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
