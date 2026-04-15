import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

interface DatabaseStackProps extends cdk.StackProps {
  stage: string;
}

export class DatabaseStack extends cdk.Stack {
  public readonly mainTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // Single-table design for all entities
    this.mainTable = new dynamodb.Table(this, 'MainTable', {
      tableName: `ai-secretary-main-${props.stage}`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      timeToLiveAttribute: 'TTL',
      removalPolicy: props.stage === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    // GSI1: Secondary access patterns
    // Tasks by status+date, Events by date, Projects by status
    this.mainTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI2: Scheduled lookups (reminders, cron jobs)
    // PK: SCHEDULE#YYYY-MM-DD, SK: HH:mm#userId
    this.mainTable.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: { name: 'GSI2PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI2SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Output
    new cdk.CfnOutput(this, 'MainTableName', {
      value: this.mainTable.tableName,
      exportName: `${props.stage}-MainTableName`,
    });

    new cdk.CfnOutput(this, 'MainTableArn', {
      value: this.mainTable.tableArn,
      exportName: `${props.stage}-MainTableArn`,
    });
  }
}
