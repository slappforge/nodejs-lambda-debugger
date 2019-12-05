const WebSocket = require('ws');
const http = require('http');
const {logIfVerbose, printGreenWTime, printRedWTime, printYellowWTime} = require("./util");

const DEBUGGER_PORT = 9249;

module.exports = {
    startClient: (host, port, funcID, authKey, authSecret, verbose) => {
        printGreenWTime("Starting client...");

        let bSocket;
        const server = http.createServer((req, res) => {

            if (!(bSocket && (bSocket.readyState === WebSocket.OPEN))) {
                printGreenWTime('Connecting to debug broker server...');
                bSocket = new WebSocket(`ws://${authKey}:${authSecret}@${host}:${port}/${funcID}`);
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

        });
        const userServer = new WebSocket.Server({server});
        userServer.on('connection', function connection(ws) {
            printGreenWTime('Debugger connected');

            ws.on('message', function incoming(message) {
                logIfVerbose(verbose, 'C-2-B', '>>>', message);
                if (bSocket.readyState === WebSocket.OPEN) {
                    bSocket.send(message);
                } else {
                    bSocket.terminate();
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
