import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: any) => {
  const userId = event.pathParameters?.userId;
  const tagFilter = event.queryStringParameters?.tag;

  if (!userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing userId in path' })
    };
  }

  try {
    const result = await docClient.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: {
        ':uid': userId
      }
    }));

    let items = result.Items || [];

    // 额外过滤 tag，如果提供了
    if (tagFilter) {
      items = items.filter(item => item.tag === tagFilter);
    }

    return {
      statusCode: 200,
      body: JSON.stringify(items)
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' })
    };
  }
};
