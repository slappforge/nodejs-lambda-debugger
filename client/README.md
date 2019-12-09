<div style="text-align:center">
    <img src="https://s3.amazonaws.com/resources.sigma.slappforge.com/slappforge_logo_color.png" alt="SLAppForge" width="300"/>
</div>

# **SLAppForge Debugger for NodeJS - Local Client**

SLAppForge Debugger for NodeJS is a toolkit that can be utilized to perform step-through debugging for the **Lambda 
functions executing on live AWS environment**, using your own local IDE. 

This is the NPM package that contains the **Local Client** component of the toolkit. This should be installed as a global 
package in the developer machine. Once invoked with the required parameters, it acts as the intermediary that exchanges 
V8 protocol messages between the IDE debugger and the remote broker server.

```
npm i slappforge-debug-client -g
```

### Prerequisites

As a prerequisite for using this toolkit, you should obtain an access key pair from the SLAppForge Access Key Manager.
For that, please visit https://www.slappforge.com/java-debug and login with your 
[SLAppForge Sigma](https://sigma.slappforge.com/) account. If you don't have a Sigma account you can create one for free
from [here](https://sigma.slappforge.com/#/signup). Once logged in, you can generate an **Access Key** and an **Access 
Secret**.

## Parameters

| Short Arg | Long Arg | Required | Description  |
|:---------:|---------|:----------:| -------------|
|`-f` | `--session` |:white_check_mark: | This is a unique ID set as the `SLAPP_SESSION` variable of the Lambda function
|`-k` |`--key` |:white_check_mark: | This is the Access Key obtained from the access key manager
|`-x` |`--secret` |:white_check_mark: | This is the Access Secret obtained from the access key manager
|`-s` |`--server` |:x: | This is the host name or the IP address of the Broker server. Default value is `lambda-debug.slappforge.com`
|`-p` |`--port` |:x: | This is the debugger facing port of the Broker server. Default value is `9239`
|`-v` |`--verbose` |:x: | Flag to enable verbose logging for the client
                                      
**Example**                   
```
slp-debug-client -f=MyFunction -k=abcd=efgh-1234-5678 -x=abc123def456ghi789
```

