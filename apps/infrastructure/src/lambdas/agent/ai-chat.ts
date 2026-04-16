import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import {
  BedrockRuntimeClient,
  ConverseCommand,
  Tool,
} from '@aws-sdk/client-bedrock-runtime';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const bedrock = new BedrockRuntimeClient({});
const TABLE_NAME = process.env.TABLE_NAME!;
const MODEL_ID = 'anthropic.claude-sonnet-4-20250514';

// Tool definitions for Claude to manage the user's life
const TOOLS: Tool[] = [
  {
    toolSpec: {
      name: 'create_task',
      description:
        'Create a new task for the user. Use this when the user mentions something they need to do.',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Short task title' },
            description: { type: 'string', description: 'Detailed description' },
            category: {
              type: 'string',
              enum: ['home', 'work', 'personal', 'health', 'errands', 'finance'],
            },
            priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low'] },
            dueDate: { type: 'string', description: 'ISO 8601 date when task is due' },
            location: { type: 'string', description: 'Where the task takes place' },
            estimatedMinutes: { type: 'number', description: 'Estimated time in minutes' },
            prerequisites: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['time_before', 'task_dependency', 'condition'] },
                  description: { type: 'string' },
                  hoursBeforeTask: { type: 'number' },
                },
              },
              description:
                'Things that must happen before this task. E.g., fasting before blood work.',
            },
          },
          required: ['title', 'category', 'priority'],
        },
      },
    },
  },
  {
    toolSpec: {
      name: 'create_event',
      description:
        'Create a calendar event. Use when the user mentions an appointment, meeting, or scheduled activity.',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            startTime: { type: 'string', description: 'ISO 8601 datetime' },
            endTime: { type: 'string', description: 'ISO 8601 datetime' },
            location: { type: 'string' },
            isAllDay: { type: 'boolean' },
          },
          required: ['title', 'startTime', 'endTime'],
        },
      },
    },
  },
  {
    toolSpec: {
      name: 'set_smart_reminder',
      description:
        'Set a context-aware reminder. Use this to proactively remind the user about prerequisites. For example, if they have blood work requiring fasting, set a reminder at dinner time the night before to stop eating.',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            body: {
              type: 'string',
              description:
                'The reminder message with context about WHY they need to be reminded',
            },
            triggerTime: {
              type: 'string',
              description:
                'ISO 8601 datetime when to send the reminder. Think carefully about the best time.',
            },
            contextReasoning: {
              type: 'string',
              description:
                'Explain your reasoning for choosing this reminder time',
            },
            relatedTaskId: { type: 'string' },
            relatedEventId: { type: 'string' },
          },
          required: ['title', 'body', 'triggerTime', 'contextReasoning'],
        },
      },
    },
  },
  {
    toolSpec: {
      name: 'search_tasks',
      description: "Search the user's existing tasks by keyword or category",
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
          },
        },
      },
    },
  },
  {
    toolSpec: {
      name: 'get_schedule',
      description: "Get the user's schedule for a date range",
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            startDate: { type: 'string', description: 'YYYY-MM-DD' },
            endDate: { type: 'string', description: 'YYYY-MM-DD' },
          },
          required: ['startDate'],
        },
      },
    },
  },
  {
    toolSpec: {
      name: 'suggest_task_group',
      description:
        'Suggest grouping tasks that can be done together (same location, same errand run, etc.)',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Group name, e.g., "Home Depot Run"' },
            taskIds: { type: 'array', items: { type: 'string' } },
            reasoning: {
              type: 'string',
              description: 'Why these tasks should be grouped',
            },
            suggestedDate: { type: 'string' },
            suggestedRoute: {
              type: 'string',
              description: 'Suggested order of stops, e.g., "Home Depot → CVS → Grocery Store"',
            },
            estimatedTotalMinutes: { type: 'number' },
          },
          required: ['name', 'taskIds', 'reasoning', 'estimatedTotalMinutes'],
        },
      },
    },
  },
];

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = event.requestContext.authorizer?.claims?.sub;
    if (!userId) return resp(401, { error: 'Unauthorized' });

    const body = JSON.parse(event.body || '{}');
    const userMessage = body.message;
    if (!userMessage) return resp(400, { error: 'Message required' });

    // Fetch user context
    const [tasksResult, eventsResult, profileResult] = await Promise.all([
      dynamo.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: {
            ':pk': `USER#${userId}`,
            ':prefix': 'TASK#',
          },
        })
      ),
      dynamo.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK >= :today',
          ExpressionAttributeValues: {
            ':pk': `USER#${userId}#EVENT`,
            ':today': new Date().toISOString().split('T')[0],
          },
        })
      ),
      dynamo.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'PK = :pk AND SK = :sk',
          ExpressionAttributeValues: {
            ':pk': `USER#${userId}`,
            ':sk': 'PROFILE',
          },
        })
      ),
    ]);

    const tasks = (tasksResult.Items || []).filter(
      (t: any) => t.status !== 'completed' && t.status !== 'cancelled'
    );
    const events_data = eventsResult.Items || [];
    const profile = profileResult.Items?.[0];

    const systemPrompt = buildSystemPrompt(profile, tasks, events_data);

    // Call Claude with tool use
    const messages: any[] = [{ role: 'user', content: [{ text: userMessage }] }];

    const actions: any[] = [];
    let finalResponse = '';
    let continueLoop = true;

    while (continueLoop) {
      const bedrockResponse = await bedrock.send(
        new ConverseCommand({
          modelId: MODEL_ID,
          system: [{ text: systemPrompt }],
          messages,
          toolConfig: { tools: TOOLS },
        })
      );

      const outputMessage = bedrockResponse.output?.message;
      if (!outputMessage) break;

      messages.push(outputMessage);

      const stopReason = bedrockResponse.stopReason;

      if (stopReason === 'tool_use') {
        const toolResults: any[] = [];

        for (const block of outputMessage.content || []) {
          if (block.toolUse) {
            const toolName = block.toolUse.name;
            const toolInput = block.toolUse.input as any;
            const toolUseId = block.toolUse.toolUseId;

            const result = await executeToolCall(
              toolName!,
              toolInput,
              userId,
              dynamo
            );
            actions.push({
              type: toolName,
              description: getActionDescription(toolName!, toolInput),
              payload: toolInput,
              executed: true,
            });

            toolResults.push({
              toolResult: {
                toolUseId,
                content: [{ json: result }],
              },
            });
          }
        }

        messages.push({ role: 'user', content: toolResults });
      } else {
        // End turn - extract text response
        for (const block of outputMessage.content || []) {
          if (block.text) {
            finalResponse += block.text;
          }
        }
        continueLoop = false;
      }
    }

    const reply = {
      id: `${Date.now()}`,
      role: 'assistant' as const,
      content: finalResponse,
      timestamp: new Date().toISOString(),
      actions: actions.length > 0 ? actions : undefined,
    };

    return resp(200, { success: true, data: { reply, actions } });
  } catch (err) {
    console.error('AI Chat error:', err);
    return resp(500, { success: false, error: 'AI processing failed' });
  }
};

function buildSystemPrompt(
  profile: any,
  tasks: any[],
  events: any[]
): string {
  const now = new Date();
  const timezone = profile?.timezone || 'America/New_York';

  return `You are an AI Secretary - a highly capable, proactive personal assistant.
Your job is to help the user manage their busy life across home fixer-upper projects, work, personal tasks, health appointments, and errands.

## Key Capabilities
1. **Context-Aware Reminders**: When creating events/tasks with prerequisites (like fasting before blood work), ALWAYS create smart reminders at the RIGHT time. Don't just remind 15 min before - think about when the user actually needs to act. For fasting, remind at dinner time the night before.
2. **Smart Task Grouping**: Look for tasks that can be done together - same store, same area, same errand run. Proactively suggest groups.
3. **Schedule Awareness**: Know what's coming up and flag conflicts or tight schedules.
4. **Proactive Suggestions**: Don't just answer - anticipate needs and offer suggestions.

## User Context
- Current time: ${now.toISOString()}
- Timezone: ${timezone}
- Name: ${profile?.name || 'User'}

## Current Pending Tasks (${tasks.length}):
${tasks
  .slice(0, 20)
  .map(
    (t: any) =>
      `- [${t.priority}] ${t.title} (${t.category})${t.location ? ` @ ${t.location}` : ''}${t.dueDate ? ` due: ${t.dueDate}` : ''}`
  )
  .join('\n')}

## Upcoming Events (${events.length}):
${events
  .slice(0, 10)
  .map(
    (e: any) =>
      `- ${e.title} at ${e.startTime}${e.location ? ` @ ${e.location}` : ''}`
  )
  .join('\n')}

## Instructions
- Be conversational but efficient. The user is busy.
- Use tools to take action, don't just suggest - DO things.
- When creating tasks with prerequisites (like medical appointments needing fasting), ALWAYS set up smart reminders automatically.
- Look for opportunities to group tasks by location/store.
- If you notice potential schedule conflicts, flag them immediately.
- Prioritize urgent/time-sensitive items.`;
}

async function executeToolCall(
  toolName: string,
  input: any,
  userId: string,
  dynamo: DynamoDBDocumentClient
): Promise<any> {
  const now = new Date().toISOString();
  const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  switch (toolName) {
    case 'create_task': {
      const task = {
        id,
        userId,
        ...input,
        status: 'pending',
        tags: [],
        subtasks: [],
        prerequisites: input.prerequisites || [],
        createdAt: now,
        updatedAt: now,
      };

      await dynamo.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: `USER#${userId}`,
            SK: `TASK#${id}`,
            GSI1PK: `USER#${userId}#TASK`,
            GSI1SK: `pending#${input.dueDate || '9999-12-31'}`,
            ...task,
          },
        })
      );
      return { success: true, taskId: id, message: `Task "${input.title}" created` };
    }

    case 'create_event': {
      const evt = {
        id,
        userId,
        ...input,
        source: 'ai_suggested',
        reminders: [],
        createdAt: now,
        updatedAt: now,
      };

      await dynamo.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: `USER#${userId}`,
            SK: `EVENT#${id}`,
            GSI1PK: `USER#${userId}#EVENT`,
            GSI1SK: input.startTime,
            ...evt,
          },
        })
      );
      return { success: true, eventId: id, message: `Event "${input.title}" created` };
    }

    case 'set_smart_reminder': {
      const triggerDate = new Date(input.triggerTime);
      const dateStr = triggerDate.toISOString().split('T')[0];
      const timeStr = triggerDate.toISOString().split('T')[1].substring(0, 5);

      await dynamo.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: `USER#${userId}`,
            SK: `REMINDER#${id}`,
            GSI2PK: `SCHEDULE#${dateStr}`,
            GSI2SK: `${timeStr}#${userId}`,
            id,
            userId,
            title: input.title,
            body: input.body,
            triggerTime: input.triggerTime,
            contextReasoning: input.contextReasoning,
            relatedTaskId: input.relatedTaskId,
            relatedEventId: input.relatedEventId,
            delivered: false,
            acknowledged: false,
            createdAt: now,
          },
        })
      );
      return {
        success: true,
        reminderId: id,
        message: `Reminder set for ${input.triggerTime}: "${input.title}"`,
      };
    }

    case 'search_tasks': {
      const result = await dynamo.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: {
            ':pk': `USER#${userId}`,
            ':prefix': 'TASK#',
          },
        })
      );

      let tasks = (result.Items || []).filter(
        (t: any) => t.status !== 'cancelled'
      );
      if (input.category) tasks = tasks.filter((t: any) => t.category === input.category);
      if (input.status) tasks = tasks.filter((t: any) => t.status === input.status);

      return {
        tasks: tasks.map((t: any) => ({
          id: t.id,
          title: t.title,
          category: t.category,
          priority: t.priority,
          status: t.status,
          dueDate: t.dueDate,
          location: t.location,
        })),
      };
    }

    case 'get_schedule': {
      const result = await dynamo.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK >= :start',
          ExpressionAttributeValues: {
            ':pk': `USER#${userId}#EVENT`,
            ':start': input.startDate,
          },
        })
      );

      let events = result.Items || [];
      if (input.endDate) {
        events = events.filter(
          (e: any) => e.startTime <= input.endDate + 'T23:59:59Z'
        );
      }

      return {
        events: events.map((e: any) => ({
          id: e.id,
          title: e.title,
          startTime: e.startTime,
          endTime: e.endTime,
          location: e.location,
        })),
      };
    }

    case 'suggest_task_group': {
      await dynamo.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: `USER#${userId}`,
            SK: `GROUP#${id}`,
            GSI1PK: `USER#${userId}#GROUP`,
            GSI1SK: input.suggestedDate || now,
            id,
            userId,
            name: input.name,
            taskIds: input.taskIds,
            reason: input.reasoning,
            suggestedDate: input.suggestedDate,
            suggestedRoute: input.suggestedRoute,
            estimatedTotalMinutes: input.estimatedTotalMinutes,
            accepted: false,
            createdAt: now,
          },
        })
      );
      return {
        success: true,
        groupId: id,
        message: `Task group "${input.name}" suggested`,
      };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

function getActionDescription(toolName: string, input: any): string {
  switch (toolName) {
    case 'create_task':
      return `Created task: "${input.title}"`;
    case 'create_event':
      return `Created event: "${input.title}"`;
    case 'set_smart_reminder':
      return `Set reminder: "${input.title}" for ${input.triggerTime}`;
    case 'suggest_task_group':
      return `Suggested grouping: "${input.name}"`;
    case 'search_tasks':
      return 'Searched your tasks';
    case 'get_schedule':
      return 'Checked your schedule';
    default:
      return `Performed: ${toolName}`;
  }
}

function resp(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}
