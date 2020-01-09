const WebSocket = require('ws');
const http = require('http');
const {logIfVerbose, printGreenWTime, printRedWTime, printYellowWTime, printYellow} = require("./util");

const DEBUGGER_PORT = 9249;

const HTTP_REQUEST_PATHS = {
    JSON: '/json',                  // WebStorm/IDEA debugger send only this
    JSON_VERSION: '/json/version',  // VS Code first sends this
    JSON_LIST: '/json/list'         // VS Code secondly sends this
};

const METHOD_NAMES = {
    RUN_IF_WAITING: 'Runtime.runIfWaitingForDebugger',
    RUN: 'Runtime.run',
    SET_BRK_PT: 'Debugger.setBreakpointByUrl',
    GET_BRK_PTS: 'Debugger.getPossibleBreakpoints',
    LOG_ENABLE: 'Log.enable',
    NODE_WRK_ENABLE: 'NodeWorker.enable',
    CONSOLE_ENABLE: 'Console.enable'
};

module.exports = {
    startClient: (host, port, funcID, authKey, authSecret, verbose) => {

        printYellow('Parameters In Use:');
        printYellow('  ', 'Broker Host:', '\t', host);
        printYellow('  ', 'Broker Port:', '\t', port);
        printYellow('  ', 'Function ID:', '\t', funcID);
        printYellow('  ', 'Auth Key:', '\t\t', authKey);
        printYellow('  ', 'Auth Secret:', '\t', authSecret);

        printGreenWTime("Starting client...");

        let bSocket;
        const server = http.createServer((req, res) => {

            let requestURL = req.url;

            if (requestURL === HTTP_REQUEST_PATHS.JSON_VERSION) {
                res.end(JSON.stringify(
                    [
                        {
                            "Browser": "node.js",
                            "Protocol-Version": "1.1"
                        }
                    ]
                ));

            } else if ((requestURL === HTTP_REQUEST_PATHS.JSON) || (requestURL === HTTP_REQUEST_PATHS.JSON_LIST)) {

                if (!(bSocket && (bSocket.readyState === WebSocket.OPEN))) {
                    printGreenWTime('Connecting to debug broker server...');
                    bSocket = new WebSocket(`ws://${authKey}:${authSecret}@${host}:${port}/${authKey}-${funcID}`);
                }

                bSocket.on('open', function () {
                    printGreenWTime('Connected to debug broker server');
                    res.end(JSON.stringify(
                        [
                            {
                                "description": "node.js instance",
                                "id": funcID,
                                "title": "index.js",
                                "type": "node",
                                "webSocketDebuggerUrl": `ws://127.0.0.1:${DEBUGGER_PORT}/${funcID}`
                            }
                        ]
                    ));
                });

            } else {
                printRedWTime("Unknown request type");
                res.end(JSON.stringify({}));
            }
        });
        const userServer = new WebSocket.Server({server});
        userServer.on('connection', function connection(ws) {
            printGreenWTime('Debugger connected');

            ws.on('message', function incoming(message) {
                let msgObj = JSON.parse(message);
                let method = msgObj.method;

                if (method !== METHOD_NAMES.RUN) {
                    if ((method === METHOD_NAMES.LOG_ENABLE)) {
                        let newMsg = {
                            ...msgObj,
                            method: METHOD_NAMES.SET_BRK_PT,
                            params: {"lineNumber": 1, "urlRegex": ".*\\.js"}
                        };
                        message = JSON.stringify(newMsg);
                    }

                    logIfVerbose(verbose, 'C-2-B', '>>>', message);
                    if (bSocket.readyState === WebSocket.OPEN) {
                        bSocket.send(message);
                    } else {
                        bSocket.terminate();
                    }
                }
            });

            bSocket.on('message', (message) => {
                logIfVerbose(verbose, 'B-2-C', '<<<', message);
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(message);
                } else {
                    ws.terminate();
                }
            });

            bSocket.on('close', (code, reason) => {
                if (code === 1006) {
                    printRedWTime("Debug broker server connection terminated");
                    if (reason) {
                        printYellowWTime(reason);
                    }
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.terminate();
                    }
                } else {
                    printGreenWTime("Debug broker server connection closed");
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.close();
                    }
                }
            });

            bSocket.on('error', (error) => {
                printRedWTime('Debug broker server connection error:', error);
            });

            ws.on('close', () => {
                printGreenWTime("Debugger connection closed");
                if (bSocket.readyState === WebSocket.OPEN) {
                    bSocket.close();
                }
            });

            ws.on('error', (error) => {
                printRedWTime('Debugger connection error:', error);
            });
        });

        server.listen(DEBUGGER_PORT, () => {
            printGreenWTime('Client started successfully');
            printGreenWTime(`Execute the Lambda function and connect to localhost:${DEBUGGER_PORT} from your IDE debugger`);
        });
    }
};
