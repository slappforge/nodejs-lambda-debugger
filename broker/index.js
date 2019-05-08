const WebSocket = require('ws');
const types = require('../lib/messageTypes');
const util = require('util');
const http = require('http');

const serialize = x => util.inspect(x, { depth: null });
const log = (message) => {
  console.log(`${new Date().toISOString()}: ${message}`);
};

let socketCache = [];

const lambdaServer = new WebSocket.Server({ port: 8080 });
const userServer = new WebSocket.Server({ port: 9229 });
const stopServer = http.createServer((req, res) => {
  const key = req.url;
  console.log('Stop debug request received for key', key);

  const ws = new WebSocket(`ws://localhost:9229${key}`, [], {});
  ws.on('open', () => {
    ws.terminate();
    res.statusCode = 200;
    res.end('');
  });
});

stopServer.listen(8090, () => {
  console.log('Stop Server running at port 8090');
});

// todo: study memory usage under heavy debugging for docs
// todo: keep improving connection cleanup, e.g.: abandoned connections
// todo: structured logging

// configure lambda facing socket server
lambdaServer.on('connection', (proxySocket, request) => {
  log(`Lambda connection incoming with function ID: ${serialize(request.url)}`);
  const foundCacheRecord = socketCache.find(cacheRecord => cacheRecord.key === request.url);
  if (foundCacheRecord) {
    log('Found conflicting key in cache. Terminating old connection.');
    foundCacheRecord.proxySocket.close();
  }

  log(`Registering proxy in cache under key: ${request.url}`);
  socketCache.push({
    key: request.url,
    proxySocket,
  });

  proxySocket.on('error', (error) => {
    log(`Proxy socket error: ${serialize(error)}`);
  });

  proxySocket.on('close', () => {
    log(`Proxy socket initiated closure. Closing connections associated with key: ${serialize(request.url)}`);
    const cacheRecord = socketCache.find(record => record.key === request.url);
    if (cacheRecord && cacheRecord.userSocket) {
      if (cacheRecord.userSocket.readyState === WebSocket.OPEN) cacheRecord.userSocket.close();
      socketCache = socketCache.filter(record => record.key !== request.url);
    }
  });
});

// configure user facing socket server
userServer.on('connection', (userSocket, request) => {
  log(`User connection incoming with function ID: ${serialize(request.url)}`);
  let proxySocket;
  const foundCacheRecord = socketCache.find(record => record.key === request.url);
  if (foundCacheRecord) {
    // kick anything after the first debugger or if the proxy socket isn't open
    log('Found associated proxy in cache.');
    if (foundCacheRecord.proxySocket.readyState !== WebSocket.OPEN) {
      log('Associated proxy is not is OPEN state');
      userSocket.close();
      return;
    } else if (foundCacheRecord.userSocket) {
      log('Associated proxy already has a user connection. Terminating old connection.');
      foundCacheRecord.userSocket.close();
    }
    proxySocket = foundCacheRecord.proxySocket; // eslint-disable-line
    foundCacheRecord.userSocket = userSocket;
    log('Notifying associated proxy of user connection.');
    proxySocket.send(JSON.stringify({ type: types.USER_CONNECTED }));
  } else {
    // kick when lambda isn't connected
    log('No associated proxy found in cache. Terminating connection.');
    userSocket.close();
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
    log(`User socket initiated closure. Closing connections associated with request: ${serialize(request.url)}`);
    const cacheRecord = socketCache.find(record => record.key === request.url);
    if (cacheRecord && cacheRecord.proxySocket) {
      if (cacheRecord.proxySocket.readyState === WebSocket.OPEN) {
        cacheRecord.proxySocket.close();
      }
      socketCache = socketCache.filter(record => record.key !== request.url);
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
});

log('Broker started...');
