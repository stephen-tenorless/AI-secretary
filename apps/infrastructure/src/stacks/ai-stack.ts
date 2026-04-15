import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambdaEvents from 'aws-cdk-lib/aws-lambda-event-sources';
import * as events from 'aws-cdk-lib/aws-events';
import * as eventsTargets from 'aws-cdk-lib/aws-events-targets';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { Construct } from 'constructs';

interface AiStackProps extends cdk.StackProps {
  stage: string;
  mainTable: dynamodb.Table;
}

export class AiStack extends cdk.Stack {
  public readonly aiProcessingQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props: AiStackProps) {
    super(scope, id, props);

    // Dead Letter Queue
    const dlq = new sqs.Queue(this, 'AiDLQ', {
      queueName: `ai-secretary-ai-dlq-${props.stage}`,
      retentionPeriod: cdk.Duration.days(14),
    });

    // AI Processing Queue
    this.aiProcessingQueue = new sqs.Queue(this, 'AiProcessingQueue', {
      queueName: `ai-secretary-ai-queue-${props.stage}`,
      visibilityTimeout: cdk.Duration.seconds(120),
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: dlq,
      },
    });

    // Scheduled AI Analysis Lambda (runs every 30 minutes)
    const scheduledAnalysisFn = new lambdaNode.NodejsFunction(
      this,
      'ScheduledAnalysis',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        architecture: lambda.Architecture.ARM_64,
        entry: path.join(__dirname, '../lambdas/agent/scheduled-analysis.ts'),
        handler: 'handler',
        timeout: cdk.Duration.seconds(120),
        memorySize: 512,
        environment: {
          TABLE_NAME: props.mainTable.tableName,
          STAGE: props.stage,
        },
      }
    );

    props.mainTable.grantReadWriteData(scheduledAnalysisFn);
    scheduledAnalysisFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: ['*'],
      })
    );

    // EventBridge rule: every 30 min
    new events.Rule(this, 'AiAnalysisSchedule', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(30)),
      targets: [new eventsTargets.LambdaFunction(scheduledAnalysisFn)],
      enabled: props.stage === 'prod', // Only enabled in prod
    });

    // Daily Briefing Lambda
    const dailyBriefingFn = new lambdaNode.NodejsFunction(
      this,
      'DailyBriefing',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        architecture: lambda.Architecture.ARM_64,
        entry: path.join(__dirname, '../lambdas/agent/daily-briefing.ts'),
        handler: 'handler',
        timeout: cdk.Duration.seconds(120),
        memorySize: 512,
        environment: {
          TABLE_NAME: props.mainTable.tableName,
          STAGE: props.stage,
        },
      }
    );

    props.mainTable.grantReadWriteData(dailyBriefingFn);
    dailyBriefingFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: ['*'],
      })
    );

    // Daily at 7 AM UTC (adjust per user timezone in Lambda)
    new events.Rule(this, 'DailyBriefingSchedule', {
      schedule: events.Schedule.cron({ minute: '0', hour: '7' }),
      targets: [new eventsTargets.LambdaFunction(dailyBriefingFn)],
      enabled: props.stage === 'prod',
    });
  }
}
