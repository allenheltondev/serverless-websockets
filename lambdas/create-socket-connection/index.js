const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall } = require("@aws-sdk/util-dynamodb");
const { StatusCodes } = require('http-status-codes');
const ddb = new DynamoDBClient();

exports.UNHANDLED_ERROR_MESSAGE = 'Something went wrong';

exports.handler = async (event) => {
  try {
    await exports.saveConnection(event.requestContext);

    const response = {
      statusCode: StatusCodes.OK,
      headers: {
        'Sec-WebSocket-Protocol': 'websocket'
      }
    };

    return response;
  } catch (err) {
    console.error(err);
    return {
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      body: JSON.stringify({ message: exports.UNHANDLED_ERROR_MESSAGE })
    };
  }
};

exports.saveConnection = async (requestContext) => {
  const params = exports.buildPutItemCommandInput(requestContext);
  await ddb.send(new PutItemCommand(params));
};

exports.buildPutItemCommandInput = (requestContext) => {
  return {
    TableName: process.env.TABLE_NAME,
    Item: marshall({
      pk: `${requestContext.connectionId}`,
      sk: 'connection#',
      ipAddress: requestContext.identity.sourceIp,
      connectedAt: requestContext.connectedAt,
      ttl: exports.calculateTtl(process.env.TTL_HOURS),
      ...requestContext.authorizer?.userId && {
        GSI1PK: requestContext.authorizer.userId,
        GSI1SK: 'user#'
      }
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