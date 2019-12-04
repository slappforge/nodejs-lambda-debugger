const WebSocket = require('ws');
const http = require('http');
const {logIfVerbose, printGreen} = require("./util");

const DEBUGGER_PORT = 9249;

module.exports = {
    startClient: (host, port, funcID, verbose) => {
        printGreen("Starting client...");

        let bSocket;
        const server = http.createServer((req, res) => {
            console.log("Request received...");

            if (!(bSocket && bSocket.OPEN)) {
                printGreen('Connecting to debug broker server...');
                bSocket = new WebSocket(`ws://${host}:${port}/${funcID}`);
            }

            userServer.on('connection', function connection(ws) {
                printGreen('Debugger connected');

                ws.on('message', function incoming(message) {
                    logIfVerbose(verbose, 'C-2-B', '>>>', message);
                    bSocket.send(message);
                });

                bSocket.on('message', (message) => {
                    logIfVerbose(verbose, 'B-2-C', '<<<', message);
                    ws.send(message);
                });

                bSocket.on('close', () => {
                    printGreen("Debug broker server connection closed");
                    ws.close();
                });

                ws.on('close', () => {
                    printGreen("Debugger connection closed");
                    bSocket.close();
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
