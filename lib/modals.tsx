import AWS from "aws-sdk";

AWS.config.update({
  region: "us-east-1", 
  accessKeyId: process.env.EXPO_PUBLIC_AI,
  secretAccessKey: process.env.EXPO_PUBLIC_SAI,
      // Disable CRC32 validation to prevent integrity check errors
    dynamoDbCrc32: false,
});
//
export const dynamoDB = new AWS.DynamoDB.DocumentClient();
