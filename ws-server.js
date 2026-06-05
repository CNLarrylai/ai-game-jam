const { WebSocketServer } = require('ws');
const http = require('http');

const PORT = process.env.PORT || 3002;
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  // POST /api/comment — HTTP endpoint for triggering AI generation
  if (req.method === 'POST' && req.url === '/api/comment') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const text = data.text || '';
        const name = data.name || '外部调用';
        const avatar = data.avatar || '🔌';
        if (!text) { res.writeHead(400, {'Content-Type':'application/json'}); res.end(JSON.stringify({error:'text is required'})); return; }
        // Broadcast as comment (same as WebSocket comment)
        if (host && host.readyState === 1) {
          host.send(JSON.stringify({ type: 'viewer_comment', uid: 'api', name, avatar, text }));
        }
        broadcast({ type: 'new_comment', uid: 'api', name, avatar, text }, 'all');
        res.writeHead(200, {'Content-Type':'application/json'});
        res.end(JSON.stringify({ok: true, message: 'Comment sent, AI will process in next cycle'}));
      } catch(e) { res.writeHead(400, {'Content-Type':'application/json'}); res.end(JSON.stringify({error: e.message})); }
    });
    return;
  }

  // GET /api/state — get current game state
  if (req.method === 'GET' && req.url === '/api/state') {
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(JSON.stringify({ ok: true, state: latestState, viewers: viewers.size, hostConnected: !!(host && host.readyState === 1) }));
    return;
  }

  // Health check
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WASTELAND LIVE WS Server OK');
});
const wss = new WebSocketServer({ server });

let host = null;
const viewers = new Map();
let latestState = null;
const pendingEventsForHost = []; // game_events that arrived while host was disconnected
const MAX_PENDING = 20;

wss.on('connection', (ws) => {
  let role = null, uid = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'register':
        role = msg.role; uid = msg.uid || 'anon_' + Math.random().toString(36).slice(2,8);
        if (role === 'host') {
          host = ws;
          console.log('[HOST] connected');
          // Replay any game_events that arrived while host was disconnected
          if (pendingEventsForHost.length > 0) {
            console.log('[HOST] Replaying', pendingEventsForHost.length, 'pending events');
            pendingEventsForHost.forEach(evt => ws.send(JSON.stringify(evt)));
            pendingEventsForHost.length = 0;
          }
        } else {
          viewers.set(uid, ws);
          console.log(`[VIEWER] ${msg.name || uid} joined (${viewers.size})`);
          if (latestState) ws.send(JSON.stringify({ type: 'state_sync', data: latestState }));
          if (host && host.readyState === 1) {
            host.send(JSON.stringify({ type: 'viewer_join', uid, name: msg.name, avatar: msg.avatar, viewerCount: viewers.size }));
          }
        }
        break;
      case 'host_action':
        latestState = msg.data?.state || latestState;
        broadcast({ type: 'host_action', action: msg.action, data: msg.data }, 'viewers');
        break;
      case 'game_state':
        latestState = msg.data;
        broadcast({ type: 'state_sync', data: msg.data }, 'viewers');
        break;
      case 'banner':
        broadcast({ type: 'banner', data: msg.data }, 'all');
        if (!host || host.readyState !== 1) {
          pendingEventsForHost.push({ type: 'banner', data: msg.data });
          if (pendingEventsForHost.length > MAX_PENDING) pendingEventsForHost.shift();
        }
        break;
      case 'comment_adopted':
        const authorWs = viewers.get(msg.authorUid);
        if (authorWs && authorWs.readyState === 1) {
          authorWs.send(JSON.stringify({ type: 'self_notify', data: { text: msg.data?.text, detail: msg.data?.detail } }));
        }
        if (msg.data?.banner) {
          setTimeout(() => broadcast({ type: 'banner', data: msg.data.banner }, 'all'), msg.data?.delay || 3000);
        }
        break;
      case 'comment':
        if (host && host.readyState === 1) {
          host.send(JSON.stringify({ type: 'viewer_comment', uid, name: msg.name, avatar: msg.avatar, text: msg.text }));
        }
        broadcast({ type: 'new_comment', uid, name: msg.name, avatar: msg.avatar, text: msg.text }, 'all');
        break;
      case 'system_msg':
        broadcast({ type: 'system_msg', name: msg.name, avatar: msg.avatar, text: msg.text }, 'all');
        break;
      case 'comment_feedback':
        broadcast({ type: 'comment_feedback', ...msg }, 'all');
        break;
      case 'game_event':
        broadcast({ type: 'game_event', data: msg.data }, 'all');
        // Always store — host might miss it even if "connected" (browser tab inactive etc)
        pendingEventsForHost.push({ type: 'game_event', data: msg.data });
        if (pendingEventsForHost.length > MAX_PENDING) pendingEventsForHost.shift();
        // Also store latest game_event in latestState so viewers get it on reconnect
        if (latestState) latestState._lastGameEvent = msg.data;
        break;
      case 'choice_result':
        broadcast({ type: 'choice_result', data: msg.data }, 'all');
        break;
      case 'action_result':
        broadcast({ type: 'action_result', data: msg.data }, 'all');
        break;
      case 'game_end':
        broadcast({ type: 'game_end', data: msg.data }, 'all');
        break;
    }
  });

  ws.on('close', () => {
    if (role === 'host') { host = null; console.log('[HOST] disconnected'); }
    else if (uid) {
      viewers.delete(uid);
      if (host && host.readyState === 1) {
        host.send(JSON.stringify({ type: 'viewer_leave', uid, viewerCount: viewers.size }));
      }
    }
  });
});

function broadcast(msg, target) {
  const data = JSON.stringify(msg);
  if (target === 'viewers' || target === 'all') {
    for (const [, ws] of viewers) { if (ws.readyState === 1) ws.send(data); }
  }
  if (target === 'all' && host && host.readyState === 1) host.send(data);
}

server.listen(PORT, () => {
  console.log(`🎮 WASTELAND LIVE WS on port ${PORT}`);
});
