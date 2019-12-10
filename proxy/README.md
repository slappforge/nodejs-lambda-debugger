<div style="text-align:center">
    <img src="https://s3.amazonaws.com/resources.sigma.slappforge.com/slappforge_logo_color.png" alt="SLAppForge" width="300"/>
</div>

# **SLAppForge Debugger for NodeJS - Lambda Proxy**

SLAppForge Debugger for NodeJS is a toolkit that can be utilized to perform step-through debugging for the **Lambda 
functions executing on live AWS environment**, using your own local IDE. 

This is the NPM package that contains the **Lambda Proxy** component of the toolkit. This should be added as a dependency 
to the lambda project. 

Once added it acts as a wrapper for the actual lambda code by reaching up into the parent and swap the specified lambda 
handler with its own handler before the lambda code is executed. Then the proxy code takes over and launches the actual 
handler in as a child process.

Then this Lambda Proxy acts as the intermediary that exchanges V8 protocol messages between the lambda process and the
remote broker server.

### Prerequisites

As a prerequisite for using this toolkit, you should obtain an access key pair from the SLAppForge Access Key Manager.
For that, please visit https://www.slappforge.com/java-debug and login with your 
[SLAppForge Sigma](https://sigma.slappforge.com/) account. If you don't have a Sigma account you can create one for free
from [here](https://sigma.slappforge.com/#/signup). Once logged in, you can generate an **Access Key** and an **Access 
Secret**.

## Using proxy within the Lambda function

After adding this proxy component as a dependency using one of the options, require the package at the very end of the 
file that contains the Lambda handler that you want to debug.

Also make sure to set a reasonable **Timeout** value for the Lambda function, so that you have enough time for debugging,
before the Lambda function runs out of time.

```
exports.handler = async (event) => {
    console.log(event);
    return 'Hello World!'; 
};

require('slappforge-lambda-debug-proxy');
```

## Configuring Lambda environment variables
   
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
|`SLAPP_DEBUG_BROKER_PORT` |:x: | This is the lambda facing port of the Broker server. Default value is `8181`


