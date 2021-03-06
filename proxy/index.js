const cp = require('child_process');
const WebSocket = require('ws');
const http = require('http');
const types = require('./lib/MessageTypes');

const DEBUGGER_ACTIVE_FLAG = 'SLAPP_DEBUGGER_ACTIVE';
const DEBUGGER_PARAMETERS = {
    BROKER_HOST: 'SLAPP_DEBUG_BROKER_HOST',
    BROKER_PORT: 'SLAPP_DEBUG_BROKER_PORT',
    FUNCTION_ID: 'SLAPP_SESSION',
    AUTH_KEY: 'SLAPP_KEY',
    AUTH_SECRET: 'SLAPP_SECRET'
};

// parse handler name
const handlerEnv = process.env._HANDLER && process.env._HANDLER.indexOf('.') > -1 ? process.env._HANDLER.split('.') : [null, 'defaultHandler']; // eslint-disable-line
const HANDLER_NAME = handlerEnv[1];// eslint-disable-line

const SLP_DEBUG_BROKER_HOST = process.env[DEBUGGER_PARAMETERS.BROKER_HOST] || 'lambda-debug.slappforge.com';
const SLP_DEBUG_BROKER_PORT = process.env[DEBUGGER_PARAMETERS.BROKER_PORT] || 8181;
const SLP_DEBUG_FUNCTION_ID = process.env[DEBUGGER_PARAMETERS.FUNCTION_ID];
const SLP_DEBUG_AUTH_KEY = process.env[DEBUGGER_PARAMETERS.AUTH_KEY];
const SLP_DEBUG_AUTH_SECRET = process.env[DEBUGGER_PARAMETERS.AUTH_SECRET];

let child;
let childSocket;
let brokerSocket;

function currentTimeInMilliseconds() {
    const hrtime = process.hrtime();
    return (hrtime[0] * 1000) + Math.floor(hrtime[1] / 1000000);
}

const log = (...optionalParams) => {
    console.log('SLP-DEBUG-PROXY', ...optionalParams);
};

function runAsProxy() {

    let isDebuggerActive = true;
    if (!process.env[DEBUGGER_ACTIVE_FLAG] || process.env[DEBUGGER_ACTIVE_FLAG] === 'false') {
        isDebuggerActive = false;
    } else if (!SLP_DEBUG_FUNCTION_ID) {
        log('Missing environment variable:', DEBUGGER_PARAMETERS.FUNCTION_ID);
        isDebuggerActive = false;
    } else if (!SLP_DEBUG_AUTH_KEY || !SLP_DEBUG_AUTH_SECRET) {
        log('Missing environment variable:', DEBUGGER_PARAMETERS.AUTH_KEY, 'and/or', DEBUGGER_PARAMETERS.AUTH_SECRET);
        isDebuggerActive = false;
    }

    if (!isDebuggerActive) {
        log('Debugger Status: INACTIVE');
        return;
    }

    log('Debugger Status: ACTIVE');
    let childResolver;
    let debuggerUrl;
    const childPromise = new Promise((resolve) => {
        childResolver = resolve;
    });

    // only fork one child
    if (!child) {
        child = cp.fork(module.parent.filename, [], {
            cwd: process.cwd(),
            env: process.env,
            execPath: process.execPath,
            execArgv: process.execArgv.concat(['--inspect']),
            stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        });

        child.on('message', (messageString) => {
            const message = JSON.parse(messageString);
            switch (message.type) {
                case types.CHILD_READY: {
                    log('Child process is ready');
                    debuggerUrl = message.debuggerUrl; // eslint-disable-line
                    childResolver();
                    break;
                }
                default: {
                    break;
                }
            }
        });

        // set child stream encodings
        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');
    }

    // replace the handler with our code
    module.parent.exports[HANDLER_NAME] = (event, context, callback) => {
        // this allows console.log in child to route correctly to CloudWatch Logs
        child.stdout.on('data', console.log);
        child.stderr.on('data', console.log);

        // this is a requirement to keep function from running to full timeout
        context.callbackWaitsForEmptyEventLoop = false; // eslint-disable-line

        // handle shims for callback and callbackWaitsForEmptyEventLoop
        function childMessageHandler(messageString) {
            const message = JSON.parse(messageString);
            switch (message.type) {
                case types.LAMBDA_CALLBACK: {
                    brokerSocket.terminate();
                    childSocket.terminate();
                    child.stdout.removeAllListeners('data');
                    child.stderr.removeAllListeners('data');
                    child.removeListener('message', childMessageHandler);

                    if (message.doNotWaitOnEmptyEventLoop) {
                        context.callbackWaitsForEmptyEventLoop = false; // eslint-disable-line
                    }
                    callback(message.err || null, message.response || null); // eslint-disable-line
                    break;
                }
                case types.SET_CALLBACKWAITSFOREMPTYEVENTLOOP: {
                    context.callbackWaitsForEmptyEventLoop = message.value; // eslint-disable-line
                    break;
                }
                default: {
                    break;
                }
            }
        }

        child.on('message', childMessageHandler);

        let authSegment = `${SLP_DEBUG_AUTH_KEY}:${SLP_DEBUG_AUTH_SECRET}`;
        let addressSegment = `${SLP_DEBUG_BROKER_HOST}:${SLP_DEBUG_BROKER_PORT}`;
        let idSegment = `${Date.now()}-${SLP_DEBUG_AUTH_KEY}-${SLP_DEBUG_FUNCTION_ID}`;

        let prematureBrokerCloseHandler = (code, reason) => {
            let errorMsg = `Debug Broker server connection failed ${reason ? `due to ${reason}` : ''}`;
            log(errorMsg);
            if (childSocket && (childSocket.readyState === WebSocket.OPEN)) {
                childSocket.terminate();
            }
            child.stdout.removeAllListeners('data');
            child.stderr.removeAllListeners('data');
            child.removeListener('message', childMessageHandler);
            callback(errorMsg);
        };

        // connect to broker
        brokerSocket = new WebSocket(`ws://${authSegment}@${addressSegment}/${idSegment}`);
        brokerSocket.on('close', prematureBrokerCloseHandler);

        // wait on CHILD_READY
        childPromise.then(() => {
            brokerSocket.on('message', (messageString) => {
                const message = JSON.parse(messageString);
                switch (message.type) {
                    // handle notification from broker that user has connected
                    case types.USER_CONNECTED: {
                        log('User connected via broker. Invoking child.');

                        // open socket to child's debugger endpoint
                        childSocket = new WebSocket(debuggerUrl);

                        // proxy V8 debugger messages from child
                        childSocket.on('message', (rawInspectorMessage) => {
                            if (brokerSocket.readyState === WebSocket.OPEN) {
                                brokerSocket.send(JSON.stringify({
                                    type: types.V8_INSPECTOR_MESSAGE,
                                    payload: rawInspectorMessage
                                }));
                            }
                        });

                        // send invoke message to child
                        childSocket.on('open', () => {
                            child.send(JSON.stringify({
                                timestamp: currentTimeInMilliseconds(),
                                remainingTime: context.getRemainingTimeInMillis(),
                                type: types.INVOKE_HANDLER,
                                event,
                                context
                            }));
                        });
                        break;
                    }

                    // proxy V8 debugger messages to child
                    case types.V8_INSPECTOR_MESSAGE: {
                        if (childSocket.readyState === WebSocket.OPEN) {
                            childSocket.send(message.payload);
                        }
                        break;
                    }
                    default: {
                        break;
                    }
                }
            });

            // Remove the premature close handler and add new close handler
            brokerSocket.removeEventListener('close', prematureBrokerCloseHandler);

            // clean up on broker socket close
            brokerSocket.on('close', () => {
                if (childSocket && childSocket.readyState === WebSocket.OPEN) {
                    childSocket.terminate();
                }
            });
        });
    };
}

function runAsChild() {
    // shim callback
    const callback = (err, response) =>
        process.send(JSON.stringify({type: types.LAMBDA_CALLBACK, err, response}));

    // handle messages from proxy
    process.on('message', (messageString) => {
        const message = JSON.parse(messageString);
        switch (message.type) {
            // handle invoke message from proxy
            case types.INVOKE_HANDLER: {
                // shim context
                let _callbackWaitsForEmptyEventLoop = true; // eslint-disable-line
                Object.defineProperties(message.context, {
                    callbackWaitsForEmptyEventLoop: {
                        get: () => _callbackWaitsForEmptyEventLoop,
                        set: (value) => {
                            _callbackWaitsForEmptyEventLoop = value;
                            process.send(JSON.stringify({
                                type: types.SET_CALLBACKWAITSFOREMPTYEVENTLOOP,
                                value
                            }));
                        }
                    }
                });
                // emulate getRemainingTimeInMillis by taking the known remaining time and subtracting the
                // delta between now and when that known remaining time was captured. Result should be
                // very close since both parent and child share the same system clock.
                message.context.getRemainingTimeInMillis =
                    () => message.remainingTime - (currentTimeInMilliseconds() - message.timestamp);
                message.context.done = (err, response) =>
                    process.send(JSON.stringify({
                        type: types.LAMBDA_CALLBACK,
                        err,
                        response,
                        doNotWaitOnEmptyEventLoop: true
                    }));
                message.context.succeed = response => message.context.done(null, response);
                message.context.fail = err => message.context.done(err, null);

                // get ready for the user
                log(`Current AWS request ID: ${message.context.awsRequestId}`);
                setTimeout( // this is a hack to get around the delay before the debugger fully kicks in
                    () => {
                        const handler = module.parent.exports[HANDLER_NAME];
                        // debugger;
                        // *** STEP INTO THE FOLLOWING LINE TO BEGIN STEPPING THROUGH YOUR FUNCTION ***
                        const response = handler(message.event, message.context, callback);
                        // handle promise returns - required for async handler support
                        if (response instanceof Promise) {
                            response.then(message.context.succeed);
                            response.catch(message.context.fail);
                        }
                    },
                    1000
                );
                break;
            }
            default: {
                break;
            }
        }
    });

    // inform proxy that child is ready, passing along the local debugger URL
    http.get('http://localhost:9229/json', (responseStream) => {
        let responseString = '';
        responseStream.on('data', (chunk) => {
            responseString += chunk;
        });
        responseStream.on('end', () => {
            // console.log(`#NL Child process info: ${responseString}`);
            const response = JSON.parse(responseString);
            process.send(JSON.stringify({
                type: types.CHILD_READY,
                debuggerUrl: response[0].webSocketDebuggerUrl
            }));
        });
    });
}

// process.send only exists on a child process
if (process.send) {
    runAsChild();
} else {
    runAsProxy();
}
