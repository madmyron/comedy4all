const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const basePort = Number(process.env.PORT) || 5173;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function send(res, statusCode, body, contentType) {
  res.writeHead(statusCode, {
    'Content-Type': contentType || 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function serveFile(res, filePath) {
  fs.readFile(filePath, function(err, data) {
    if (err) {
      send(res, 404, 'Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, data, mimeTypes[ext] || 'application/octet-stream');
  });
}

function requestHandler(req, res) {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(root, safePath);

  if (urlPath === '/' || urlPath === '') {
    filePath = path.join(root, 'index.html');
  }

  fs.stat(filePath, function(err, stat) {
    if (!err && stat.isDirectory()) {
      const indexPath = path.join(filePath, 'index.html');
      fs.stat(indexPath, function(indexErr, indexStat) {
        if (!indexErr && indexStat.isFile()) {
          serveFile(res, indexPath);
        } else {
          send(res, 404, 'Not found');
        }
      });
      return;
    }

    if (!err && stat.isFile()) {
      serveFile(res, filePath);
      return;
    }

    const fallback = path.join(root, 'index.html');
    fs.stat(fallback, function(fallbackErr, fallbackStat) {
      if (!fallbackErr && fallbackStat.isFile()) {
        serveFile(res, fallback);
      } else {
        send(res, 500, 'Missing index.html');
      }
    });
  });
}

function listen(port) {
  const server = http.createServer(requestHandler);
  server.on('error', function(err) {
    if (err && err.code === 'EADDRINUSE' && port < basePort + 20) {
      console.log('Port ' + port + ' is busy, trying ' + (port + 1) + '...');
      listen(port + 1);
      return;
    }
    throw err;
  });
  server.listen(port, function() {
    console.log('Comedy 4 All dev server running at http://localhost:' + port);
  });
}

listen(basePort);
