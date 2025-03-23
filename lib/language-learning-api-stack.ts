import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';


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
    const postMethod = phrases.addMethod('POST', new apigateway.LambdaIntegration(postPhraseFunction), {
      apiKeyRequired: true
    });    


    // 创建 API Key
    const apiKey = api.addApiKey('LanguageApiKey', {
      apiKeyName: 'LanguageLearningApiKey',
      description: 'API Key for protected write endpoints',
    });

    // 创建使用计划
    const usagePlan = api.addUsagePlan('UsagePlan', {
      name: 'BasicUsagePlan',
      throttle: {
        rateLimit: 5,
        burstLimit: 2
      }
    });
    usagePlan.addApiKey(apiKey);

    // ✅ 把 POST 方法绑定到 usage plan
    usagePlan.addApiStage({
      stage: api.deploymentStage,
      throttle: [
        {
          method: postMethod, // POST /phrases
          throttle: {
            rateLimit: 5,
            burstLimit: 2
          }
        }
      ]
    });



    // Lambda: GET /phrases/{userId}
    const getPhrasesFunction = new NodejsFunction(this, 'GetPhrasesFunction', {
      entry: 'lambda/getPhrases.ts', // 新的 handler 文件
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        TABLE_NAME: table.tableName
      }
    });

    // 权限：允许 Lambda 读取 DynamoDB
    table.grantReadData(getPhrasesFunction);

    // API Gateway: GET /phrases/{userId}
    const phraseWithUserId = phrases.addResource('{userId}');
    phraseWithUserId.addMethod('GET', new apigateway.LambdaIntegration(getPhrasesFunction));

    // Lambda: GET /phrases/{userId}/{phraseId}/translation
    const translateFunction = new NodejsFunction(this, 'TranslatePhraseFunction', {
      entry: 'lambda/translatePhrase.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        TABLE_NAME: table.tableName
      }
    });


    // 权限：读写 DynamoDB + 调用 Translate
    table.grantReadWriteData(translateFunction);
    translateFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['translate:TranslateText', 'comprehend:DetectDominantLanguage'],
      resources: ['*']
    }));

    // API 路由
    const phraseItem = phraseWithUserId.addResource('{phraseId}');
    const translation = phraseItem.addResource('translation');

    translation.addMethod('GET', new apigateway.LambdaIntegration(translateFunction));



  }
}
