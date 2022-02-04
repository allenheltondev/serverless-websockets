const { DynamoDBClient, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { marshall } = require("@aws-sdk/util-dynamodb");
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
const ddb = new DynamoDBClient();
const apig = new ApiGatewayManagementApiClient({ endpoint: process.env.ENDPOINT });

exports.handler = async (event, context, callback) => {
  try {
    await Promise.all(event.Records.map(async (record) => {
      const recordBody = JSON.parse(record.body);

      await exports.sendPushNotificationToUser(recordBody.detail);
    }));
  } catch (err) {
    console.error(err);
    callback(err);
  }
};

exports.sendPushNotificationToUser = async (detail) => {
  const connections = await exports.getUserConnections(detail);
  if (!connections?.length)
    return;

  await Promise.all(connections.map(async (connection) => {
    const command = exports.buildPostToConnectionCommand(connection.pk.S, detail.message, detail.callback);
    await apig.send(command);
  }));
};

exports.getUserConnections = async (request) => {
  const command = exports.buildQueryCommand(request);
  const response = await ddb.send(command);
  if (response?.Items?.length) {
    return response.Items;
  }
};

exports.buildQueryCommand = (request) => {
  const params = {
    TableName: process.env.TABLE_NAME,
    IndexName: process.env.INDEX_NAME,
    KeyConditionExpression: '#GSI1PK = :GSI1PK and #GSI1SK = :GSI1SK',
    ExpressionAttributeNames: {
      '#GSI1PK': 'GSI1PK',
      '#GSI1SK': 'GSI1SK'
    },
    ExpressionAttributeValues: marshall({
      ':GSI1PK': request.userId,
      ':GSI1SK': 'user#'
    })
  };

  return new QueryCommand(params);
};

exports.buildPostToConnectionCommand = (connectionId, message, callback) => {
  const params = {
    ConnectionId: connectionId,
    Data: JSON.stringify({
      type: 'User Push Notification',
      ...message && { message },
      ...callback && { callback }
    })
  };

  return new PostToConnectionCommand(params);
};