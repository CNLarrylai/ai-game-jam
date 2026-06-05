/* ============================================================
   scenes-home.jsx — 家中 interactive room + 整理资源 panel
   ============================================================ */
const { useState: useStateH, useEffect: useEffectH } = React;

/* ---------- shared pixel shelter backdrop ---------- */
function ShelterBg({ children }) {
  return (
    <div className="shelter">
      <div className="wall-grid" />
      <div className="floor-grid" />
      <div className="lamp" />
      {children}
    </div>
  );
}

/* ---------- reusable hotspot ---------- */
function Hotspot({ style, label, badge, onClick, variant, children }) {
  return (
    <div className={"hotspot " + (variant || "")} style={style} onClick={onClick}>
      <div className="hot-ring" />
      {badge && <div className="hot-badge">{badge}</div>}
      {children}
      <div className="hot-label">{label}</div>
    </div>
  );
}

/* ============================================================
   家中 — interactive room (player clicks objects)
   ============================================================ */
function SceneHome({ D, flags, companions }) {
  const [hint, setHint] = useStateH(true);
  useEffectH(() => { const t = setTimeout(() => setHint(false), 4200); return () => clearTimeout(t); }, []);

  /* click the door -> the knock event (player-initiated) */
  const openDoor = () => {
    if (flags.knock) { D.toast({ icon: "🚪", name: "门外已经安静了", lose: true }); return; }
    D.adoptComment({ user: "椰奶", av: "🥥", text: "敲门的会不会是同伴回来了？让它有用！" });
    D.spawn({ x: 185, y: 420 });
    D.byTag({ x: 120, y: 300, user: "@椰奶" });
    setTimeout(() => D.decision({
      id: "knock", icon: "🚪", title: "有人在敲门",
      desc: "门外传来三下沉闷的敲击。透过门缝，只能看到一个佝偻的轮廓。它不说话，只是敲。",
      options: [
        { id: "open", label: "开门", icon: "🚪", sub: "可能是同伴，也可能是威胁" },
        { id: "silent", label: "沉默", icon: "🤫", sub: "屏住呼吸，等它离开" },
        { id: "peek", label: "偷看", icon: "👁️", sub: "从门缝观察来者" },
      ],
      onChoose: (opt) => {
        if (opt.id === "open") {
          D.applyStats({ hp: -10, supply: 8 });
          return "你拉开门栓——是浑身是伤的幸存者「凛」。她递来一包零件，也带进了寒风。HP -10，队伍多了一名机械师。";
        }
        if (opt.id === "silent") {
          D.applyStats({ sanity: -12 });
          return "敲门声持续了很久才停。你蜷在角落，听着脚步远去。理智 -12——你永远不会知道门外是谁。";
        }
        D.applyStats({ sanity: -5, hunger: 3 });
        return "门缝里，那是只觅食的流浪犬，叼着半块压缩饼干。你悄悄换来了食物。饱腹 +3。";
      },
      onContinue: () => { D.setFlag("knock", true); D.closeDecision(); },
    }), 700);
  };

  /* talk to a companion — skill differs by role */
  const talk = (c) => {
    D.decision({
      id: "talk_" + c.id, icon: c.av, title: c.name + " · " + c.role,
      desc: c.detail,
      options: [
        { id: "skill", label: c.skill.label, icon: c.skill.icon, sub: c.skill.note },
        { id: "ask", label: "询问状态", icon: "💬", sub: "了解她的情况" },
        { id: "leave", label: "结束对话", icon: "👋", sub: "" },
      ],
      onChoose: (opt) => {
        if (opt.id === "skill") {
          const key = "skill_" + c.id;
          if (flags[key]) return c.name + "今天的「" + c.skill.label + "」已经用过了，明天再来。（每天仅一次）";
          D.applyStats(c.skill.effect); D.setFlag(key, true);
          return c.skill.line + "（每天仅一次）";
        }
        if (opt.id === "ask") return c.ask + "——" + c.name;
        return "你拍了拍她的肩，转身回到自己的角落。";
      },
      onContinue: () => D.closeDecision(),
    });
  };

  return (
    <div className="scene">
      <div className="scene-title-chip">🏠 家中 · Day {D.day} · 点击物体互动</div>
      <ShelterBg>
        {/* door — event hotspot */}
        <Hotspot variant="gold" label={flags.knock ? "🚪 门口（已查看）" : "🚪 查看门口"}
          badge={flags.knock ? null : "!"} onClick={openDoor}
          style={{ left: "7%", top: "26%", width: 150, height: 300 }}>
          <div style={{ width: "100%", height: "100%", background: "#0e0a1c",
            border: "4px solid #3a2f1a", boxShadow: "inset 0 0 0 3px #251c10",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56 }}>
            🚪
            <div style={{ position: "absolute", right: 18, top: "50%", width: 14, height: 14,
              background: "var(--gold)", borderRadius: "50%" }} />
          </div>
        </Hotspot>

        {/* hero (not interactive) */}
        <div className="char-sprite hero bob" style={{ left: "40%", top: 360 }}>
          <div className="body">🧑‍🚀</div>
          <div className="shadow" />
          <div className="name-tag">阿陈 · 主角</div>
        </div>

        {/* companion 1 — talk hotspot */}
        <Hotspot variant="magenta" label="💬 和 凛 对话" onClick={() => talk(companions[0])}
          style={{ left: "58%", top: 400 }}>
          <div className="char-sprite" style={{ position: "static" }}>
            <div className="body" style={{ fontSize: 44, borderColor: "var(--magenta)",
              boxShadow: "0 0 18px rgba(255,77,141,.4)" }}>👩‍🔧</div>
            <div className="shadow" />
            <div className="name-tag">凛 · 机械师</div>
          </div>
        </Hotspot>

        {/* companion 2 — army medic */}
        <Hotspot label="💬 和 老K 对话" onClick={() => talk(companions[1])}
          style={{ left: "24%", top: 560 }}>
          <div className="char-sprite" style={{ position: "static" }}>
            <div className="body" style={{ fontSize: 44, borderColor: "var(--green)",
              boxShadow: "0 0 18px rgba(87,224,138,.35)" }}>🧓</div>
            <div className="shadow" />
            <div className="name-tag">老K · 军医</div>
          </div>
        </Hotspot>

        {/* supplies — open inventory */}
        <Hotspot label="📦 整理物资" onClick={() => D.goScene("organize")}
          style={{ left: "69%", top: 560, width: 190, height: 120 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-end", height: "100%" }}>
            <div style={{ width: 100, height: 90, background: "#3a2f1a", border: "3px solid #5a4a26",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42 }}>📦</div>
            <div style={{ width: 80, height: 68, background: "#2a2350", border: "3px solid var(--purple)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34 }}>🥫</div>
          </div>
        </Hotspot>
      </ShelterBg>

      {hint && <div className="room-hint">👆 点击发光的物体进行互动 · 准备好后点右下角「准备出门」</div>}

      <div className="go-out-btn">
        <button className="btn gold" onClick={() => D.goOut()}>🌄 准备出门 →</button>
      </div>
    </div>
  );
}

/* ============================================================
   整理资源
   ============================================================ */
function SceneOrganize({ D, pack, companions }) {
  const [preview, setPreview] = useStateH(null);
  const [detail, setDetail] = useStateH(null);

  const useItem = (it) => {
    D.applyStats(it.effect);
    D.removeItem(it.id, 1);
    D.toast({ icon: it.icon, name: it.name + " ×1", lose: true });
  };

  return (
    <div className="scene">
      <div className="scene-title-chip">🏠 家中 · 整理资源</div>
      <ShelterBg />

      <div style={{ position: "absolute", left: 36, top: 70, zIndex: 50 }}>
        <button className="btn sm" onClick={() => D.goScene("home")}>← 返回房间</button>
      </div>

      <div style={{ position: "absolute", inset: "120px 40px 110px", display: "flex", gap: 26 }}>
        {/* resources panel */}
        <div className="pixel-box" style={{ flex: 1, padding: 22, display: "flex",
          flexDirection: "column", minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
            marginBottom: 14 }}>
            <span style={{ fontFamily: "var(--pixel)", fontSize: 15, color: "var(--cyan)",
              letterSpacing: 1 }}>📦 物资清单</span>
            <span style={{ fontSize: "var(--t-xs)", color: "var(--txt-faint)" }}>
              消耗品可「使用」· 工具被动生效 · 材料按需消耗</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
            {pack.map((it) => {
              const consume = it.kind === "consume";
              const effColor = consume ? "var(--txt-dim)"
                : it.kind === "tool" ? "var(--green)" : "var(--txt-faint)";
              const bdr = consume ? "var(--purple)" : it.kind === "tool" ? "var(--green)" : "var(--line)";
              return (
                <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 14,
                  padding: "12px 14px", background: "var(--bg-deep)", border: "2px solid var(--line)",
                  position: "relative" }}>
                  <div style={{ width: 52, height: 52, background: "var(--bg-raised)",
                    border: "2px solid " + bdr, display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 26 }}>{it.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "var(--t-md)", color: "#fff" }}>{it.name} ×{it.qty}</div>
                    <div style={{ fontSize: "var(--t-xs)", color: effColor }}>{it.effText}</div>
                  </div>
                  {consume ? (
                    <React.Fragment>
                      {preview && preview.id === it.id && (
                        <div style={{ position: "absolute", right: 110, top: 12, background: "var(--green)",
                          color: "#06250f", padding: "5px 11px", fontSize: "var(--t-xs)",
                          border: "2px solid #2fae5e", animation: "floatUp 1.4s ease-out forwards" }}>
                          {it.effText}
                        </div>
                      )}
                      <button className="btn sm primary"
                        onMouseEnter={() => setPreview({ id: it.id })}
                        onMouseLeave={() => setPreview(null)}
                        onClick={() => { useItem(it); setPreview(null); }}>使用</button>
                    </React.Fragment>
                  ) : it.kind === "tool" ? (
                    <span style={{ fontSize: "var(--t-xs)", color: "var(--green)",
                      border: "2px solid var(--green)", padding: "6px 10px", whiteSpace: "nowrap" }}>
                      ✓ 已生效</span>
                  ) : (
                    <span style={{ fontSize: "var(--t-xs)", color: "var(--txt-faint)",
                      border: "2px solid var(--line)", padding: "6px 10px", whiteSpace: "nowrap" }}>
                      🔧 材料</span>
                  )}
                </div>
              );
            })}
            {pack.length === 0 && (
              <div style={{ color: "var(--txt-faint)", fontSize: "var(--t-sm)", padding: 20 }}>
                背包空空如也。
              </div>
            )}
          </div>
        </div>

        {/* companions panel */}
        <div className="pixel-box" style={{ width: 440, padding: 22, display: "flex",
          flexDirection: "column" }}>
          <div style={{ fontFamily: "var(--pixel)", fontSize: 15, color: "var(--magenta)",
            marginBottom: 18, letterSpacing: 1 }}>🤝 同伴</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {companions.map((c) => (
              <div key={c.id} onClick={() => setDetail(detail && detail.id === c.id ? null : c)}
                style={{ display: "flex", gap: 14, padding: 14, background: "var(--bg-deep)",
                border: "2px solid " + (detail && detail.id === c.id ? "var(--magenta)" : "var(--line)"),
                cursor: "pointer", alignItems: "center" }}>
                <div style={{ width: 58, height: 58, background: "var(--bg-raised)",
                  border: "2px solid var(--magenta)", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 30 }}>{c.av}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "var(--t-md)", color: "#fff" }}>{c.name}
                    <span style={{ fontSize: "var(--t-xs)", color: "var(--txt-dim)", marginLeft: 8 }}>
                      {c.role}</span></div>
                  <div style={{ fontSize: "var(--t-xs)", marginTop: 5,
                    color: c.status === "健康" ? "var(--green)" : "var(--orange)" }}>
                    {c.status} · {c.mood}</div>
                </div>
                <span style={{ color: "var(--txt-faint)", fontSize: "var(--t-md)" }}>
                  {detail && detail.id === c.id ? "▾" : "›"}</span>
              </div>
            ))}
          </div>
          {detail && (
            <div style={{ marginTop: 16, padding: 16, background: "var(--bg-deep)",
              border: "2px solid var(--magenta)" }}>
              <div style={{ fontSize: "var(--t-md)", color: "var(--magenta)", marginBottom: 8 }}>
                {detail.av} {detail.name}</div>
              <div style={{ fontSize: "var(--t-sm)", color: "var(--txt-dim)", lineHeight: 1.6,
                marginBottom: 10 }}>{detail.detail}</div>
              <div style={{ fontSize: "var(--t-xs)", color: "var(--txt-faint)" }}>
                状态 HP {detail.hp} · {detail.mood}</div>
            </div>
          )}
        </div>
      </div>

      <div className="go-out-btn">
        <button className="btn gold" onClick={() => D.goOut()}>🌄 准备出门 →</button>
      </div>
    </div>
  );
}

Object.assign(window, { ShelterBg, Hotspot, SceneHome, SceneOrganize });
