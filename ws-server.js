/* ============================================================
   ws-server.js — WASTELAND LIVE 实时同步服务

   功能：
   1. 主播端连接为 host，操作广播给所有 viewer
   2. 用户端连接为 viewer，评论发给 host
   3. 系统消息（采纳通知/公屏横幅）广播全场

   启动: node ws-server.js
   端口: 3002
   ============================================================ */
const { WebSocketServer } = require('ws');
const http = require('http');

const PORT = 3002;
const server = http.createServer();
const wss = new WebSocketServer({ server });

// 连接池
let host = null;           // 主播只有一个
const viewers = new Map();  // uid -> ws

// 游戏状态快照（新用户进房时同步）
let latestState = null;

wss.on('connection', (ws) => {
  let role = null;
  let uid = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {

      // ========== 注册身份 ==========
      case 'register':
        role = msg.role;  // 'host' | 'viewer'
        uid = msg.uid || 'anon_' + Math.random().toString(36).slice(2,8);

        if (role === 'host') {
          host = ws;
          console.log('[HOST] 主播已连接');
        } else {
          viewers.set(uid, ws);
          console.log(`[VIEWER] ${msg.name || uid} 进房 (在线: ${viewers.size})`);
          // 发送最新游戏状态给新进房的用户
          if (latestState) {
            ws.send(JSON.stringify({ type: 'state_sync', data: latestState }));
          }
          // 通知主播有人进房
          if (host && host.readyState === 1) {
            host.send(JSON.stringify({
              type: 'viewer_join',
              uid, name: msg.name, avatar: msg.avatar,
              viewerCount: viewers.size
            }));
          }
        }
        break;

      // ========== 主播 → 全体用户 ==========
      case 'host_action':
        // 主播的任何操作：点格子、选选项、触发事件...
        latestState = msg.data?.state || latestState;
        broadcast({
          type: 'host_action',
          action: msg.action,
          data: msg.data
        }, 'viewers');
        break;

      case 'game_state':
        // 主播定期同步完整游戏状态
        latestState = msg.data;
        broadcast({ type: 'state_sync', data: msg.data }, 'viewers');
        break;

      case 'banner':
        // 公屏横幅 → 全场可见（主播+用户）
        broadcast({ type: 'banner', data: msg.data }, 'all');
        break;

      case 'comment_adopted':
        // 评论被采纳
        // 给评论作者发自见通知
        const authorWs = viewers.get(msg.authorUid);
        if (authorWs && authorWs.readyState === 1) {
          authorWs.send(JSON.stringify({
            type: 'self_notify',
            data: { text: msg.data.text, detail: msg.data.detail }
          }));
        }
        // 全场公屏通知
        setTimeout(() => {
          broadcast({ type: 'banner', data: msg.data.banner }, 'all');
        }, msg.data.delay || 3000);
        break;

      // ========== 用户 → 主播 ==========
      case 'comment':
        // 用户发评论 → 转发给主播
        if (host && host.readyState === 1) {
          host.send(JSON.stringify({
            type: 'viewer_comment',
            uid, name: msg.name, avatar: msg.avatar,
            text: msg.text
          }));
        }
        // 同时广播给所有用户（评论区同步）
        broadcast({
          type: 'new_comment',
          uid, name: msg.name, avatar: msg.avatar,
          text: msg.text
        }, 'all');
        break;

      // ========== 游戏结束 ==========
      case 'game_end':
        broadcast({ type: 'game_end', data: msg.data }, 'all');
        break;
    }
  });

  ws.on('close', () => {
    if (role === 'host') {
      host = null;
      console.log('[HOST] 主播断开');
    } else if (uid) {
      viewers.delete(uid);
      console.log(`[VIEWER] ${uid} 离开 (在线: ${viewers.size})`);
      // 通知主播
      if (host && host.readyState === 1) {
        host.send(JSON.stringify({
          type: 'viewer_leave', uid, viewerCount: viewers.size
        }));
      }
    }
  });
});

function broadcast(msg, target) {
  const data = JSON.stringify(msg);
  if (target === 'viewers' || target === 'all') {
    for (const [, ws] of viewers) {
      if (ws.readyState === 1) ws.send(data);
    }
  }
  if (target === 'all' && host && host.readyState === 1) {
    host.send(data);
  }
}

server.listen(PORT, () => {
  console.log(`\n🎮 WASTELAND LIVE WebSocket 服务已启动`);
  console.log(`   端口: ${PORT}`);
  console.log(`   主播端连接: ws://localhost:${PORT} (register as host)`);
  console.log(`   用户端连接: ws://localhost:${PORT} (register as viewer)\n`);
});
