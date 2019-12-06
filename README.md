
<div style="text-align:center">
    <img src="https://s3.amazonaws.com/resources.sigma.slappforge.com/slappforge_logo_color.png" alt="SLAppForge" width="300"/>
</div>

# **SLAppForge Debugger for NodeJS**

SLAppForge Debugger for NodeJS is a toolkit that can be utilized to perform step-through debugging for the **Lambda 
functions executing on live AWS environment**, using your own local IDE. 

## How it works?

This toolkit contains 3 components as below.

* Lambda Proxy
* Local Client
* Broker Server

#### Lambda Proxy

This is a NPM package that should be added as a dependency to the lambda project. Once added it acts as a wrapper for 
the actual lambda code by reaching up into the parent and swap the specified lambda handler with its own handler before 
the lambda code is executed. Then the proxy code takes over and launches the actual handler in as a child process.

Then this Lambda Proxy acts as the intermediary that exchanges V8 protocol messages between the lambda process and the
remote broker server.

#### Local Client

This is a NPM command line tool that should be installed as a global package in the developer machine. Once invoked with
the required parameters, it acts as the intermediary that exchanges V8 protocol messages between the IDE debugger and the
remote broker server.

#### Broker Server

This is basically a WebSocket based server running on a publicly accessible IP. Both Lambda Proxy and the Local Client
connect to this server and the server acts as the intermediary that exchanges V8 protocol messages between them.

In summary, Lambda Proxy, Broker Server and the Local Client connect together to create a WebSocket channel between the
Lambda running on AWS and the IDE debugger on your local machine.

## How to use?

### Prerequisites

As a prerequisite for using this toolkit, you should obtain an access key pair from the SLAppForge Access Key Manager.
For that, please visit https://www.slappforge.com/java-debug and login with your 
[SLAppForge Sigma](https://sigma.slappforge.com/) account. If you don't have a Sigma account you can create one for free
from [here](https://sigma.slappforge.com/#/signup). Once logged in, you can generate an **Access Key** and an **Access 
Secret**.

### Configuration

#### Adding Proxy to the Lambda function

To use this toolkit, the proxy component should be added to your NodeJS Lambda function. For that you have 2 alternatives.

**Option 1**

Add `slappforge-lambda-debug-proxy` as a NPM dependency to your Lambda function.
```
npm i slappforge-lambda-debug-proxy --save
```

**Option 2**

Add the Lambda Layer with the following ARN to your Lambda function.
```
    TODO
```

After adding the proxy component as a dependency using one of the options, require the package at the very end of the 
file that contains the Lambda handler that you want to debug. And also add a `debugger` line at the start of the handler
function, so that the execution will be suspended at that point until the debugger is connected.

```
exports.handler = async (event) => {
    debugger;

    // Your code comes after this
    console.log(event);
    return 'Hello World!'; 
};

require('slappforge-lambda-debug-proxy');
```

#### Configuring Lambda environment variables

Then the following environment variables must be set for the Lambda function with the appropriate values.

| Name | Required | Description  |
|------|:--------:| -------------|
|`SLP_DEBUGGER_ACTIVE` |:white_check_mark: | This is the flag that indicates whether the Lambda should be invoked in debug mode or not. Setting this to `true` will enable debugging.
|`SLAPP_KEY` |:white_check_mark: | This is the Access Key obtained from the access key manager
|`SLAPP_SECRET` |:white_check_mark: | This is the Access Secret obtained from the access key manager
|`SLAPP_SESSION` |:white_check_mark: | This is a unique ID to distinguish this Lambda function for debugger to connect. This can be any string value.

In addition to the above, following optional environment variables can be used to provide the Broker Server details.

| Name | Required | Description  |
|------|:--------:| -------------|
|`SLAPP_DEBUG_BROKER_HOST` |:x: | This is the host name or the IP address of the Broker server. Default value is `lambda-debug.slappforge.com`
|`SLAPP_DEBUG_BROKER_PORT` |:x: | This is the lambda facing port of the Broker server. Default value is `9239`

                                                           

This toolkit is developed based on the [Trek10 AWS Lambda Debugger](https://github.com/trek10inc/aws-lambda-debugger), 
Kudos to [Rob Ribeiro](https://github.com/azurelogic) and [Trek10](https://www.trek10.com/) for the awesome work :pray:.
