## Serverless REST Assignment - Distributed Systems.

__Name:__ Jiayi Shao

__Demo:__ ... link to your YouTube video demonstration ......

### Context.

State the context you chose for your web API and detail the attributes of the DynamoDB table items, e.g.

Context: Movie Language Learning Assistant

DynamoDB Table item attributes:
+ userId - string (Partition Key)
+ phraseId - string (Sort Key)
+ text - string
+ tag - string
+ difficulty - number
+ isLearned - boolean
+ translation - map<string, string>

### App API endpoints.

[ Provide a bullet-point list of the app's endpoints (excluding the Auth API) you have successfully implemented. ]
e.g.
 
+ POST /phrases - Add new phrase (protected by API Key)
+ PUT /phrases - Modify existing phrase information (protected by API Key)
+ GET /phrases/{userId} - Get all phrases for a user
+ GET /phrases/{userId}/{phraseId}/translation?language=fr - Translates the phrase into the specified language and caches the translation results


### Features.

#### Translation persistence (if completed)


When the user calls the Translation API, Lambda first queries DynamoDB to see if the translation cache is already there. If not, it calls Amazon Translate to do the translation and uses UpdateCommand to write the translation result into the translation.<language> field.

DynamoDB Table item attributes:
+ userId - string (Partition Key)
+ phraseId - string (Sort Key)
+ text - string
+ tag - string
+ difficulty - number
+ isLearned - boolean
+ translation - map<string, string>

#### Custom L2 Construct (if completed)

[State briefly the infrastructure provisioned by your custom L2 construct. Show the structure of its input props object and list the public properties it exposes, e.g. taken from the Cognito lab,

Construct Input props object:
~~~
type AuthApiProps = {
 userPoolId: string;
 userPoolClientId: string;
}
~~~
Construct public properties
~~~
export class MyConstruct extends Construct {
 public  PropertyName: type
 etc.
~~~
 ]

#### Multi-Stack app (if completed)

[Explain briefly the stack composition of your app - no code excerpts required.]

#### Lambda Layers (if completed)

[Explain briefly where you used the Layers feature of the AWS Lambda service - no code excerpts required.]


#### API Keys. (if completed)

[I use the addApiKey() and addUsagePlan() methods of the API Gateway to add API Key authentication to POST and PUT methods. ][]

~~~ts
// This is a code excerpt markdown 

    const apiKey = api.addApiKey('LanguageApiKey', {
      apiKeyName: 'LanguageLearningApiKey',
      description: 'API Key for protected write endpoints',
    });

  
    const usagePlan = api.addUsagePlan('UsagePlan', {
      name: 'BasicUsagePlan',
      throttle: {
        rateLimit: 5,
        burstLimit: 2
      }
    });
    usagePlan.addApiKey(apiKey);

    usagePlan.addApiStage({
      stage: api.deploymentStage,
      throttle: [
        {
          method: postMethod, // POST /phrases
          throttle: {
            rateLimit: 5,
            burstLimit: 2
          }
        },
        {
          method: putMethod, // PUT /phrases
          throttle: {
            rateLimit: 5,
            burstLimit: 2
          }
        }
      ]
    });


###  Extra (If relevant).

[ State any other aspects of your solution that use CDK/serverless features not covered in the lectures ]

I use NodejsFunction (built into esbuild) to automatically package TypeScript Lambda functions without having to compile them manually:

const postPhraseFunction = new NodejsFunction(this, 'PostPhraseFunction', {
      entry: 'lambda/postPhrase.ts', 
      handler: 'handler',            
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        TABLE_NAME: table.tableName
      }
    });

