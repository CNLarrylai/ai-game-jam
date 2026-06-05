/* ============================================================
   viewer-app.jsx — 观众端入口
   加载和主播相同的 App，以 viewerMode 运行
   ============================================================ */
window.__VIEWER_MODE__ = true;

const { useState: useStateV, useEffect: useEffectV, useRef: useRefV } = React;

function ViewerLogin({ onEnter }) {
  const [nick, setNick] = useStateV("");
  const [avatar, setAvatar] = useStateV("🦊");
  const avatars = ["🦊", "🐱", "🤖", "👻", "🌙", "🦉"];
  const enter = () => onEnter(nick.trim() || "未命名观众", avatar);
  return (
    <div className="enter-page">
      <div className="bg-grid" />
      <div className="enter-hero">
        <div className="e-av">🎮<span className="live-tag">LIVE</span></div>
        <div className="e-title">🎮 AI 末日探险 — 你的评论创造世界</div>
        <div className="e-meta"><span>主播 <b>荒原阿陈</b></span><span>👁 <b>LIVE</b></span></div>
        <div className="loading-strip"><i /></div>
      </div>
      <div className="login-modal">
        <h2>进入直播间</h2>
        <div className="field-label">你的昵称</div>
        <input value={nick} onChange={e => setNick(e.target.value)}
          placeholder="给自己起个名字…" maxLength={12}
          onKeyDown={e => e.key === 'Enter' && enter()} />
        <div className="field-label">选择头像</div>
        <div className="av-picker">
          {avatars.map(a => (
            <div key={a} className={"av-opt " + (avatar === a ? "sel" : "")}
              onClick={() => setAvatar(a)}>{a}</div>
          ))}
        </div>
        <button className="btn primary" style={{ width: '100%' }} onClick={enter}>进入直播间 →</button>
      </div>
    </div>
  );
}

function ViewerWrapper() {
  // Restore saved session
  const saved = (() => { try { return JSON.parse(localStorage.getItem('wl_viewer') || '{}'); } catch { return {}; } })();
  const [entered, setEntered] = useStateV(!!saved.nick);
  const [nick, setNick] = useStateV(saved.nick || "");
  const [avatar, setAvatar] = useStateV(saved.avatar || "");
  const [connected, setConnected] = useStateV(false);
  const [chatVal, setChatVal] = useStateV("");
  const chatValRef = useRefV("");
  chatValRef.current = chatVal;
  const wsRef = useRefV(null);

  const onEnter = (n, a) => {
    setNick(n); setAvatar(a); setEntered(true);
    try { localStorage.setItem('wl_viewer', JSON.stringify({ nick: n, avatar: a })); } catch {}
  };

  useEffectV(() => {
    if (!entered) return;
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const url = isLocal ? 'ws://localhost:3002' : 'wss://wasteland-live-ws.onrender.com';
    let ws;
    try { ws = new WebSocket(url); } catch { return; }
    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'register', role: 'viewer', uid: 'v_' + Date.now(), name: nick, avatar }));
    };
    ws.onclose = () => setConnected(false);
    wsRef.current = ws;
    return () => ws.close();
  }, [entered]);

  const sendComment = () => {
    const text = chatValRef.current.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== 1) return;
    wsRef.current.send(JSON.stringify({ type: 'comment', text, name: nick, avatar }));
    setChatVal("");
  };

  if (!entered) return <ViewerLogin onEnter={onEnter} />;

  return React.createElement(window.App, {
    viewerMode: true,
    viewerWs: wsRef.current,
    viewerConnected: connected,
    viewerNick: nick,
    viewerAvatar: avatar,
    viewerChatVal: chatVal,
    viewerSetChatVal: setChatVal,
    viewerSendComment: sendComment,
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(<ViewerWrapper />);
