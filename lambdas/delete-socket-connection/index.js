const { DynamoDBClient, QueryCommand, TransactWriteItemsCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require("@aws-sdk/util-dynamodb");
const { StatusCodes } = require('http-status-codes');
const ddb = new DynamoDBClient();

exports.UNHANDLED_ERROR_MESSAGE = 'Something went wrong';

exports.handler = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId;

    await exports.deleteAllConnections(connectionId);

    return {
      statusCode: StatusCodes.NO_CONTENT
    };
  } catch (err) {
    console.error(err);

    return {
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      body: JSON.stringify({ message: exports.UNHANDLED_ERROR_MESSAGE })
    };
  }
};

exports.deleteAllConnections = async (connectionId) => {
  const params = exports.buildQueryCommand(connectionId);
  const response = await ddb.send(new QueryCommand(params));
  if (response?.Items?.length) {
    const transactionItems = response.Items.map((item) => {
      return exports.buildDeleteConnectionParams(item);
    });

    if (transactionItems?.length) {
      await exports.saveTransactionBatches(transactionItems);
    }
  }
};

exports.buildQueryCommand = (connectionId) => {
  return {
    TableName: process.env.TABLE_NAME,
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: marshall({
      ':pk': connectionId 
    })
  };
};

exports.buildDeleteConnectionParams = (item) => {
  const params = {
    Delete: {
      TableName: process.env.TABLE_NAME,
      Key: {
        pk: item.pk,
        sk: item.sk
      }
    }
  };

  return params;
};

exports.saveTransactionBatches = async (transactionItems) => {
  const transactionBatches = exports.getTransactionBatches(transactionItems);
  if (transactionBatches?.length) {
    await Promise.all(transactionBatches.map(async (batch) => {
      await ddb.send(new TransactWriteItemsCommand(batch));
    }));
  }
};

exports.getTransactionBatches = (transactionItems) => {
  const batchSize = 25;
  const batches = [];
  for (let i = 0; i < transactionItems.length; i = i + batchSize) {
    const batchParams = { TransactItems: transactionItems.slice(i, i + batchSize) };
    batches.push(batchParams);
  }

  return batches;
};