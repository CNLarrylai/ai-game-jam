/* ============================================================
   chrome.jsx — StatusBar（4 资源 + 栖身）+ CommentFeed
   ============================================================ */
const { useRef, useEffect } = React;

/* 隐蔽是"越高越安全"，其余三项越高越好；低位都用 .low 闪红预警 */
const STAT_META = [
  { key: "life",    name: "生命", icon: "❤️" },
  { key: "supply",  name: "补给", icon: "🎒" },
  { key: "sanity",  name: "理智", icon: "🧠" },
  { key: "conceal", name: "隐蔽", icon: "🌫️" },
];

function StatusBar({ day, maxDay, stats, pack, floats, flashSlot, dwelling }) {
  return (
    <div className="topbar">
      <div className="day-block">
        <div className="day-label">DAY {day} / {maxDay}</div>
        <div className="day-dots">
          {Array.from({ length: maxDay }).map((_, i) => {
            const n = i + 1;
            const cls = n < day ? "done" : n === day ? "cur" : "";
            return <div key={i} className={"day-dot " + cls} />;
          })}
        </div>
        {dwelling && (
          <div className="dwelling-chip">
            <span>{dwelling.icon} 栖身 <b>{dwelling.name}</b></span>
            <span className="expo">暴露 {dwelling.exposure}</span>
          </div>
        )}
      </div>

      <div className="stats-block">
        {STAT_META.map((m) => {
          const v = stats[m.key];
          const pct = Math.max(0, Math.min(100, v));
          const myFloats = floats.filter((f) => f.stat === m.key);
          return (
            <div key={m.key} className={"stat " + m.key + (v <= 20 ? " low" : "")}>
              <div className="stat-top">
                <span className="stat-name">{m.icon} {m.name}</span>
                <span className="stat-val">{Math.round(v)}</span>
              </div>
              <div className="bar"><div className="fill" style={{ width: pct + "%" }} /></div>
              {myFloats.map((f) => (
                <span key={f.id} className={"float-num " + (f.delta >= 0 ? "up" : "down")}>
                  {f.delta >= 0 ? "+" + f.delta : f.delta}
                </span>
              ))}
            </div>
          );
        })}
      </div>

      <div className="pack-block">
        <div className="pack-label">行囊 {pack.length}/6</div>
        <div className="pack-grid">
          {Array.from({ length: 6 }).map((_, i) => {
            const it = pack[i];
            return (
              <div key={i}
                className={"pack-slot " + (it ? "filled " : "") + (flashSlot === i ? "flash" : "")}>
                {it ? it.icon : ""}
                {it && it.qty > 1 ? <span className="qty">{it.qty}</span> : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CommentFeed({ comments, viewers, inputHot, chatBanner }) {
  const listRef = useRef(null);
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [comments]);

  return (
    <div className="chat-col">
      <div className="chat-head">
        <div className="streamer-av">📡</div>
        <div className="streamer-meta">
          <div className="streamer-name">沃金幸存者 · 直播 <span className="live-tag">LIVE</span></div>
          <div className="viewers">👁 <b>{viewers.toLocaleString()}</b> 观看 · ❤️ 18.9k</div>
        </div>
      </div>

      {chatBanner && (
        <div className={"chat-banner " + chatBanner.type}>{chatBanner.text}</div>
      )}

      <div className="chat-list" ref={listRef}>
        {comments.map((c) => (
          <div key={c.id}
            className={"cmt " + (c.mod ? "mod " : "") + (c.gift ? "gift " : "") +
              (c.adopted ? "adopted " : "") + (c.system ? "system " : "") +
              (c.merged ? "merged " : "") + (c.flash ? "flash" : "")}>
            <div className="c-av">{c.av}</div>
            <div className="c-body">
              <div className="c-name">{c.user}
                {c.dup > 1 && <span className="dup-badge">×{c.dup}</span>}
              </div>
              <div className="c-text">{c.text}</div>
              {c.adopted && <div className="adopt-tag">✓ 已融入这场逃亡</div>}
              {c.merged && <div className="merge-tag">🔁 重复刷屏已合并 · 不计入采纳</div>}
            </div>
          </div>
        ))}
      </div>

      <div className={"chat-input " + (inputHot ? "hot" : "")}>
        <div className="chat-guide">📡 这片末日大陆会回应你的声音</div>
        <div className="input-row">
          <div className="input-fake">
            {inputHot ? "📡 你的创意将出现在游戏中…" : "说点什么…"}
          </div>
          <div className="input-send">➤</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { StatusBar, CommentFeed });
