const { DynamoDBClient, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { marshall } = require("@aws-sdk/util-dynamodb");
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
const ddb = new DynamoDBClient();
const apig = new ApiGatewayManagementApiClient({ endpoint: process.env.ENDPOINT });

exports.handler = async (event) => {
  try {
    await Promise.all(event.Records.map(async (record) => {
      const recordBody = JSON.parse(record.body);

      await exports.postMessageToSubscribedConnections(recordBody.detail);
    }));
  } catch (err) {
    console.error(err);
  }
};

exports.postMessageToSubscribedConnections = async (detail) => {
  const connections = await exports.getSubscribedConnections(detail);
  if (!connections?.length)
    return;

  const data = {
    type: 'Entity Updated',
    entityId: detail.entityId,
    ...detail.message && { 'message': detail.message }
  };

  await Promise.all(connections.map(async (connection) => {
    const params = {
      ConnectionId: connection.pk.S,
      Data: JSON.stringify(data)
    };
    await apig.send(new PostToConnectionCommand(params));
  }));
};

exports.getSubscribedConnections = async (request) => {
  const params = exports.buildQueryCommandInput(request);
  const response = await ddb.send(new QueryCommand(params));
  if (response?.Items?.length) {
    return response.Items;
  }
};

exports.buildQueryCommandInput = (request) => {
  return {
    TableName: process.env.TABLE_NAME,
    IndexName: process.env.INDEX_NAME,
    KeyConditionExpression: '#GSI1PK = :GSI1PK and #GSI1SK = :GSI1SK',
    ExpressionAttributeNames: {
      '#GSI1PK': 'GSI1PK',
      '#GSI1SK': 'GSI1SK'
    },
    ExpressionAttributeValues: marshall({
      ':GSI1PK': request.entityId,
      ':GSI1SK': 'subscription#'
    })
  };
};