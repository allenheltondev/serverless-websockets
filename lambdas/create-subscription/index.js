const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall } = require("@aws-sdk/util-dynamodb");
const { StatusCodes } = require('http-status-codes');
const ddb = new DynamoDBClient();

exports.UNHANDLED_ERROR_MESSAGE = 'Something went wrong';

exports.handler = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId;
    const input = JSON.parse(event.body);

    await exports.addSubscriptionToExistingConnection(connectionId, input.entityId);
    return {
      statusCode: StatusCodes.OK
    }
  } catch (err) {
    console.error(err);

    return {
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      body: JSON.stringify({ message: exports.UNHANDLED_ERROR_MESSAGE })
    };
  }
};

exports.addSubscriptionToExistingConnection = async (connectionId, entityId) => {
  const params = exports.buildPutItemCommandInput(connectionId, entityId);
  await ddb.send(new PutItemCommand(params));
};

exports.buildPutItemCommandInput = (connectionId, entityId) => {
  return {
    TableName: process.env.TABLE_NAME,
    Item: marshall({
      pk: `${connectionId}`,
      sk: `subscription#${entityId}`,
      GSI1PK: `${entityId}`,
      GSI1SK: 'subscription#',
      ttl: exports.calculateTtl(process.env.TTL_HOURS)
    })
  };
};

exports.calculateTtl = (hoursToLive) => {
  const hours = Number(hoursToLive);
  const date = new Date();
  date.setTime(date.getTime() + (hours * 60 * 60 * 1000));

  const epoch = Math.round(date.getTime() / 1000);
  return epoch;
};