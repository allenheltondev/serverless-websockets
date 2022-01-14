# AWS Serverless Websocket Quick Start

This SAM template will deploy a functional websocket to your AWS account. The socket has the ability for connections to subscribe to entity updates in order to receive push notifications. 

## Deployment Instructions

For initial deployment, you can use the following command from a terminal window that is in the root directory:
```
sam deploy --guided
```

This will walk you through deployment by providing you with prompts to answer. It will generate a samconfig.toml file.

After you walk through the guided setup, you can do subsequent deploys with the following commands

```
sam build --parallel --cached
sam deploy
```

For convenience, these commands have been added together as a single npm script, so all you need to run is 

```
npm run deploy
```

## How It Works

After deployment, you will have an API Gateway v2 resource with several endpoints registered:

* *$connect*
* *subscribe*
* *unsubscribe*
* *$disconnect*

These will be used by a websocket adapter in your user interface or testing tool to register a connection and subscribe for push notifications.

The architecture diagram below explains the processes going on for each endpoint, plus how the push notifications are sent out.

![Architecture Diagram](</images/Architecture Diagram.png>)

## Testing

The easiest way to test your websocket connection is to use [Postman](https://www.postman.com). It supports [sending and receiving websockets](https://blog.postman.com/postman-supports-websocket-apis/) through it's application quickly and easily. You can find your websocket connection url as an output of the deployment script. 

## Resources

A diagram of all generated resources is in the `images` folder with the name `resource-diagram.png`.