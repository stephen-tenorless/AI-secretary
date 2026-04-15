import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { Construct } from 'constructs';

interface ApiStackProps extends cdk.StackProps {
  stage: string;
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  mainTable: dynamodb.Table;
  aiQueue: sqs.Queue;
  notificationQueue: sqs.Queue;
}

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // REST API
    const api = new apigateway.RestApi(this, 'Api', {
      restApiName: `ai-secretary-api-${props.stage}`,
      description: 'AI Secretary REST API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
        ],
      },
    });

    // Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      'CognitoAuthorizer',
      {
        cognitoUserPools: [props.userPool],
        identitySource: 'method.request.header.Authorization',
      }
    );

    const authOptions: apigateway.MethodOptions = {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    };

    // Shared Lambda environment
    const lambdaEnv = {
      TABLE_NAME: props.mainTable.tableName,
      STAGE: props.stage,
      AI_QUEUE_URL: props.aiQueue.queueUrl,
      NOTIFICATION_QUEUE_URL: props.notificationQueue.queueUrl,
    };

    const lambdaDefaults: lambdaNode.NodejsFunctionProps = {
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: lambdaEnv,
      bundling: {
        minify: true,
        sourceMap: true,
      },
    };

    // --- Task Handlers ---

    const tasksResource = api.root.addResource('tasks');
    const taskByIdResource = tasksResource.addResource('{id}');

    const createTaskFn = this.createHandler('CreateTask', 'api/tasks-create.handler', lambdaDefaults, props);
    tasksResource.addMethod('POST', new apigateway.LambdaIntegration(createTaskFn), authOptions);

    const listTasksFn = this.createHandler('ListTasks', 'api/tasks-list.handler', lambdaDefaults, props);
    tasksResource.addMethod('GET', new apigateway.LambdaIntegration(listTasksFn), authOptions);

    const getTaskFn = this.createHandler('GetTask', 'api/tasks-get.handler', lambdaDefaults, props);
    taskByIdResource.addMethod('GET', new apigateway.LambdaIntegration(getTaskFn), authOptions);

    const updateTaskFn = this.createHandler('UpdateTask', 'api/tasks-update.handler', lambdaDefaults, props);
    taskByIdResource.addMethod('PUT', new apigateway.LambdaIntegration(updateTaskFn), authOptions);

    const deleteTaskFn = this.createHandler('DeleteTask', 'api/tasks-delete.handler', lambdaDefaults, props);
    taskByIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(deleteTaskFn), authOptions);

    // --- Events Handlers ---

    const eventsResource = api.root.addResource('events');
    const eventByIdResource = eventsResource.addResource('{id}');

    const createEventFn = this.createHandler('CreateEvent', 'api/events-create.handler', lambdaDefaults, props);
    eventsResource.addMethod('POST', new apigateway.LambdaIntegration(createEventFn), authOptions);

    const listEventsFn = this.createHandler('ListEvents', 'api/events-list.handler', lambdaDefaults, props);
    eventsResource.addMethod('GET', new apigateway.LambdaIntegration(listEventsFn), authOptions);

    const updateEventFn = this.createHandler('UpdateEvent', 'api/events-update.handler', lambdaDefaults, props);
    eventByIdResource.addMethod('PUT', new apigateway.LambdaIntegration(updateEventFn), authOptions);

    const deleteEventFn = this.createHandler('DeleteEvent', 'api/events-delete.handler', lambdaDefaults, props);
    eventByIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(deleteEventFn), authOptions);

    // --- AI Handlers ---

    const aiResource = api.root.addResource('ai');
    const chatResource = aiResource.addResource('chat');
    const analyzeResource = aiResource.addResource('analyze');
    const suggestGroupsResource = aiResource.addResource('suggest-groups');

    const aiChatFn = this.createHandler('AiChat', 'agent/ai-chat.handler', {
      ...lambdaDefaults,
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
    }, props);
    // Grant Bedrock access
    aiChatFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
      resources: ['*'],
    }));
    chatResource.addMethod('POST', new apigateway.LambdaIntegration(aiChatFn), authOptions);

    const aiAnalyzeFn = this.createHandler('AiAnalyze', 'agent/ai-analyze.handler', {
      ...lambdaDefaults,
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
    }, props);
    aiAnalyzeFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel'],
      resources: ['*'],
    }));
    analyzeResource.addMethod('POST', new apigateway.LambdaIntegration(aiAnalyzeFn), authOptions);

    const aiSuggestGroupsFn = this.createHandler('AiSuggestGroups', 'agent/ai-suggest-groups.handler', {
      ...lambdaDefaults,
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
    }, props);
    aiSuggestGroupsFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel'],
      resources: ['*'],
    }));
    suggestGroupsResource.addMethod('POST', new apigateway.LambdaIntegration(aiSuggestGroupsFn), authOptions);

    // --- Profile ---

    const profileResource = api.root.addResource('profile');
    const profileFn = this.createHandler('Profile', 'api/profile.handler', lambdaDefaults, props);
    profileResource.addMethod('GET', new apigateway.LambdaIntegration(profileFn), authOptions);
    profileResource.addMethod('PUT', new apigateway.LambdaIntegration(profileFn), authOptions);

    // --- Notifications ---

    const notificationsResource = api.root.addResource('notifications');
    const registerResource = notificationsResource.addResource('register');
    const notifFn = this.createHandler('Notifications', 'notifications/register.handler', lambdaDefaults, props);
    registerResource.addMethod('POST', new apigateway.LambdaIntegration(notifFn), authOptions);

    // Output
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      exportName: `${props.stage}-ApiUrl`,
    });
  }

  private createHandler(
    name: string,
    handlerPath: string,
    defaults: lambdaNode.NodejsFunctionProps,
    props: ApiStackProps
  ): lambdaNode.NodejsFunction {
    const fn = new lambdaNode.NodejsFunction(this, name, {
      ...defaults,
      entry: path.join(__dirname, '../lambdas', handlerPath.replace('.handler', '.ts')),
      handler: 'handler',
    });

    // Grant DynamoDB access
    props.mainTable.grantReadWriteData(fn);

    // Grant SQS access
    props.aiQueue.grantSendMessages(fn);
    props.notificationQueue.grantSendMessages(fn);

    return fn;
  }
}
