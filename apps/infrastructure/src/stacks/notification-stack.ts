import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambdaEvents from 'aws-cdk-lib/aws-lambda-event-sources';
import * as events from 'aws-cdk-lib/aws-events';
import * as eventsTargets from 'aws-cdk-lib/aws-events-targets';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as path from 'path';
import { Construct } from 'constructs';

interface NotificationStackProps extends cdk.StackProps {
  stage: string;
  mainTable: dynamodb.Table;
}

export class NotificationStack extends cdk.Stack {
  public readonly notificationQueue: sqs.Queue;
  public readonly notificationTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: NotificationStackProps) {
    super(scope, id, props);

    // Dead Letter Queue
    const dlq = new sqs.Queue(this, 'NotificationDLQ', {
      queueName: `ai-secretary-notif-dlq-${props.stage}`,
      retentionPeriod: cdk.Duration.days(14),
    });

    // Notification Queue
    this.notificationQueue = new sqs.Queue(this, 'NotificationQueue', {
      queueName: `ai-secretary-notif-queue-${props.stage}`,
      visibilityTimeout: cdk.Duration.seconds(60),
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: dlq,
      },
    });

    // SNS Topic for broadcast notifications
    this.notificationTopic = new sns.Topic(this, 'NotificationTopic', {
      topicName: `ai-secretary-notifications-${props.stage}`,
    });

    // Notification Processor Lambda (processes the queue)
    const processorFn = new lambdaNode.NodejsFunction(this, 'NotifProcessor', {
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      entry: path.join(
        __dirname,
        '../lambdas/notifications/process-queue.ts'
      ),
      handler: 'handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        TABLE_NAME: props.mainTable.tableName,
        STAGE: props.stage,
      },
    });

    props.mainTable.grantReadWriteData(processorFn);

    // Process messages from the notification queue
    processorFn.addEventSource(
      new lambdaEvents.SqsEventSource(this.notificationQueue, {
        batchSize: 10,
        maxBatchingWindow: cdk.Duration.seconds(5),
      })
    );

    // Reminder Checker Lambda (runs every 5 minutes)
    const reminderCheckerFn = new lambdaNode.NodejsFunction(
      this,
      'ReminderChecker',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        architecture: lambda.Architecture.ARM_64,
        entry: path.join(
          __dirname,
          '../lambdas/notifications/reminder-checker.ts'
        ),
        handler: 'handler',
        timeout: cdk.Duration.seconds(30),
        memorySize: 256,
        environment: {
          TABLE_NAME: props.mainTable.tableName,
          NOTIFICATION_QUEUE_URL: this.notificationQueue.queueUrl,
          STAGE: props.stage,
        },
      }
    );

    props.mainTable.grantReadData(reminderCheckerFn);
    this.notificationQueue.grantSendMessages(reminderCheckerFn);

    // Every 5 minutes
    new events.Rule(this, 'ReminderCheckSchedule', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
      targets: [new eventsTargets.LambdaFunction(reminderCheckerFn)],
      enabled: props.stage === 'prod',
    });
  }
}
