import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { UpdateCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

export const handler = async (event: any) => {
  try {
    const body = JSON.parse(event.body);
    const { userId, phraseId, text, tag, difficulty, isLearned } = body;

    if (!userId || !phraseId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'userId and phraseId are required' })
      };
    }

    const updateExpressions: string[] = [];
    const expressionAttributeValues: any = {};
    const expressionAttributeNames: any = {};

    if (text !== undefined) {
      updateExpressions.push('#t = :text');
      expressionAttributeValues[':text'] = text;
      expressionAttributeNames['#t'] = 'text';
    }
    if (tag !== undefined) {
      updateExpressions.push('#g = :tag');
      expressionAttributeValues[':tag'] = tag;
      expressionAttributeNames['#g'] = 'tag';
    }
    if (difficulty !== undefined) {
      updateExpressions.push('#d = :difficulty');
      expressionAttributeValues[':difficulty'] = difficulty;
      expressionAttributeNames['#d'] = 'difficulty';
    }
    if (isLearned !== undefined) {
      updateExpressions.push('#l = :isLearned');
      expressionAttributeValues[':isLearned'] = isLearned;
      expressionAttributeNames['#l'] = 'isLearned';
    }

    if (updateExpressions.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'No fields to update' })
      };
    }

    await docClient.send(new UpdateCommand({
      TableName: process.env.TABLE_NAME,
      Key: { userId, phraseId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Phrase updated successfully' })
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};
