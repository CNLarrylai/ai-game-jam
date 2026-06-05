/* ============================================================
   viewer-app.jsx — 看播端：完全由 WebSocket 驱动
   观众进房后，游戏画面 100% 来自主播端广播
   ============================================================ */
const { useState, useEffect, useRef, useCallback } = React;

let _vid = 0;
const vid = () => "v" + (++_vid);

function ViewerApp() {
  /* no-op director — viewer can see scenes but not interact */
  const noopD = {
    adoptComment: () => {}, applyStats: () => {}, addItem: () => {}, removeItem: () => {},
    toast: () => {}, injectComment: () => {}, banner: () => {}, spawn: () => {}, byTag: () => {},
    story: () => {}, closeStory: () => {}, decision: () => {}, closeDecision: () => {},
    phase: () => {}, goOut: () => {}, confirmDest: () => {}, returnShelter: () => {},
    goScene: () => {}, setFlag: () => {}, day: 1, injectCompanionLater: () => {},
    generateAIEvent: async () => null,
  };

  /* ---- login state ---- */
  const [entered, setEntered] = useState(false);
  const [nick, setNick] = useState("");
  const [avatar, setAvatar] = useState("🦊");

  /* ---- synced game state from host ---- */
  const [hostState, setHostState] = useState(null); // full state_sync payload
  const [connected, setConnected] = useState(false);
  const [viewers, setViewers] = useState(0);

  /* ---- host cursor state ---- */
  const [cursor, setCursor] = useState({ x: -100, y: -100 });
  const [clicks, setClicks] = useState([]);

  /* ---- local comment state ---- */
  const [comments, setComments] = useState([]);
  const [chatVal, setChatVal] = useState("");
  const [inputFocus, setInputFocus] = useState(false);

  const wsRef = useRef(null);

  /* ============ WebSocket ============ */
  useEffect(() => {
    if (!entered) return;
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const url = isLocal ? 'ws://localhost:3002' : 'wss://wasteland-ws.loca.lt';
    let ws;
    try { ws = new WebSocket(url); } catch { return; }

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({
        type: 'register', role: 'viewer',
        uid: 'v_' + Date.now(), name: nick, avatar
      }));
    };

    ws.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }

      switch (msg.type) {
        case 'state_sync':
          if (msg.data) {
            setHostState(msg.data);
            // Sync host's comments to viewer if we have fewer
            if (msg.data.comments && msg.data.comments.length > 0) {
              setComments(cs => {
                const existing = new Set(cs.map(c => c.text));
                const newOnes = msg.data.comments.filter(c => !existing.has(c.text))
                  .map(c => ({ ...c, id: vid() }));
                return newOnes.length > 0 ? [...cs, ...newOnes].slice(-60) : cs;
              });
            }
          }
          break;
        case 'new_comment':
          pushCmt({ user: msg.name || '?', av: msg.avatar || '👤', text: msg.text });
          break;
        case 'viewer_join':
          setViewers(msg.viewerCount || 0);
          break;
        case 'viewer_leave':
          setViewers(msg.viewerCount || 0);
          break;
        case 'banner':
          if (msg.data) setHostState(s => s ? { ...s, banner: msg.data } : s);
          setTimeout(() => setHostState(s => s ? { ...s, banner: null } : s), 4000);
          break;
        case 'self_notify':
          // self-visible adoption notification
          pushCmt({ user: '🌟 系统', av: '🌟', text: msg.data.text + ' ' + (msg.data.detail || ''), system: true, adopted: true });
          break;
        case 'host_action':
          if (msg.action === 'cursor' && msg.data) {
            setCursor({ x: msg.data.x, y: msg.data.y });
          }
          if (msg.action === 'click' && msg.data) {
            const id = vid();
            setClicks(cs => [...cs.slice(-5), { id, x: msg.data.x, y: msg.data.y }]);
            setTimeout(() => setClicks(cs => cs.filter(c => c.id !== id)), 800);
          }
          if (msg.action === 'ai_generated' && msg.data?.generated) {
            pushCmt({
              user: '✨ AI', av: '✨', system: true, adopted: true,
              text: '@' + (msg.data.source_user || '观众') + ' 的创意生效了！「' + (msg.data.generated.title || msg.data.source_text) + '」'
            });
          }
          break;
      }
    };

    ws.onclose = () => setConnected(false);
    wsRef.current = ws;
    return () => ws.close();
  }, [entered]);

  const pushCmt = useCallback((c) => {
    setComments(cs => [...cs.slice(-60), { ...c, id: vid() }]);
  }, []);

  const sendComment = () => {
    const text = chatVal.trim();
    if (!text) return;
    pushCmt({ user: nick || '你', av: avatar, text, own: true });
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'comment', text, name: nick, avatar }));
    }
    setChatVal("");
  };

  const enterRoom = () => {
    setNick(nick.trim() || "未命名观众");
    setEntered(true);
  };

  /* ============ Render ============ */

  // Login screen
  if (!entered) {
    return (
      <div id="app">
        <EnterPage nick={nick} setNick={setNick} avatar={avatar} setAvatar={setAvatar}
          onEnter={enterRoom} streamerName="荒原阿陈" />
      </div>
    );
  }

  // Extract host state
  const hs = hostState || {};
  const day = hs.day || '?';
  noopD.day = day;
  const stats = hs.stats || { hp: 0, hunger: 0, sanity: 0, supply: 0 };
  const scene = hs.scene || 'waiting';
  const pack = hs.pack || [];
  const decision = hs.decision || null;
  const banner = hs.banner || null;
  const story = hs.story || null;
  const phase = hs.phase || null;
  const cta = hs.cta || null;

  const SCENE_LABELS = {
    home: '🏠 避难所', organize: '📦 整理资源', destination: '🗺️ 选择目的地',
    explore: '🧭 探索中', fail: '💀 游戏结束', win: '🏆 通关', settle: '📊 结算',
    waiting: '⏳ 等待主播...'
  };

  return (
    <div id="app">
      {/* Status bar - synced from host */}
      <StatusBar day={day} maxDay={7} stats={stats} pack={pack} floats={[]} flashSlot={null} />

      <div className="main-row">
        {/* Game area - read only */}
        <div className="stage-col viewer-stage">

          {/* Connection + scene indicator */}
          <div className="watch-badge">
            <span className="dot" style={{ background: connected ? 'var(--green)' : 'var(--red)' }} />
            {connected
              ? (hostState ? `已同步 · Day ${day} · ${SCENE_LABELS[scene] || scene}` : '已连接 · 等待主播开始...')
              : '连接中...'
            }
          </div>

          {/* Scene title */}
          {hostState && (
            <div className="scene-title-chip">{SCENE_LABELS[scene] || scene}</div>
          )}

          {/* Main game view - render same scene components as host, read-only */}
          {!hostState && (
            <div className="scene" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
              <div style={{ fontSize: 60, marginBottom: 20 }}>🎮</div>
              <div style={{ fontFamily: 'var(--pixel)', fontSize: 'var(--t-md)', color: 'var(--cyan)' }}>
                {connected ? '等待主播开始游戏...' : '正在连接直播间...'}
              </div>
              <div style={{ fontSize: 'var(--t-sm)', color: 'var(--txt-dim)', marginTop: 10 }}>
                你的评论将影响游戏世界
              </div>
            </div>
          )}

          {/* Reuse host's scene components — D is a no-op director (viewer can't operate) */}
          {hostState && scene === 'home' && <SceneHome D={noopD} flags={{}} companions={COMPANIONS} />}
          {hostState && scene === 'organize' && <SceneOrganize D={noopD} pack={pack.length ? pack : []} companions={COMPANIONS} />}
          {hostState && scene === 'destination' && <SceneDestination D={noopD} />}
          {hostState && scene === 'explore' && <SceneExplore D={noopD} />}
          {hostState && scene === 'fail' && <EndingFail days={day} onSettle={() => {}} onReplay={() => {}} />}
          {hostState && scene === 'win' && <EndingWin days={day} explored={0} items={0} onSettle={() => {}} onShare={() => {}} />}
          {hostState && scene === 'settle' && <Settlement outcome="win" days={day} onShare={() => {}} onReplay={() => {}} />}

          {/* Decision card overlay - synced from host */}
          {decision && (
            <div className="decision">
              <div className="d-card">
                <div className="d-head">
                  <span className="d-icon">{decision.icon || '❓'}</span>
                  <span className="d-title">{decision.title || ''}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 'var(--t-sm)', color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    👁 主播正在操作…
                  </span>
                </div>
                {decision.desc && <div className="d-desc">{decision.desc}</div>}
                {decision.result ? (
                  <div className="result-line">{decision.result}</div>
                ) : decision.opts && (
                  <div className="d-opts">
                    {decision.opts.map((o, i) => (
                      <div key={i} className="opt">
                        <button className="btn opt-btn">
                          <span className="opt-main">{o.icon || ''} {o.label || o.text || ''}</span>
                          {o.sub && <span className="opt-sub">{o.sub}</span>}
                        </button>
                        {decision.votes && decision.votes[o.id || i] != null && (
                          <div className="vote-bar">
                            <div className="vfill" style={{ width: Math.min(100, (decision.votes[o.id || i] || 0) * 2) + '%' }} />
                            <span className="vtxt">{decision.votes[o.id || i] || 0}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Banner overlay */}
          {banner && (
            <div className="banner-layer">
              <div className={"banner " + (banner.big ? "big" : "")}>
                <span className="b-icon">{banner.icon || '✨'}</span>
                <span className="b-text" dangerouslySetInnerHTML={{ __html: banner.html || '' }} />
              </div>
            </div>
          )}

          {/* Story overlay */}
          {story && (
            <div className="story">
              <div className="s-illus"><div className="glowbg" />{story.illus || '📖'}</div>
              <div className="s-text">{story.text || ''}</div>
              {story.source && <div className="s-source">📝 灵感来源：{story.source}</div>}
            </div>
          )}

          {/* Phase transition */}
          {phase && (
            <div className="phase-wipe">
              <div className="pw-big">{phase.big}</div>
              {phase.sub && <div className="pw-sub">{phase.sub}</div>}
            </div>
          )}

          {/* Host cursor + click ripples */}
          {hostState && (
            <React.Fragment>
              <div className="sync-cursor" style={{ position: 'absolute', left: cursor.x, top: cursor.y, zIndex: 125, width: 30, height: 30, pointerEvents: 'none', transition: 'left .08s, top .08s', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.6))' }}>
                <span style={{ position: 'absolute', fontSize: 26, color: '#fff', transform: 'rotate(225deg)' }}>➤</span>
                <span style={{ position: 'absolute', left: 24, top: 18, whiteSpace: 'nowrap', fontSize: 'var(--t-micro)', color: '#062b27', background: 'var(--cyan)', padding: '2px 7px' }}>主播</span>
              </div>
              {clicks.map(c => (
                <div key={c.id} style={{ position: 'absolute', left: c.x - 55, top: c.y - 55, width: 110, height: 110, pointerEvents: 'none', zIndex: 124 }}>
                  <div style={{ position: 'absolute', inset: 0, border: '3px solid var(--cyan)', borderRadius: '50%', animation: 'clickR 1s ease-out forwards' }} />
                </div>
              ))}
            </React.Fragment>
          )}

          {/* CTA - call to action */}
          {cta && (
            <div style={{ position: 'absolute', top: 120, left: '50%', transform: 'translateX(-50%)', zIndex: 92,
              background: 'rgba(10,8,20,.92)', border: '3px solid var(--gold)', boxShadow: '0 0 40px rgba(255,207,63,.5)',
              padding: '18px 40px', textAlign: 'center', animation: 'cfIn .4s ease-out' }}>
              <div style={{ fontSize: 'var(--t-lg)', color: 'var(--gold)' }}>📢 主播正在征集创意！</div>
              <div style={{ fontSize: 'var(--t-sm)', color: 'var(--txt-dim)', marginTop: 8 }}>{cta.prompt}</div>
            </div>
          )}

        </div>

        {/* Chat panel */}
        <div className="chat-col">
          <div className="chat-head">
            <div className="streamer-av">🎮</div>
            <div className="streamer-meta">
              <div className="streamer-name">荒原阿陈 <span className="live-tag">LIVE</span></div>
              <div className="viewers">👁 <b>{viewers || '—'}</b> watching</div>
            </div>
          </div>

          <ChatList comments={comments} />

          <div className={"chat-input viewer " + (inputFocus ? "focus" : "")}>
            <div className="chat-guide">
              {cta ? '🎮 主播正在征集创意！快输入你的想法' : '🎮 这片大陆会回应你的声音'}
            </div>
            <div className="input-row">
              <input value={chatVal} onChange={(e) => setChatVal(e.target.value)}
                onFocus={() => setInputFocus(true)} onBlur={() => setInputFocus(false)}
                placeholder="说点什么…和主播一起创造世界"
                onKeyDown={(e) => e.key === 'Enter' && sendComment()} />
              <div className="input-send" onClick={sendComment}>➤</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Simple chat list */
function ChatList({ comments }) {
  const ref = useRef(null);
  const stick = useRef(true);
  useEffect(() => {
    if (stick.current && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [comments]);
  const onScroll = () => {
    const el = ref.current; if (!el) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };
  return (
    <div className="chat-list" ref={ref} onScroll={onScroll}>
      {comments.map(c => (
        <div key={c.id} className={"cmt " + (c.adopted ? "adopted " : "") + (c.own ? "mod " : "") + (c.system ? "system " : "")}>
          <div className="c-av">{c.av}</div>
          <div className="c-body">
            <div className="c-name">{c.user}{c.own ? " （你）" : ""}</div>
            <div className="c-text">{c.text}</div>
            {c.adopted && <div className="adopt-tag">✓ 已融入游戏</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* Login page - reuse from viewer-views.jsx */
function EnterPage({ nick, setNick, avatar, setAvatar, onEnter, streamerName }) {
  const avatars = ["🦊", "🐱", "🤖", "👻", "🌙", "🦉"];
  return (
    <div className="enter-page">
      <div className="bg-grid" />
      <div className="enter-hero">
        <div className="e-av">🎮<span className="live-tag">LIVE</span></div>
        <div className="e-title">🎮 AI 末日探险 — 你的评论创造世界</div>
        <div className="e-meta"><span>主播 <b>{streamerName}</b></span><span>👁 <b>LIVE</b></span></div>
        <div className="loading-strip"><i /></div>
      </div>
      <div className="login-modal">
        <h2>进入直播间</h2>
        <div className="field-label">你的昵称</div>
        <input value={nick} onChange={e => setNick(e.target.value)}
          placeholder="给自己起个名字…" maxLength={12}
          onKeyDown={e => e.key === 'Enter' && onEnter()} />
        <div className="field-label">选择头像</div>
        <div className="av-picker">
          {avatars.map(a => (
            <div key={a} className={"av-opt " + (avatar === a ? "sel" : "")}
              onClick={() => setAvatar(a)}>{a}</div>
          ))}
        </div>
        <button className="btn primary" style={{ width: '100%' }} onClick={onEnter}>进入直播间 →</button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<ViewerApp />);
