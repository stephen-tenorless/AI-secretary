#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AuthStack } from './stacks/auth-stack';
import { DatabaseStack } from './stacks/database-stack';
import { ApiStack } from './stacks/api-stack';
import { AiStack } from './stacks/ai-stack';
import { NotificationStack } from './stacks/notification-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

const stage = app.node.tryGetContext('stage') || 'dev';

// Auth (Cognito)
const authStack = new AuthStack(app, `AiSecretary-Auth-${stage}`, {
  env,
  stage,
});

// Database (DynamoDB)
const databaseStack = new DatabaseStack(app, `AiSecretary-Database-${stage}`, {
  env,
  stage,
});

// AI (Bedrock permissions + SQS)
const aiStack = new AiStack(app, `AiSecretary-Ai-${stage}`, {
  env,
  stage,
  mainTable: databaseStack.mainTable,
});

// Notifications (SQS + SNS)
const notificationStack = new NotificationStack(
  app,
  `AiSecretary-Notifications-${stage}`,
  {
    env,
    stage,
    mainTable: databaseStack.mainTable,
  }
);

// API (API Gateway + Lambdas)
new ApiStack(app, `AiSecretary-Api-${stage}`, {
  env,
  stage,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
  mainTable: databaseStack.mainTable,
  aiQueue: aiStack.aiProcessingQueue,
  notificationQueue: notificationStack.notificationQueue,
});

app.synth();
