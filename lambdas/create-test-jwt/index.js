const jwt = require('jsonwebtoken');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const secrets = new SecretsManagerClient();
var signature;

exports.handler = async (event) => {
  try {
    const tokenData = {
      exp: Math.floor(Date.now() / 1000) + (60 * 60),
      data: {
        userId: event.userId ?? 'myuserid',
        firstName: event.firstName ?? 'Test',
        lastName: event.lastName ?? 'User',
        sub: event.sub ?? 'examplesub'
      }
    }

    const signature = await exports.getJwtSignature();
    const token = jwt.sign(tokenData, signature);

    return { authToken: token };

  } catch (err) {
    console.error(err, err.stack);
  }
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