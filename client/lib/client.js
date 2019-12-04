const WebSocket = require('ws');
const http = require('http');
const {logIfVerbose, printGreen, printRed} = require("./util");

const DEBUGGER_PORT = 9249;

module.exports = {
    startClient: (host, port, funcID, verbose) => {
        printGreen("Starting client...");

        let bSocket;
        const server = http.createServer((req, res) => {

            if (!(bSocket && bSocket.OPEN)) {
                printGreen('Connecting to debug broker server...');
                bSocket = new WebSocket(`ws://${host}:${port}/${funcID}`);
            }

            userServer.on('connection', function connection(ws) {
                printGreen('Debugger connected');

                ws.on('message', function incoming(message) {
                    logIfVerbose(verbose, 'C-2-B', '>>>', message);
                    if (bSocket.OPENED) {
                        bSocket.send(message);
                    } else {
                        bSocket.terminate();
                    }
                });

                bSocket.on('message', (message) => {
                    logIfVerbose(verbose, 'B-2-C', '<<<', message);
                    if (ws.OPENED) {
                        ws.send(message);
                    } else {
                        ws.terminate();
                    }
                });

                bSocket.on('close', () => {
                    printGreen("Debug broker server connection closed");
                    ws.terminate();
                });

                bSocket.on('error', (error) => {
                    printRed('Debug broker server connection error:', error);
                });

                ws.on('close', () => {
                    printGreen("Debugger connection closed");
                    bSocket.terminate();
                });

                ws.on('error', (error) => {
                    printRed('Debugger connection error:', error);
                });
            });

            bSocket.on('open', function () {
                printGreen('Connected to debug broker server');
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

        server.listen(DEBUGGER_PORT, () => {
            printGreen('Client started successfully');
            printGreen(`Execute the Lambda function and connect to localhost:${DEBUGGER_PORT} from your IDE debugger`);
        });
    }
};
