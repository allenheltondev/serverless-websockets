# AWS Serverless WebSocket Quick Start

This SAM template will deploy a functional WebSocket to your AWS account. The socket has the ability for connections to subscribe to entity updates in order to receive push notifications. 

## WebSocket Series

This repo contains several branches and accompanying blog posts that walk you through how to build a WebSocket step by step. The `main` branch contains everything that has been currently released, but if you want to take a phased approach you can follow along below.

1. [Intro To WebSockets](https://www.readysetcloud.io/blog/allen.helton/intro-to-aws-websockets/) - [part-one branch](https://github.com/allenheltondev/serverless-websockets/tree/part-one)
2. [Implementing Auth](https://www.readysetcloud.io/blog/allen.helton/intro-to-aws-websockets-part-two/) - [part-two branch](https://github.com/allenheltondev/serverless-websockets/tree/part-two)
3. [Documenting with Async API Spec](https://www.readysetcloud.io/blog/allen.helton/intro-to-aws-websockets-part-three/) - [part-three branch](https://github.com/allenheltondev/serverless-websockets/tree/part-three)
4. [Adding User Notifications and Error Handling](https://www.readysetcloud.io/blog/allen.helton/intro-to-aws-websockets-part-four/) - [part-four branch](https://github.com/allenheltondev/serverless-websockets/tree/part-four)

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

These will be used by a WebSocket adapter in your user interface or testing tool to register a connection and subscribe for push notifications.

The architecture diagram below explains the processes going on for each endpoint, plus how the push notifications are sent out.

![Architecture Diagram](</images/Architecture Diagram - User Notifications.png>)

## Auth

When connecting to a WebSocket, auth is only required on the *$connect* route. This WebSocket is protected with a lambda authorizer that validates a JWT. To generate the JWT, you may use the AWS CLI (or use the console) and execute the `CreateTestJwt` lambda function. To get the token from the CLI, use the following command:

```
aws lambda invoke --function-name CreateTestJwt response.json
```

You can use the value from the `token` parameter in the output `response.json` file in one of two ways:

1. As a query string parameter on connect: *access_token* - **RECOMMENDED**
2. As a comma delimited value in the `Sec-WebSocket-Protocol` header: *websocket, {AUTH_TOKEN}*

If you do not provide the auth token in one of the two methods above, you will receive a `401` on connect and your request will be rejected.

## Testing

The easiest way to test your WebSocket connection is to use [Postman](https://www.postman.com). It supports [sending and receiving WebSocket](https://blog.postman.com/postman-supports-websocket-apis/) through it's application quickly and easily. You can find your WebSocket connection url as an output of the deployment script. 

## Triggering Events

If you want to trigger an `Entity Updated` or `Send User Push Notification` event, doing so is easy with the sample events provided in the *examples* folder. Once you connect to the WebSocket, you can send a push notification with the following commands:

### Entity Updated

*Once you have subscribed to an entity with `entityId` of **myEntityId**, you can use this command in the terminal to send the `Entity Updated` event*

```
aws events put-events --entries file://examples/entity-updated.json
```

### Send User Push Notification

*Once you have connected to the WebSocket with the jwt generated via the `CreateTestJwt` lambda, you can use this command in the terminal to send the `Send User Push Notification` event*

```
aws events put-events --entries file://examples/send-user-push-notification.json
```

## Custom Domain

To add a custom domain to your WebSocket, you must complete the following prerequisites first:

* [Purchase a domain name](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-register.html) on Route53
    * Verify ownership and make sure the domain is fully registered to you
* [Create a public hosted zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/CreatingHostedZone.html) for your domain name 
    * Note - This can be done [through CloudFormation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-route53-hostedzone.html), but I made this SAM template with the assumption that you already were using the domain for an API or user interface
* Update your `samconfig.toml` file to include the following parameters:
    * `DeployCustomDomain` - Set to `true` so the resources will deploy. This defaults to false if not provided and will not deploy any domain resources.
    * `DomainName` - This is the domain name you purchased plus the subdomain (if necessary. I used *ws.gopherholesunlimited.com*)
    * `HostedZoneId` - This is the id of the hosted zone from step 2.
        * If you added the hosted zone to the SAM template, you can replace all references to this with param with `!Ref <resource name of your hosted zone>`
        * If you already have the hosted zone, you can get the id with the AWS CLI command `aws route53 list-hosted-zones` and use the value from the `Id` property. 
            * **NOTE** - do not include `/hostedzone/` in the id. Only use the string after that    

## Resources

A diagram of all generated resources is in the `images` folder with the name `resource-diagram.png`.