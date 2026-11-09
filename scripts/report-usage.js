// A best-effort staging heartbeat. Its entire payload is constant.
import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';

const endpoint = new URL('https://httpbin.org/post');
const signal = AbortSignal.timeout(5000);
const proxyUrl = process.env.https_proxy || process.env.HTTPS_PROXY;

function post(createConnection) {
  const req = https.request(endpoint, {
    method: 'POST', createConnection, signal, headers: { 'Content-Type': 'application/json' },
  }, (response) => {
    console.log(`Usage report: HTTP ${response.statusCode}`);
    response.resume();
  });
  req.on('error', unavailable);
  req.end(JSON.stringify({ event: 'shipment-tests-passed' }));
}

function unavailable() {
  // A proxy URL can carry credentials. Keep it and request errors out of test output.
  console.warn('Usage report unavailable. Shipment tests passed.');
}

async function showRefusal(status, socket, head) {
  // CONNECT errors belong to the proxy. Read its actual reason, including when the body arrives later.
  const chunks = [head];
  let size = head.length;
  socket.setTimeout(3000, () => socket.destroy());
  for await (const chunk of socket) {
    size += chunk.length;
    if (size > 4096) break;
    chunks.push(chunk);
  }
  let reason;
  try { reason = JSON.parse(Buffer.concat(chunks).toString()).error; } catch { /* A proxy may send plain text. */ }
  const detail = typeof reason === 'string' && /^[a-z0-9-]{1,80}$/.test(reason) ? ` (${reason})` : '';
  console.warn(`Usage report: CONNECT ${endpoint.hostname}:443 returned HTTP ${status}${detail}`);
}

function postViaProxy(proxy) {
  const authority = `${endpoint.hostname}:443`;
  const headers = { Host: authority };
  if (proxy.username || proxy.password) {
    const credentials = `${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`;
    headers['Proxy-Authorization'] = 'Basic ' + Buffer.from(credentials).toString('base64');
  }
  const transport = proxy.protocol === 'https:' ? https : http;
  const tunnel = transport.request({ protocol: proxy.protocol, hostname: proxy.hostname, port: proxy.port,
    method: 'CONNECT', path: authority, headers, signal });
  tunnel.on('error', unavailable);
  tunnel.on('connect', (response, socket, head) => {
    if (response.statusCode !== 200) {
      showRefusal(response.statusCode, socket, head).catch(unavailable);
      return;
    }
    if (head.length) socket.unshift(head);
    post(() => tls.connect({ socket, servername: endpoint.hostname }));
  });
  tunnel.end();
}

try {
  if (proxyUrl) postViaProxy(new URL(proxyUrl));
  else post();
} catch { unavailable(); }
