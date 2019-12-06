const WebSocket = require('ws');
const types = require('./lib/MessageTypes');
const util = require('util');
const http = require('http');
const {authenticateConnection, loadAuthKeysFromRemote} = require("./lib/authenticator");

const LAMBDA_PORT = 8181;
const USER_PORT = 9239;
const STOP_PORT = 8191;

const TERMINATION_ERROR_CODE = 4001;

const serialize = x => util.inspect(x, {depth: null});
const log = (...optionalParams) => {
    console.log(new Date().toISOString(), ...optionalParams);
};

loadAuthKeysFromRemote(log);
setInterval(() => loadAuthKeysFromRemote(log), 300000);

let socketCache = [];

const lambdaServer = new WebSocket.Server({port: LAMBDA_PORT});
const userServer = new WebSocket.Server({port: USER_PORT});
const stopServer = http.createServer((req, res) => {
    const key = cleanUpURL(req.url);
    log('Stop debug request received for key', key);
    authenticateConnection(req, log, (isAuthenticated) => {
        if (isAuthenticated) {
            log('Executing stop debug operation...');
            const foundCacheRecord = socketCache.find(cacheRecord => cacheRecord.key === key);
            if (foundCacheRecord && foundCacheRecord.proxySocket && (foundCacheRecord.proxySocket.readyState === WebSocket.OPEN)) {
                foundCacheRecord.proxySocket.terminate();
            }
            res.statusCode = 200;
            res.end('');

        } else {
            log("Authentication Failed. Ignoring stop request");
            res.statusCode = 401;
            res.end('');
        }
    });
});

stopServer.listen(STOP_PORT, () => {
    log('Debug stop endpoint available at port', STOP_PORT);
});

// configure lambda facing socket server
lambdaServer.on('connection', (proxySocket, request) => {

    let lambdaConID = cleanUpURL(request.url);
    log('A Lambda connection incoming with function ID:', lambdaConID);

    authenticateConnection(request, log, (isAuthenticated) => {
        if (isAuthenticated) {
            log("Authenticated lambda connection with function ID:", lambdaConID);

            const foundCacheRecord = socketCache.find(cacheRecord => dropLambdaIDPrefix(cacheRecord.key) === dropLambdaIDPrefix(lambdaConID));
            if (foundCacheRecord) {
                log('Found conflicting key:', foundCacheRecord.key, 'in cache. Terminating old connection.');
                foundCacheRecord.proxySocket.terminate();
                socketCache = socketCache.filter(record => record.key !== foundCacheRecord.key);
            }

            log('Registering proxy in cache under key:', lambdaConID);
            socketCache.push({
                key: lambdaConID,
                proxySocket,
            });

            proxySocket.on('error', (error) => {
                log(`Proxy socket error: ${serialize(error)}`);
            });

            proxySocket.on('close', () => {
                log('Proxy socket initiated closure. Closing connections associated with key:', lambdaConID);
                const cacheRecord = socketCache.find(record => record.key === lambdaConID);
                if (cacheRecord && cacheRecord.userSocket) {
                    if (cacheRecord.userSocket.readyState === WebSocket.OPEN) {
                        cacheRecord.userSocket.close();
                    }
                    socketCache = socketCache.filter(record => record.key !== lambdaConID);
                }
            });
        } else {
            log("Authentication failed for lambda connection with function ID:", lambdaConID);
            log('Terminating lambda connection');
            proxySocket.close(TERMINATION_ERROR_CODE, 'Authentication Failure');
        }
    });
});

// configure user facing socket server
userServer.on('connection', (userSocket, request) => {

    let userConID = cleanUpURL(request.url);
    log('A User connection incoming with function ID:', userConID);

    authenticateConnection(request, log, (isAuthenticated) => {
        if (isAuthenticated) {
            log("Authenticated user connection with function ID:", userConID);
            let proxySocket;
            const foundCacheRecord = socketCache.find(record => dropLambdaIDPrefix(record.key) === userConID);
            if (foundCacheRecord) {
                // kick anything after the first debugger or if the proxy socket isn't open
                log('Found associated proxy in cache.', '(', foundCacheRecord.key, ')');
                if (foundCacheRecord.proxySocket.readyState !== WebSocket.OPEN) {
                    log('Associated proxy is not in OPEN state. Terminating user connection');
                    userSocket.close(TERMINATION_ERROR_CODE, 'Lambda connection is not in OPEN state');
                    return;
                } else if (foundCacheRecord.userSocket) {
                    log('Associated proxy already has a user connection. Terminating old user connection.');
                    foundCacheRecord.userSocket.close(TERMINATION_ERROR_CODE, 'New debugger session connected');
                }
                proxySocket = foundCacheRecord.proxySocket; // eslint-disable-line
                foundCacheRecord.userSocket = userSocket;
                log('Notifying associated proxy of user connection.');
                proxySocket.send(JSON.stringify({type: types.USER_CONNECTED}));
            } else {
                // kick when lambda isn't connected
                log('No associated proxy found in cache. Terminating connection.');
                userSocket.close(TERMINATION_ERROR_CODE, 'No Lambda connection found. Probably Lambda is not running or the function ID is incorrect');
                return;
            }

            // pass along V8 inspector messages
            userSocket.on('message', (message) => {
                if (proxySocket.readyState === WebSocket.OPEN) {
                    proxySocket.send(JSON.stringify({
                        type: types.V8_INSPECTOR_MESSAGE,
                        payload: message
                    }));
                }
            });

            userSocket.on('error', (error) => {
                log(`User socket error: ${serialize(error)}`);
            });

            userSocket.on('close', () => {
                log('User socket initiated closure. Closing connections associated with request:', userConID);
                const cacheRecord = socketCache.find(record => dropLambdaIDPrefix(record.key) === userConID);
                if (cacheRecord && cacheRecord.proxySocket) {
                    if (cacheRecord.proxySocket.readyState === WebSocket.OPEN) {
                        cacheRecord.proxySocket.close();
                    }
                    socketCache = socketCache.filter(record => dropLambdaIDPrefix(record.key) !== userConID);
                }
            });

            proxySocket.on('message', (messageString) => {
                const message = JSON.parse(messageString);
                switch (message.type) {
                    case types.V8_INSPECTOR_MESSAGE: {
                        if (userSocket.readyState === WebSocket.OPEN) {
                            userSocket.send(message.payload);
                        }
                        break;
                    }
                    default: {
                        break;
                    }
                }
            });

        } else {
            log("Authentication failed for user connection with function ID:", userConID);
            log('Terminating user connection');
            userSocket.close(TERMINATION_ERROR_CODE, 'Authentication Failed');
        }
    });


});

function cleanUpURL(url) {
    if (url) {
        return url.substr(1);
    }
}

function dropLambdaIDPrefix(fullID) {
    return fullID.substr(14);
}

log('Broker started.', 'Lambda port:', LAMBDA_PORT, '& User port:', USER_PORT);
