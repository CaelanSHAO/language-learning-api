import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';


export class LanguageLearningApiStack extends cdk.Stack {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 创建 DynamoDB 表
    const table = new dynamodb.Table(this, 'PhrasesTable', {
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'phraseId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: 'PhrasesTable'
    });

    this.table = table;

    // Lambda: POST /phrases
    const postPhraseFunction = new NodejsFunction(this, 'PostPhraseFunction', {
      entry: 'lambda/postPhrase.ts', // 入口文件路径
      handler: 'handler',            // 函数导出名
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        TABLE_NAME: table.tableName
      }
    });
    

    // 权限：允许 Lambda 访问 DynamoDB
    table.grantWriteData(postPhraseFunction);

    // API Gateway
    const api = new apigateway.RestApi(this, 'LanguageApi', {
      restApiName: 'Language Learning Service'
    });

    const phrases = api.root.addResource('phrases');
    phrases.addMethod('POST', new apigateway.LambdaIntegration(postPhraseFunction));

  }
}
