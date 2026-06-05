/* api-bridge.jsx — connects WASTELAND LIVE to backend APIs + WebSocket */

const API_BASE = window.location.origin;
const _isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const WS_URL = _isLocal ? 'ws://localhost:3002' : 'wss://wasteland-live-ws.onrender.com';

/* ============================================================
   WebSocket 实时同步层
   ============================================================ */
const WsSync = {
  ws: null,
  role: null,        // 'host' | 'viewer'
  uid: null,
  connected: false,
  listeners: {},      // event type → [callback]
  reconnectTimer: null,

  connect(role, userInfo = {}) {
    this.role = role;
    this.uid = userInfo.uid || 'u_' + Math.random().toString(36).slice(2, 10);

    const doConnect = () => {
      try {
        this.ws = new WebSocket(WS_URL);
      } catch (e) {
        console.warn('[WS] 连接失败，5秒后重试');
        this.reconnectTimer = setTimeout(doConnect, 5000);
        return;
      }

      this.ws.onopen = () => {
        this.connected = true;
        console.log(`[WS] 已连接 (${role})`);
        // 注册身份
        this.send({
          type: 'register',
          role,
          uid: this.uid,
          name: userInfo.name || '',
          avatar: userInfo.avatar || ''
        });
      };

      this.ws.onmessage = (e) => {
        let msg;
        try { msg = JSON.parse(e.data); } catch { return; }
        const cbs = this.listeners[msg.type];
        if (cbs) cbs.forEach(cb => cb(msg));
      };

      this.ws.onclose = () => {
        this.connected = false;
        console.log('[WS] 断开，3秒后重连');
        this.reconnectTimer = setTimeout(doConnect, 3000);
      };

      this.ws.onerror = () => {};  // onclose will handle reconnect
    };

    doConnect();
  },

  send(msg) {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(msg));
    }
  },

  on(type, cb) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(cb);
  },

  off(type, cb) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter(x => x !== cb);
  },

  // ---- 主播端：广播操作 ----
  broadcastAction(action, data) {
    this.send({ type: 'host_action', action, data });
  },

  broadcastGameState(state) {
    this.send({ type: 'game_state', data: state });
  },

  broadcastBanner(bannerData) {
    this.send({ type: 'banner', data: bannerData });
  },

  broadcastCommentAdopted(authorUid, data) {
    this.send({ type: 'comment_adopted', authorUid, data });
  },

  broadcastGameEnd(data) {
    this.send({ type: 'game_end', data });
  },

  // ---- 用户端：发评论 ----
  sendComment(text, name, avatar) {
    this.send({ type: 'comment', text, name, avatar });
  },
};

window.WsSync = WsSync;

/* ============================================================
   ApiBridge — HTTP APIs (保持原有能力)
   ============================================================ */
const ApiBridge = {
  // Post a comment to the server buffer
  async postComment(user, text) {
    try {
      await fetch(API_BASE + '/api/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, text }),
      });
    } catch(e) { console.warn('postComment failed:', e); }
  },

  // Get and drain comment buffer
  async getComments() {
    try {
      const res = await fetch(API_BASE + '/api/comment');
      const data = await res.json();
      return data.comments || [];
    } catch(e) { return []; }
  },

  // Generate narrative event from comments + game state
  async generateEvent(gameState, context, rawComments) {
    try {
      const res = await fetch(API_BASE + '/api/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameState: {
            day: gameState.day || 1,
            hp: gameState.stats?.hp || 80,
            food: gameState.stats?.hunger || 50,
            sanity: gameState.stats?.sanity || 60,
            actionPoints: gameState.ap || 5,
            companions: (gameState.companions || []).map(c => c.name),
            inventory: (gameState.pack || []).map(i => i.name),
            karma: gameState.karma || 0,
            history: gameState.history || [],
          },
          context,
          rawComments,
        }),
      });
      return await res.json();
    } catch(e) {
      console.warn('generateEvent failed:', e);
      return null;
    }
  },

  // Broadcast game state for spectators (now uses WebSocket)
  broadcastState(state) {
    if (WsSync.connected && WsSync.role === 'host') {
      WsSync.broadcastGameState(state);
    }
  },

  // Simple comment classification (client-side, mirrors server logic)
  classifyComment(text) {
    // Noise patterns
    const noise = [/^(哈哈|lol|666|加油|厉害|牛|gg|好看|好玩)/i, /^.{0,2}$/];
    if (noise.some(p => p.test(text))) return { type: 'noise', actionable: false };

    // Creative/actionable patterns
    const patterns = [
      { pattern: /(前面|前方|出现|遇到|发现).*(人|老人|怪物|建筑|医院|超市)/, type: 'event_create' },
      { pattern: /(给他|掉落|出现|找到).*(枪|剑|刀|药|食物|钥匙)/, type: 'item_summon' },
      { pattern: /(来了|出现|遇到).*(人|幸存者|士兵|医生)/, type: 'npc_create' },
      { pattern: /(暴风雨|丧尸|空投|地震|着火)/, type: 'environment' },
    ];

    for (const { pattern, type } of patterns) {
      if (pattern.test(text)) return { type, actionable: true };
    }

    // Long enough to be potentially creative
    if (text.length > 8) return { type: 'event_create', actionable: true, confidence: 0.4 };

    return { type: 'chat', actionable: false };
  },
};

window.ApiBridge = ApiBridge;

/* ============================================================
   Auto-connect: 主播端自动以 host 身份连接 WebSocket
   ============================================================ */
if (!window.__WS_CONNECTED__) {
  window.__WS_CONNECTED__ = true;
  // 检测是否是 Viewer 页面——Viewer 页面由 viewer-app.jsx 自己连 viewer 身份
  const isViewer = window.location.href.includes('Viewer');
  if (!isViewer) {
    // 主播端自动以 host 身份连接
    WsSync.connect('host');
  }
  // Viewer 端不在这里连——由 viewer-app.jsx 的 enterRoom 触发 viewer 身份连接
}
