'use strict';

/**
 * Tiny Anthropic Messages API proxy — hides ANTHROPIC_API_KEY from browsers.
 *
 * Env:
 *   PORT              (default 8788)
 *   ANTHROPIC_API_KEY (required)
 *   PROXY_SECRET      (optional) — if set, require Authorization: Bearer <same value>
 *   CORS_ORIGIN       (optional) — "*" (default) or comma-separated allowed origins, e.g. "https://comedy4all.com,http://localhost:5173"
 *   MAX_BODY_BYTES    (optional) — default 6291456 (~6MB)
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = Number(process.env.PORT) || 8788;
const ANTHROPIC_KEY = (process.env.ANTHROPIC_API_KEY || '').trim();
const PROXY_SECRET = (process.env.PROXY_SECRET || '').trim();
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const MAX_BODY = Math.min(Number(process.env.MAX_BODY_BYTES) || 6291456, 33554432);

function parseAllowedOrigins() {
  if (CORS_ORIGIN === '*') return null;
  return CORS_ORIGIN.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
}

function corsAllowOrigin(req) {
  var origin = req.headers.origin || '';
  var list = parseAllowedOrigins();
  if (!list) return '*';
  if (origin && list.indexOf(origin) !== -1) return origin;
  return list[0] || '*';
}

function readBody(req, maxBytes) {
  return new Promise(function(resolve, reject) {
    var chunks = [];
    var len = 0;
    req.on('data', function(chunk) {
      len += chunk.length;
      if (len > maxBytes) {
        reject(new Error('payload too large'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', function() {
      resolve(Buffer.concat(chunks));
    });
    req.on('error', reject);
  });
}

function forwardToAnthropic(bodyBuf, anthropicVersion) {
  return new Promise(function(resolve, reject) {
    var opts = {
      method: 'POST',
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': bodyBuf.length,
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': anthropicVersion || '2023-06-01'
      }
    };
    var req = https.request(opts, function(upstream) {
      var parts = [];
      upstream.on('data', function(c) { parts.push(c); });
      upstream.on('end', function() {
        resolve({
          statusCode: upstream.statusCode || 502,
          body: Buffer.concat(parts)
        });
      });
    });
    req.on('error', reject);
    req.write(bodyBuf);
    req.end();
  });
}

var server = http.createServer(function(req, res) {
  var allow = corsAllowOrigin(req);
  var baseCors = {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, anthropic-version, anthropic-dangerous-direct-browser-access',
    'Access-Control-Max-Age': '86400'
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, baseCors);
    res.end();
    return;
  }

  var host = req.headers.host || 'localhost';
  var url;
  try {
    url = new URL(req.url || '/', 'http://' + host);
  } catch (e) {
    res.writeHead(400, baseCors);
    res.end(JSON.stringify({ error: 'Bad URL' }));
    return;
  }

  var pathNorm = (url.pathname || '').replace(/\/$/, '') || '/';
  if (req.method !== 'POST' || pathNorm !== '/v1/messages') {
    res.writeHead(404, Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, baseCors));
    res.end(JSON.stringify({ error: 'Use POST /v1/messages with the same JSON body as Anthropic Messages API.' }));
    return;
  }

  if (!ANTHROPIC_KEY) {
    res.writeHead(500, Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, baseCors));
    res.end(JSON.stringify({ error: 'Server missing ANTHROPIC_API_KEY' }));
    return;
  }

  if (PROXY_SECRET) {
    var auth = req.headers.authorization || '';
    if (auth !== 'Bearer ' + PROXY_SECRET) {
      res.writeHead(401, Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, baseCors));
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
  }

  readBody(req, MAX_BODY).then(function(bodyBuf) {
    var ver = (req.headers['anthropic-version'] || '2023-06-01').toString();
    return forwardToAnthropic(bodyBuf, ver);
  }).then(function(up) {
    res.writeHead(up.statusCode, baseCors);
    res.end(up.body);
  }).catch(function(err) {
    if (err && err.message === 'payload too large') {
      res.writeHead(413, Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, baseCors));
      res.end(JSON.stringify({ error: 'Body too large' }));
      return;
    }
    console.error(err);
    res.writeHead(502, Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, baseCors));
    res.end(JSON.stringify({ error: 'Bad gateway' }));
  });
});

server.listen(PORT, function() {
  console.log('Anthropic proxy on port', PORT);
});
