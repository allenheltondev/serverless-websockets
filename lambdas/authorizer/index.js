const jwt = require('jsonwebtoken');

const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const secrets = new SecretsManagerClient();
var signature;

exports.MISSING_WEBSOCKET_PROTOCOL_HEADER_MESSAGE = 'The "Sec-Websocket-Protocol" header is missing';
exports.INVALID_SUBPROTOCOL_MESSAGE = 'The subprotocol must be "websocket" in order to establish a connection';
exports.MISSING_AUTH_TOKEN_MESSAGE = 'An auth token must be provided as the second value in the "Sec-Websocket-Protocol" header';
exports.SIGNATURE_NOT_CONFIGURED = 'Unable to validate auth token because a signature is not configured';


exports.handler = async (event, context) => {
  try {
    const websocketProtocolHeader = exports.getWebsocketProtocolHeader(event.headers);
    if (!websocketProtocolHeader) {
      throw new Error(exports.MISSING_WEBSOCKET_PROTOCOL_HEADER_MESSAGE);
    }

    // Websockets are strict on the headers they allow, so in our solution we provide the auth token 
    // in the sec-websocket-protocol header comma separated with the subprotocol
    // Example: sec-websocket-protocol: websocket, eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9==
    // Alternatively, the user could pass the auth token in a "token" query string parameter
    let [protocol, authToken] = websocketProtocolHeader.split(',').map(section => section.trim());
    if (protocol?.toLowerCase() !== 'websocket') {
      throw new Error(exports.INVALID_SUBPROTOCOL_MESSAGE);
    }

    if (!authToken) {
      if (!event?.queryStringParameters?.token) {
        throw new Error(exports.MISSING_AUTH_TOKEN_MESSAGE);
      }

      authToken = event.queryStringParameters.token;
    }

    const jwtData = await exports.verifyJwt(authToken);
    const policy = exports.getPolicy(event.methodArn, jwtData);

    return policy;
  } catch (err) {
    console.error(err, err.stack);
    context.fail('Unauthorized');
    return null;
  }
};

exports.getPolicy = (methodArn, jwtData) => {
  return {
    principalId: jwtData.userId,
    ...methodArn && {
      policyDocument: {
        Version: '2012-10-17',
        Statement: [{
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: methodArn
        }]
      }
    },
    context: exports.generateRequestContext(jwtData)
  };
};

exports.generateRequestContext = (jwtData) => {
  return {
    userId: jwtData.userId,
    ...jwtData.firstName && { firstName: jwtData.firstName },
    ...jwtData.lastName && { lastName: jwtData.lastName },
    ...jwtData.sub && { sub: jwtData.sub }
  };
};

exports.verifyJwt = async (authToken) => {
  const signature = await exports.getJwtSignature();
  if (!signature) {
    throw new Error(exports.SIGNATURE_NOT_CONFIGURED);
  }

  const decodedJwt = await jwt.verify(authToken, signature);
  return decodedJwt?.data;
};

exports.getWebsocketProtocolHeader = (headers) => {
  const providedHeaderName = Object.keys(headers).find(h => h.toLowerCase() == 'sec-websocket-protocol');

  return headers[providedHeaderName];
};

exports.getJwtSignature = async () => {
  if (!signature) {
    const response = await secrets.send(new GetSecretValueCommand({ SecretId: process.env.JWT_SIGNATURE_SECRET }));
    if (response?.SecretString) {
      const secret = JSON.parse(response.SecretString);
      signature = secret.signature;
    }
  }

  return signature;
};