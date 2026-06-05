/* ============================================================
   viewer-views.jsx — sub-views for the audience prototype
   exported to window, loaded BEFORE viewer-app.jsx
   ============================================================ */
const { useRef: useRefV, useEffect: useEffectV } = React;

/* hex geometry — must match viewer-app.jsx */
const VHW = 112, VHH = 126, VHCX = 600, VHCY = 430;
const vodd = (x) => ((x % 2) + 2) % 2 === 1;
const vLeft = (x) => VHCX + x * (VHW * 0.75) - VHW / 2;
const vTop = (x, y) => VHCY + y * VHH + (vodd(x) ? VHH / 2 : 0) - VHH / 2;

/* ---------------- Step 1: enter page ---------------- */
function EnterPage({ nick, setNick, avatar, setAvatar, onEnter, streamerName }) {
  return (
    <div className="enter-page">
      <div className="bg-grid" />
      <div className="enter-hero">
        <div className="e-av">🎮<span className="live-tag">LIVE</span></div>
        <div className="e-title">🎮 AI 末日探险 · Day 3 — 你的评论创造世界</div>
        <div className="e-meta"><span>主播 <b>{streamerName}</b></span><span>👁 <b>1.2K</b> watching</span><span>❤️ 0</span></div>
        <div className="loading-strip"><i /></div>
      </div>

      <div className="login-modal">
        <h2>登录 / 注册 进入直播间</h2>
        <div className="field-label">你的昵称</div>
        <input value={nick} onChange={(e) => setNick(e.target.value)}
          placeholder="给自己起个名字…" maxLength={12}
          onKeyDown={(e) => e.key === "Enter" && onEnter()} />
        <div className="field-label">选择像素头像</div>
        <div className="av-picker">
          {window.VIEWER_AVATARS.map((a) => (
            <div key={a} className={"av-opt " + (avatar === a ? "sel" : "")}
              onClick={() => setAvatar(a)}>{a}</div>
          ))}
        </div>
        <button className="btn primary" style={{ width: "100%" }} onClick={onEnter}>进入直播间 →</button>
      </div>
    </div>
  );
}

/* ---------------- Steps 2-3: hex watch ---------------- */
function HexWatch({ spawnTile, revealed, ap }) {
  const tiles = window.VIEWER_HEX;
  return (
    <div className="scene">
      <div className="scene-title-chip">🗺️ 主播探索中 · 废弃医院</div>
      <div className="explore">
        <div className="ap-bar">
          <span className="ap-label">主播行动点 {ap}/5</span>
          <div className="ap-pips">{[0,1,2,3,4].map((i) => <div key={i} className={"ap-pip " + (i >= ap ? "used" : "")} />)}</div>
        </div>

        {tiles.map((t) => {
          const left = vLeft(t.x), top = vTop(t.x, t.y);
          const rev = revealed && revealed[t.id];
          let cls = "hex ";
          if (t.type === "hero") cls += "hero ";
          else if (rev) cls += "revealed ";
          else if (t.type === "fog") cls += "fog ";
          else if (t.type === "done") cls += "revealed ";
          else cls += "adjacent ";
          const icon = rev ? rev : t.icon;
          const isHero = t.type === "hero";
          const showSprite = isHero || rev || t.type === "done" || t.type === "tile";
          return (
            <div key={t.id} className={cls} style={{ position: "absolute", left, top }}>
              <div className="hx-inner">
                {t.type === "fog"
                  ? <span className="fog-q">?</span>
                  : showSprite
                    ? <IconOrSprite icon={isHero ? "🧑‍🚀" : icon} size={isHero ? 70 : 76} />
                    : <span className="fog-q">?</span>}
              </div>
              {t.spawn && spawnTile && (
                <div className="spawn-fx" style={{ left: VHW / 2, top: VHH / 2 }}>
                  <div className="ring" /><div className="ring" /><div className="ring" /><div className="core" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- read-only decision the streamer drives ---------------- */
function WatchDecision({ decision }) {
  if (!decision) return null;
  const { icon, title, desc, options, chosenId, result } = decision;
  return (
    <div className="decision">
      <div className="d-card">
        <div className="d-head">
          <span className="d-icon">{icon}</span>
          <span className="d-title">{title}</span>
          <span style={{ marginLeft: "auto", fontSize: "var(--t-sm)", color: "var(--cyan)",
            display: "flex", alignItems: "center", gap: 6 }}>👁 主播正在操作…</span>
        </div>
        {desc && <div className="d-desc">{desc}</div>}
        {result ? (
          <div className="result-line">{result}</div>
        ) : (
          <div className="d-opts">
            {options.map((o) => {
              const chosen = chosenId === o.id;
              const dim = chosenId && !chosen;
              return (
                <div key={o.id} className={"opt " + (chosen ? "leading" : "")}>
                  <button className={"btn opt-btn " + (chosen ? "primary" : "")}
                    style={dim ? { opacity: .35 } : null}>
                    <span className="opt-main">{o.icon} {o.label}{chosen && " ✓ 主播选择"}</span>
                    {o.sub && <span className="opt-sub">{o.sub}</span>}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Steps 4-5: night / going home ---------------- */
function NightWatch() {
  return (
    <div className="scene">
      <div className="scene-title-chip">🌙 主播回家休息中…</div>
      <div className="home-room">
        {/* back wall with framing studs */}
        <div className="hr-wall">
          <div className="hr-studs">
            {[0,1,2,3,4,5,6,7].map((i) => <span key={i} className="stud" />)}
          </div>
          <div className="hr-beam top" />
          <div className="hr-beam mid" />
        </div>
        {/* floor */}
        <div className="hr-floor">
          <div className="hr-floorlines" />
        </div>
        {/* window + moon */}
        <div className="hr-window">
          <div className="hr-winframe" />
          <Sprite name="moon" size={56} style={{ position: "absolute", left: 22, top: 16 }} />
        </div>
        {/* hanging lamp */}
        <div className="hr-lamp"><span className="cord" /><span className="bulb" /><span className="glow" /></div>
        {/* crate */}
        <Sprite name="crate" size={92} style={{ position: "absolute", left: 150, bottom: 210 }} />
        {/* bed + sleeping survivor */}
        <div className="hr-bed">
          <div className="bed-frame" />
          <div className="bed-mat" />
          <div className="bed-pillow" />
          <div className="bed-blanket" />
          <div className="sleeper-head" />
          <div className="zzz">z &nbsp; z &nbsp; z</div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Step 6: destination watch ---------------- */
function DestWatch({ nick, picked }) {
  const dests = [
    { id: "factory", icon: "🏭", name: "废弃工厂", danger: 3, reward: "军用装备", mine: true },
    { id: "hospital", icon: "🏥", name: "废弃医院", danger: 3, reward: "药品 / 绷带" },
    { id: "market", icon: "🏪", name: "塌陷超市", danger: 2, reward: "食物 / 净水" },
    { id: "station", icon: "📻", name: "广播电台", danger: 4, reward: "情报 / 信号枪" },
  ];
  return (
    <div className="scene">
      <div className="scene-title-chip">🚪 主播 · 选择目的地（Day 4）</div>
      <div className="region-map">
        <div className="rm-head">主播正在选择今天的目标 — 地图上出现了观众创造的新地点</div>
        <div className="dest-grid">
          {dests.map((d) => (
            <div key={d.id}
              className={"dest-card " + (d.mine ? "generated mine " : "")}
              style={d.mine && picked ? { outline: "3px solid var(--cyan)", outlineOffset: "-3px" } : null}>
              {d.mine && <div className="gen-tag">✨ 由 @{nick} 创造</div>}
              <div className="dc-thumb"><Sprite name={EMOJI_SPRITE[d.icon]} size={108} /></div>
              <div className="dc-name">{d.name}{d.mine && picked && <span style={{ color: "var(--cyan)", fontSize: "var(--t-sm)", marginLeft: 10 }}>✓ 主播已选</span>}</div>
              <div className="dc-row"><span>危险等级</span><span className="danger">{"⭐".repeat(d.danger)}</span></div>
              <div className="dc-row"><span>预估收益</span><span className="reward">{d.reward}</span></div>
              {d.mine && <div style={{ fontSize: "var(--t-xs)", color: "var(--gold)", marginTop: 8 }}>据说里面有军用装备…</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Self notification ---------------- */
function SelfNotif({ text }) {
  const display = text && !text.includes("废弃工厂") ? text : "废弃工厂 — 军用装备库";
  const sparks = Array.from({ length: 16 }).map((_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return { sx: Math.cos(a) * 280 + "px", sy: Math.sin(a) * 180 + "px",
      left: 50 + Math.cos(a) * 20 + "%", top: 50 + Math.sin(a) * 30 + "%", d: (i % 5) * 0.2 + "s" };
  });
  return (
    <div className="self-notif">
      <div className="sparks">{sparks.map((s, i) => (
        <i key={i} style={{ left: s.left, top: s.top, "--sx": s.sx, "--sy": s.sy, animationDelay: s.d }} />
      ))}</div>
      <div className="sn-only">🔒 仅你可见</div>
      <div className="sn-icon">🌟</div>
      <div className="sn-title">你的创意被采纳了！</div>
      <div className="sn-text">「<b>{display}</b>」<br />AI 正在为它生成专属剧情…</div>
      <div className="sn-prog"><i /></div>
    </div>
  );
}

/* ---------------- Step 7: settlement ---------------- */
function SettleWatch({ nick, avatar, onShare }) {
  const timeline = [
    { day: "DAY 1", evt: "在避难所醒来，清点初始物资" },
    { day: "DAY 2", evt: "敲门事件，迎入幸存者「凛」" },
    { day: "DAY 3", evt: "探索废弃医院，遭遇机械守卫" },
    { day: "DAY 4", evt: "探索废弃工厂", mine: true },
    { day: "DAY 5", evt: "在工厂军械库找到逃离通道线索" },
  ];
  const board = [
    { medal: "🥇", title: "最佳创意官", av: "🌫️", name: "雾", count: "采纳 5 次", detail: "贡献了医院、药房等关键地点。" },
    { medal: "🎨", title: "最强脑洞", av: "🕊️", name: "纸鹤", count: "影响力 MAX", detail: "「那只机械狗能驯服吗」→ 生成了 Boss。" },
    { medal: "💥", title: "最强世界建筑师", av: avatar, name: nick, count: "创造 3 个地点", mine: true,
      detail: "创造了废弃工厂等 3 个地点，贡献了全场最多的世界元素！" },
    { medal: "🗳️", title: "最佳指挥", av: "📡", name: "脉冲", count: "正确决策 5 次", detail: "多次带队选中存活率最高的方向。" },
  ];
  const parts = Array.from({ length: 14 }).map((_, i) => {
    const a = (i / 14) * Math.PI * 2;
    return { sx: Math.cos(a) * 200 + "px", sy: Math.sin(a) * 120 + "px",
      left: 50 + Math.cos(a) * 30 + "%", top: 50 + Math.sin(a) * 40 + "%", d: (i % 6) * 0.18 + "s" };
  });
  return (
    <div className="settle">
      <div className="settle-inner">
        <h1>🏆 通关结算</h1>
        <div className="sub">你和 1,284 名观众一起，把这片大陆写成了故事。</div>

        <section>
          <h2>旅程回顾</h2>
          <div className="timeline">
            {timeline.map((t, i) => (
              <div key={i} className="tl-item">
                <div className="tl-day">{t.day}</div>
                <div className="tl-evt">{t.evt}</div>
                {t.mine && <div className="tl-src">💬 灵感来源 · by @{nick}（你！）</div>}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2>创意排行榜</h2>
          <div className="lb-grid">
            {board.map((l, i) => (
              <div key={i} className={"lb-card " + (l.mine ? "mine" : "")}>
                {l.mine && <div className="lb-particles">{parts.map((p, j) => (
                  <i key={j} style={{ left: p.left, top: p.top, "--sx": p.sx, "--sy": p.sy, animationDelay: p.d }} />
                ))}</div>}
                <div className="lb-medal">{l.medal}</div>
                <div className="lb-body">
                  <div className="lb-title">{l.title}{l.mine && " · 你"}</div>
                  <div className="lb-user">
                    <div className="lb-av">{l.av}</div>
                    <span className="lb-name">{l.name}</span>
                    <span className="lb-count">{l.count}</span>
                  </div>
                  <div className="lb-detail">{l.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="settle-foot">
          <button className="btn gold" onClick={onShare}>分享我的贡献</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Share card ---------------- */
function ShareView({ nick, avatar, onClose }) {
  return (
    <div className="share-card">
      <div className="share-inner">
        <div className="sh-head">🎮 我的参与卡片 · WASTELAND LIVE</div>
        <div className="sh-av">{avatar}</div>
        <div className="sh-name">@{nick}</div>
        <div style={{ fontFamily: "var(--pixel)", fontSize: "var(--t-sm)", color: "var(--gold)",
          margin: "0 0 18px" }}>💥 最强世界建筑师</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 18 }}>
          {[{ i: "🏭", n: "废弃工厂" }, { i: "🏚️", n: "塌方仓库" }, { i: "📡", n: "信号塔" }].map((t, k) => (
            <div key={k} style={{ flex: 1 }}>
              <div style={{ height: 76, border: "2px solid var(--gold)", background: "linear-gradient(135deg,#2a2208,#161208)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, marginBottom: 5 }}>{t.i}</div>
              <div style={{ fontSize: "var(--t-xs)", color: "var(--txt-dim)" }}>{t.n}</div>
            </div>
          ))}
        </div>
        <div className="sh-quote">我为这个世界创造了 3 个地点<br />全场最多的世界元素贡献者</div>
        <button className="btn gold" onClick={onClose} style={{ width: "100%" }}>分享到 TikTok ↗</button>
        <button className="btn ghost sm" onClick={onClose} style={{ marginTop: 10, width: "100%" }}>关闭</button>
      </div>
    </div>
  );
}

/* ---------------- Viewer chat ---------------- */
function ViewerChat({ comments, viewers, streamerName, canType, chatVal, setChatVal,
  inputFocus, setInputFocus, onSend, hot }) {
  const listRef = useRefV(null);
  const stick = useRefV(true);
  const onScroll = () => {
    const el = listRef.current; if (!el) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };
  useEffectV(() => { if (stick.current && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [comments]);
  return (
    <div className="chat-col">
      <div className="chat-head">
        <div className="streamer-av">🎮</div>
        <div className="streamer-meta">
          <div className="streamer-name">{streamerName} <span className="live-tag">LIVE</span></div>
          <div className="viewers">👁 <b>{(viewers / 1000).toFixed(1)}K</b> watching · ❤️ 0</div>
        </div>
      </div>

      <div className="chat-list" ref={listRef} onScroll={onScroll}>
        {comments.map((c) => (
          <div key={c.id} className={"cmt " + (c.adopted ? "adopted " : "") + (c.reaction ? "reaction " : "") +
            (c.own ? "mod " : "") + (c.flash ? "flash" : "")}>
            <div className="c-av">{c.av}</div>
            <div className="c-body">
              <div className="c-name">{c.user}{c.own && " （你）"}</div>
              <div className="c-text">{c.text}</div>
              {c.adopted && <div className="adopt-tag">✓ 已融入游戏</div>}
            </div>
          </div>
        ))}
      </div>

      <div className={"chat-input viewer " + (canType ? "" : "") + (inputFocus ? "focus" : "")}>
        <div className="chat-guide">{hot ? "🎮 你的创意将出现在游戏中…" : "🎮 这片大陆会回应你的声音"}</div>
        <div className="input-row">
          {canType ? (
            <input value={chatVal} onChange={(e) => setChatVal(e.target.value)}
              onFocus={() => setInputFocus(true)} onBlur={() => setInputFocus(false)}
              placeholder="说点什么…和主播一起创造世界"
              onKeyDown={(e) => e.key === "Enter" && onSend()} />
          ) : (
            <div className="input-fake">说点什么…</div>
          )}
          <div className="input-send" onClick={canType ? onSend : undefined}>➤</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  VIEWER_AVATARS: ["🦊", "🐱", "🤖", "👻", "🌙", "🦉"],
  VIEWER_HEX: [
    { id: "c",  x: 0,  y: 0,  type: "hero",  icon: "🧑‍🚀" },
    { id: "n",  x: 0,  y: -1, type: "done",  icon: "🏥" },
    { id: "ne", x: 1,  y: -1, type: "tile",  icon: "❔" },
    { id: "se", x: 1,  y: 0,  type: "tile",  icon: "❔" },
    { id: "s",  x: 0,  y: 1,  type: "tile",  icon: "❔", spawn: true },
    { id: "w",  x: -1, y: 0,  type: "done",  icon: "📦" },
    { id: "nw", x: -1, y: -1, type: "fog" },
    { id: "ee", x: 2,  y: 0,  type: "fog" },
    { id: "nn", x: 0,  y: -2, type: "fog" },
    { id: "ss", x: 0,  y: 2,  type: "fog" },
  ],
  EnterPage, HexWatch, NightWatch, DestWatch, SelfNotif, SettleWatch, ShareView, ViewerChat,
});
