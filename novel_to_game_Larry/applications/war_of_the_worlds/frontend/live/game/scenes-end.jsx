/* ============================================================
   scenes-end.jsx — 失败 / 通关 / 结算 / 分享
   自包含样式（通用 .btn / .pixel-box + 内联），不依赖未定义类名。
   ============================================================ */

const overlayStyle = {
  position: "absolute", inset: 0, zIndex: 120, display: "flex",
  alignItems: "center", justifyContent: "center", padding: 40,
  background: "radial-gradient(900px 600px at 50% 30%, rgba(40,15,10,.92), rgba(8,6,4,.97))",
};

function EndingFail({ days, onSettle, onReplay }) {
  return (
    <div style={overlayStyle}>
      <div className="pixel-box" style={{ maxWidth: 720, width: "100%", padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 72, marginBottom: 10 }}>💀</div>
        <div style={{ fontFamily: "var(--pixel)", fontSize: 26, color: "var(--red)", marginBottom: 16 }}>
          你倒在了第 {days} 天
        </div>
        <div style={{ fontSize: "var(--t-md)", color: "var(--txt-dim)", lineHeight: 1.8, marginBottom: 28 }}>
          末日里，死亡廉价而随意——这正是这个故事的真相。<br />
          热射线、黑烟、崩溃的神经，或只是被看见的一瞬。<br />
          你没能等到火星人自己倒下的那天。
        </div>
        <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
          <button className="btn gold" onClick={onReplay}>↻ 再逃一次</button>
          <button className="btn" onClick={onSettle}>查看本场结算 →</button>
        </div>
      </div>
    </div>
  );
}

function EndingWin({ days, explored, items, onSettle, onShare }) {
  return (
    <div style={{ ...overlayStyle,
      background: "radial-gradient(900px 600px at 50% 30%, rgba(20,40,30,.92), rgba(6,8,6,.97))" }}>
      <div className="pixel-box" style={{ maxWidth: 760, width: "100%", padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 72, marginBottom: 10 }}>🦠</div>
        <div style={{ fontFamily: "var(--pixel)", fontSize: 24, color: "var(--green)", marginBottom: 16 }}>
          你活了下来 · 第 {days} 天
        </div>
        <div style={{ fontSize: "var(--t-md)", color: "var(--txt-dim)", lineHeight: 1.8, marginBottom: 24 }}>
          清晨，三脚机器人沉默地伫立着，再也没有动。<br />
          征服了地球军队的火星人，败给了最卑微的地球细菌——<br />
          「在万物的秩序里，它们早已被注定。」你穿过红草，走向莱瑟黑德的方向。
        </div>
        <div style={{ display: "flex", gap: 22, justifyContent: "center", marginBottom: 28,
          fontFamily: "var(--pixel)", fontSize: "var(--t-xs)", color: "var(--gold)" }}>
          <span>探索 {explored} 处</span><span>·</span><span>携回 {items} 件物资</span>
        </div>
        <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
          <button className="btn gold" onClick={onSettle}>本场结算 →</button>
          <button className="btn" onClick={onShare}>📤 分享战报</button>
        </div>
      </div>
    </div>
  );
}

function Settlement({ outcome, days, onShare, onReplay }) {
  const timeline = window.TIMELINE || [];
  const board = window.LEADERBOARD || [];
  const stats = window.GLOBAL_STATS || [];
  return (
    <div style={{ ...overlayStyle, alignItems: "stretch", padding: 0,
      background: "linear-gradient(180deg, #12100a, #0a0805)" }}>
      <div style={{ width: "100%", overflowY: "auto", padding: "40px 48px" }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ fontFamily: "var(--pixel)", fontSize: 28, color: "var(--gold)", marginBottom: 8 }}>
            📜 本场逃亡 · 结算
          </div>
          <div style={{ color: "var(--txt-dim)", fontSize: "var(--t-sm)" }}>
            《世界大战》互动直播 — 一场观众共同书写的生存
          </div>
        </div>

        {/* 全局数据 */}
        <div style={{ display: "flex", gap: 18, justifyContent: "center", marginBottom: 34, flexWrap: "wrap" }}>
          {stats.map((s, i) => (
            <div key={i} className="pixel-box" style={{ padding: "18px 26px", textAlign: "center", minWidth: 200 }}>
              <div style={{ fontFamily: "var(--pixel)", fontSize: 24, color: "var(--cyan)" }}>{s.v}</div>
              <div style={{ fontSize: "var(--t-xs)", color: "var(--txt-dim)", marginTop: 8, whiteSpace: "pre-line" }}>{s.k}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 26, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* 时间线 */}
          <div className="pixel-box" style={{ flex: 1, minWidth: 360, padding: 24 }}>
            <div style={{ fontFamily: "var(--pixel)", fontSize: 15, color: "var(--magenta)", marginBottom: 18 }}>
              🕰️ 七日逃亡线
            </div>
            {timeline.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 14, padding: "10px 0",
                borderBottom: "1px solid var(--line)" }}>
                <div style={{ fontFamily: "var(--pixel)", fontSize: "var(--t-xs)", color: "var(--gold)",
                  minWidth: 64 }}>{t.day}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "var(--t-sm)", color: "var(--txt)" }}>{t.evt}</div>
                  {t.src && <div style={{ fontSize: "var(--t-xs)", color: "var(--cyan)", marginTop: 4 }}>
                    💬 {t.src}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* 观众贡献榜 */}
          <div className="pixel-box" style={{ width: 420, padding: 24 }}>
            <div style={{ fontFamily: "var(--pixel)", fontSize: 15, color: "var(--cyan)", marginBottom: 18 }}>
              🏆 观众贡献榜
            </div>
            {board.map((b, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "12px 0",
                borderBottom: "1px solid var(--line)" }}>
                <div style={{ fontSize: 28 }}>{b.medal}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "var(--t-sm)", color: "var(--txt)" }}>
                    {b.av} {b.name} <span style={{ color: "var(--txt-faint)" }}>· {b.title}</span></div>
                  <div style={{ fontSize: "var(--t-xs)", color: "var(--gold)", margin: "3px 0" }}>{b.count}</div>
                  <div style={{ fontSize: "var(--t-xs)", color: "var(--txt-dim)", lineHeight: 1.5 }}>{b.detail}</div>
                  {b.shot && <div style={{ fontSize: "var(--t-xs)", color: "var(--cyan)", marginTop: 3 }}>{b.shot}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 34 }}>
          <button className="btn gold" onClick={onShare}>📤 分享战报</button>
          <button className="btn" onClick={onReplay}>↻ 再逃一次</button>
        </div>
      </div>
    </div>
  );
}

function ShareCard({ onClose }) {
  const recap = window.WIN_RECAP || [];
  return (
    <div style={{ ...overlayStyle, zIndex: 140 }}>
      <div className="pixel-box" style={{ maxWidth: 560, width: "100%", padding: 34, textAlign: "center",
        background: "linear-gradient(180deg, #1d1810, #110d07)" }}>
        <div style={{ fontFamily: "var(--pixel)", fontSize: 18, color: "var(--gold)", marginBottom: 6 }}>
          WORLDS LIVE
        </div>
        <div style={{ fontSize: "var(--t-sm)", color: "var(--txt-dim)", marginBottom: 22 }}>
          我在火星入侵中活了下来 · 这是观众替我写的逃亡
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          {recap.map((r, i) => (
            <div key={i} style={{ background: "var(--bg-deep)", border: "2px solid var(--line)",
              padding: 14 }}>
              <div style={{ fontSize: 32 }}>{r.icon}</div>
              <div style={{ fontSize: "var(--t-xs)", color: "var(--txt)", marginTop: 6 }}>{r.cap}</div>
              <div style={{ fontSize: "var(--t-micro)", color: "var(--cyan)", marginTop: 4 }}>{r.src}</div>
            </div>
          ))}
        </div>
        <button className="btn gold" onClick={onClose}>关闭</button>
      </div>
    </div>
  );
}

Object.assign(window, { EndingFail, EndingWin, Settlement, ShareCard });
