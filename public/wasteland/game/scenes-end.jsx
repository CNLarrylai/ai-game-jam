/* ============================================================
   scenes-end.jsx — GAME OVER / SURVIVED / Settlement / Share
   ============================================================ */
const { useState: useStateE, useEffect: useEffectE } = React;

function useTypewriter(text, speed, on) {
  const [out, setOut] = useStateE("");
  useEffectE(() => {
    if (!on) { setOut(text); return; }
    setOut(""); let i = 0;
    const t = setInterval(() => { i++; setOut(text.slice(0, i)); if (i >= text.length) clearInterval(t); }, speed);
    return () => clearInterval(t);
  }, [text, on]);
  return out;
}

/* ---------- GAME OVER ---------- */
function EndingFail({ days, onSettle, onReplay }) {
  const death = useTypewriter("Day " + days + " 的暴风雪耗尽了最后的物资，理智在白噪声里一点点溶解……", 42, true);
  return (
    <div className="ending fail">
      <div className="noise" />
      <div className="end-card">
        <div className="e-title">💀 GAME OVER<br />文明的最后一丝火光熄灭了</div>
        <div className="e-days">你存活了 {days} 天</div>
        <div className="e-death">{death}<span className="caret" style={{ color: "var(--red)" }}>▋</span></div>
        <div className="e-replay">
          <button className="btn ghost" onClick={onSettle}>查看结算</button>
          <button className="btn magenta" onClick={onReplay}>再来一局</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- SURVIVED ---------- */
function EndingWin({ days, explored, items, onSettle, onShare }) {
  const particles = Array.from({ length: 28 }).map((_, i) => {
    const ang = (i / 28) * Math.PI * 2, r = 420 + (i % 5) * 40;
    return { tx: Math.cos(ang) * -r + "px", ty: Math.sin(ang) * -r + "px",
      left: 50 + Math.cos(ang) * 38 + "%", top: 50 + Math.sin(ang) * 38 + "%",
      delay: (i % 7) * 0.18 + "s" };
  });
  return (
    <div className="ending win">
      <div className="particles">
        {particles.map((p, i) => (
          <i key={i} style={{ left: p.left, top: p.top, "--tx": p.tx, "--ty": p.ty,
            animationDelay: p.delay }} />
        ))}
      </div>
      <div className="end-card">
        <div className="e-title">🏆 SURVIVED<br />你带领人类看到了新的黎明</div>
        <div className="e-stats">
          <div className="e-stat"><span className="v">{days}</span><span className="k">存活天数</span></div>
          <div className="e-stat"><span className="v">{explored}</span><span className="k">探索格数</span></div>
          <div className="e-stat"><span className="v">{items}</span><span className="k">收集物品</span></div>
        </div>
        <div style={{ fontSize: "var(--t-md)", color: "var(--txt-dim)", marginBottom: 18 }}>关键剧情回放</div>
        <div className="recap-row">
          {window.WIN_RECAP.map((r, i) => (
            <div key={i} className="recap">
              <div className="r-thumb">{r.icon}</div>
              <div className="r-cap">{r.cap}</div>
              <div className="r-src">{r.src}</div>
            </div>
          ))}
        </div>
        <div className="e-replay">
          <button className="btn ghost" onClick={onSettle}>查看结算</button>
          <button className="btn gold" onClick={onShare}>分享战绩</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Settlement ---------- */
function Settlement({ outcome, days, onShare, onReplay }) {
  return (
    <div className="settle">
      <div className="settle-inner">
        <h1>{outcome === "win" ? "🏆 通关结算" : "💀 本局结算"}</h1>
        <div className="sub">{outcome === "win" ? "你和 1,284 名观众一起，把这片大陆写成了故事。"
          : "火光虽灭，但这片大陆记住了每一个声音。"}</div>

        <section>
          <h2>旅程回顾</h2>
          <div className="timeline">
            {window.TIMELINE.slice(0, outcome === "win" ? 5 : days).map((it, i) => (
              <div key={i} className="tl-item">
                <div className="tl-day">{it.day}</div>
                <div className="tl-evt">{it.evt}</div>
                {it.src && <div className="tl-src">💬 灵感来源 · {it.src}</div>}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2>创意排行榜</h2>
          <div className="lb-grid">
            {window.LEADERBOARD.map((l, i) => (
              <div key={i} className="lb-card">
                <div className="lb-medal">{l.medal}</div>
                <div className="lb-body">
                  <div className="lb-title">{l.title}</div>
                  <div className="lb-user">
                    <div className="lb-av">{l.av}</div>
                    <span className="lb-name">{l.name}</span>
                    <span className="lb-count">{l.count}</span>
                  </div>
                  <div className="lb-detail">{l.detail}</div>
                  {l.shot && <div className="lb-shot">{l.shot}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2>全场统计</h2>
          <div className="stat-cards">
            {window.GLOBAL_STATS.map((s, i) => (
              <div key={i} className="stat-card">
                <div className="sc-v">{s.v}</div>
                <div className="sc-k">{s.k.split("\n").map((line, j) => <div key={j}>{line}</div>)}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="settle-foot">
          <button className="btn gold" onClick={onShare} style={{ marginRight: 14 }}>分享我的贡献</button>
          <button className="btn ghost" onClick={onReplay}>再来一局</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Personal share card ---------- */
function ShareCard({ onClose }) {
  return (
    <div className="share-card">
      <div className="share-inner">
        <div className="sh-head">🎮 我的参与卡片 · WASTELAND LIVE</div>
        <div className="sh-av">🕊️</div>
        <div className="sh-name">@纸鹤</div>
        <div className="sh-stats">
          <div className="sh-stat"><div className="v">5</div><div className="k">创意被采纳</div></div>
          <div className="sh-stat"><div className="v">🎨</div><div className="k">最强脑洞</div></div>
          <div className="sh-stat"><div className="v">#1</div><div className="k">影响力排名</div></div>
        </div>
        <div className="sh-quote">「那只机械狗能驯服吗」<br />→ 我创造了本局的 Boss：机械守卫</div>
        <button className="btn gold sh-close" onClick={onClose} style={{ width: "100%" }}>
          分享到 TikTok ↗</button>
        <button className="btn ghost sm" onClick={onClose} style={{ marginTop: 10, width: "100%" }}>关闭</button>
      </div>
    </div>
  );
}

Object.assign(window, { EndingFail, EndingWin, Settlement, ShareCard });
