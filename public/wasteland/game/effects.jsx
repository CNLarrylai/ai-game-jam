/* ============================================================
   effects.jsx — overlays: banner, toast, story, decision,
   phase transition, spawn fx, call-to-action, confirm, share
   ============================================================ */
const { useState: useStateFx, useEffect: useEffectFx, useRef: useRefFx } = React;

/* ---- Broadcast banner (公屏全场通知) ---- */
function BroadcastBanner({ banner }) {
  if (!banner) return null;
  return (
    <div className="banner-layer">
      <div className={"banner " + (banner.big ? "big" : "")} key={banner.id}>
        <span className="b-icon">{banner.icon || "✨"}</span>
        <span className="b-text" dangerouslySetInnerHTML={{ __html: banner.html }} />
      </div>
    </div>
  );
}

/* ---- Call to action (征集创意) banner ---- */
function CallToAction({ cta }) {
  if (!cta) return null;
  return (
    <div className="banner-layer" style={{ top: "100px" }}>
      <div className="banner big" style={{
        background: "linear-gradient(90deg, rgba(255,207,63,.96), rgba(53,224,208,.85))",
        borderColor: "#fff7d6", animation: "none", maxWidth: "92%",
      }}>
        <span className="b-icon">📢</span>
        <div style={{ flex: 1 }}>
          <div className="b-text" style={{ marginBottom: 8 }}>
            <b>主播正在征集创意！</b> {cta.prompt}
          </div>
          <div className="countdown"><div className="cd-fill" style={{ animationDuration: "8s" }} /></div>
        </div>
      </div>
    </div>
  );
}

/* ---- Item toast ---- */
function ItemToast({ toasts }) {
  return (
    <div className="toast-layer">
      {toasts.map((t) => (
        <div key={t.id} className={"toast " + (t.lose ? "lose" : "")}>
          <div className="t-icon">{window.PixIcon ? <window.PixIcon token={t.icon} size={34} /> : t.icon}</div>
          <div className="t-text">{t.lose ? "失去：" : "🎒 获得："}<b>{t.name}</b></div>
        </div>
      ))}
    </div>
  );
}

/* ---- Spawn fx (light convergence ripple) ---- */
function SpawnFx({ fx }) {
  if (!fx) return null;
  return (
    <div className="spawn-fx" style={{ left: fx.x, top: fx.y }}>
      <div className="ring" /><div className="ring" /><div className="ring" />
      <div className="core" />
    </div>
  );
}

/* ---- by @user floating tag ---- */
function ByTag({ tag }) {
  if (!tag) return null;
  return <div className="by-tag" style={{ left: tag.x, top: tag.y }}>by {tag.user}</div>;
}

/* ---- Phase transition ---- */
function PhaseTransition({ phase }) {
  if (!phase) return null;
  return (
    <div className="phase-wipe" key={phase.id}>
      <div className="pw-big">{phase.big}</div>
      {phase.sub && <div className="pw-sub">{phase.sub}</div>}
    </div>
  );
}

/* ---- Story card with typewriter ---- */
function StoryCard({ story, onContinue }) {
  const [shown, setShown] = useStateFx("");
  const [done, setDone] = useStateFx(false);
  useEffectFx(() => {
    if (!story) return;
    setShown(""); setDone(false);
    let i = 0;
    const full = story.text;
    const t = setInterval(() => {
      i++;
      setShown(full.slice(0, i));
      if (i >= full.length) { clearInterval(t); setDone(true); }
    }, 45);
    return () => clearInterval(t);
  }, [story]);

  if (!story) return null;
  return (
    <div className="story">
      <div className="s-illus">
        <div className="glowbg" />
        <span style={{ position: "relative" }}>{story.illus}</span>
      </div>
      <div className="s-text">
        {shown}{!done && <span className="caret">▋</span>}
      </div>
      {done && story.source && <div className="s-source">📝 灵感来源：{story.source}</div>}
      {done && (
        <button className="btn primary s-cont" onClick={onContinue}>继续 ▸</button>
      )}
    </div>
  );
}

/* ---- Decision card (unified bottom style, optional votes) ---- */
function DecisionCard({ decision, onChoose, onContinue }) {
  if (!decision) return null;
  const { icon, title, desc, options, votes, result } = decision;
  let maxVotes = -1;
  if (votes) options.forEach((o) => { if ((votes[o.id] || 0) > maxVotes) maxVotes = votes[o.id] || 0; });
  const totalVotes = votes ? Object.values(votes).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="decision">
      <div className="d-card">
        <div className="d-head">
          {icon && <span className="d-icon">{icon}</span>}
          <span className="d-title">{title}</span>
        </div>
        {desc && <div className="d-desc">{desc}</div>}

        {result ? (
          <div>
            <div className="result-line">{result}</div>
            <div style={{ marginTop: 18 }}>
              <button className="btn primary" onClick={onContinue}>继续 ▸</button>
            </div>
          </div>
        ) : (
          <div className="d-opts">
            {options.map((o) => {
              const v = votes ? (votes[o.id] || 0) : 0;
              const leading = votes && v === maxVotes && maxVotes > 0;
              const pct = totalVotes ? Math.round((v / totalVotes) * 100) : 0;
              return (
                <div key={o.id} className={"opt " + (leading ? "leading" : "")}>
                  <button className="btn opt-btn" onClick={() => onChoose(o)}>
                    <span className="opt-main">{o.icon} {o.label}</span>
                    {o.sub && <span className="opt-sub">{o.sub}</span>}
                  </button>
                  {votes && (
                    <div className="vote-bar">
                      <div className="vfill" style={{ width: pct + "%" }} />
                      <span className="vtxt">{v} 票</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Confirm modal (destination) ---- */
function ConfirmModal({ confirm, onGo, onBack }) {
  if (!confirm) return null;
  return (
    <div className="confirm">
      <div className="cf-box">
        <div className="cf-title">{confirm.icon} 前往 {confirm.name}？</div>
        <div className="cf-desc">
          {confirm.confirm}<br /><br />
          预计消耗 <span className="cf-cost">{confirm.ap} 行动点</span>
        </div>
        <div className="cf-btns">
          <button className="btn ghost" onClick={onBack}>返回</button>
          <button className="btn primary" onClick={onGo}>出发 →</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  BroadcastBanner, CallToAction, ItemToast, SpawnFx, ByTag,
  PhaseTransition, StoryCard, DecisionCard, ConfirmModal,
});
