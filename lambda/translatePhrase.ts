import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetCommand, UpdateCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const translateClient = new TranslateClient({});

export const handler = async (event: any) => {
  const userId = event.pathParameters?.userId;
  const phraseId = event.pathParameters?.phraseId;
  const targetLanguage = event.queryStringParameters?.language;

  if (!userId || !phraseId || !targetLanguage) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing userId, phraseId, or language param' })
    };
  }

  try {
    // 1. 查询 phrase
    const result = await docClient.send(new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: {
        userId,
        phraseId
      }
    }));

    const item = result.Item;

    if (!item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Phrase not found' })
      };
    }

    // 2. 检查缓存
    const existingTranslation = item.translation?.[targetLanguage];
    if (existingTranslation) {
      return {
        statusCode: 200,
        body: JSON.stringify({ translation: existingTranslation, cached: true })
      };
    }

    // 3. 翻译内容
    const command = new TranslateTextCommand({
      Text: item.text,
      SourceLanguageCode: 'auto',
      TargetLanguageCode: targetLanguage
    });

    const response = await translateClient.send(command);
    const translatedText = response.TranslatedText || '翻译失败';

    // 4. 写入缓存
    const updateExpr = `SET #translation.#lang = :translated`;
    await docClient.send(new UpdateCommand({
        TableName: process.env.TABLE_NAME,
        Key: { userId, phraseId },
        UpdateExpression: 'SET #translation.#lang = :translated',
        ExpressionAttributeNames: {
          '#translation': 'translation',
          '#lang': targetLanguage
        },
        ExpressionAttributeValues: {
          ':translated': translatedText
        }
      }));
      

    return {
      statusCode: 200,
      body: JSON.stringify({ translation: translatedText, cached: false })
    };

  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error during translation' })
    };
  }
};
