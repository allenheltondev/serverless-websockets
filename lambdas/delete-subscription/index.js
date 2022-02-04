const { DynamoDBClient, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');
const { StatusCodes } = require('http-status-codes');
const { marshall } = require("@aws-sdk/util-dynamodb");
const ddb = new DynamoDBClient();

exports.UNHANDLED_ERROR_MESSAGE = 'Something went wrong';

exports.handler = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId;
    const input = JSON.parse(event.body);

    await exports.deleteSubscription(connectionId, input.entityId);

    return {
      statusCode: StatusCodes.NO_CONTENT
    }
  } catch (err) {
    console.error(err);

    return {
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      body: JSON.stringify({ message: exports.UNHANDLED_ERROR_MESSAGE })
    };
  }
};

exports.deleteSubscription = async (connectionId, entityId) => {
  const command = exports.buildDeleteItemCommand(connectionId, entityId);
  await ddb.send(command);
};


exports.buildDeleteItemCommand = (connectionId, entityId) => {
  const params = {
    TableName: process.env.TABLE_NAME,
    Key: marshall({
      pk: connectionId,
      sk: `subscription#${entityId}`
    })
  };
  
  return new DeleteItemCommand(params);
};