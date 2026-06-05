/* ============================================================
   scenes-home.jsx — 栖身/营地（队友互动）+ 整理行囊
   同伴随 Day 更替：妻子(1-2) → 牧师(3-5) → 炮兵(6-7)
   ============================================================ */
const { useState: useStateH, useEffect: useEffectH } = React;

/* ---------- 半塌废宅 backdrop ---------- */
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

/* ---------- 可点击热点 ---------- */
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

/* 当前 Day 在场的同伴 */
function companionsToday(companions, day) {
  return companions.filter((c) => (c.present || []).includes(day));
}

/* ============================================================
   栖身/营地 — 点击同伴对话、点击外面的声响触发事件
   ============================================================ */
function SceneHome({ D, flags, companions }) {
  const [hint, setHint] = useStateH(true);
  const [spoke, setSpoke] = useStateH({});   // 每个同伴"听他说话"的次数 → 轮换 idle 台词
  useEffectH(() => { const t = setTimeout(() => setHint(false), 4600); return () => clearTimeout(t); }, []);

  const here = companionsToday(companions, D.day);

  /* 外面的声响 —— 玩家主动触发的隐蔽抉择 */
  const probeOutside = () => {
    if (flags.knock) { D.toast({ icon: "🌫️", name: "外面又恢复了死寂", lose: true }); return; }
    D.adoptComment({ user: "煤气灯下", av: "🕯️", text: "别出声！让那声音变成一次真正的考验" });
    D.spawn({ x: 185, y: 420 });
    D.byTag({ x: 120, y: 300, user: "@煤气灯下" });
    setTimeout(() => D.decision({
      id: "outside", icon: "🌫️", title: "外面有动静",
      desc: "墙缝外传来沉重的、金属摩擦地面的声音——很可能是一台正在巡过的三脚机器人。它还没有停下。",
      options: [
        { id: "freeze", label: "屏息不动", icon: "🤫", sub: "把自己钉死在阴影里" },
        { id: "peek",   label: "从缝里偷看", icon: "👁️", sub: "确认它的方向，但有暴露风险" },
        { id: "flee",   label: "趁机换个藏身处", icon: "🏃", sub: "移动=暴露，但也许更安全" },
      ],
      onChoose: (opt) => {
        if (opt.id === "freeze") {
          D.applyStats({ conceal: 6, sanity: -4 });
          return "你贴着冰冷的墙，连呼吸都收住。金属声渐渐远了。隐蔽 +6，但等待的每一秒都在磨损你。理智 -4。";
        }
        if (opt.id === "peek") {
          D.applyStats({ conceal: -8, sanity: 3 });
          return "你从砖缝里看见那百尺高的身影迈过街角——至少你知道了它的去向。隐蔽 -8，但掌握方向让你稍稍安心。理智 +3。";
        }
        D.applyStats({ conceal: -6, supply: -4, life: 4 });
        return "你抱起行囊，借着它转身的空档溜进另一间地窖。换了更深的藏身处，却也耗了脚力与口粮。隐蔽 -6，补给 -4，生命 +4。";
      },
      onContinue: () => { D.setFlag("knock", true); D.closeDecision(); },
    }), 700);
  };

  /* 和同伴对话 —— greeting 作开场白描，「听他说话」轮换 ask/idle 台词，技能带代价 */
  const talk = (c) => {
    // 台词池：先 ask（最能定调），再轮换 idle，循环不重样
    const lines = [c.ask, ...(c.idle || [])].filter(Boolean);
    D.decision({
      id: "talk_" + c.id, icon: c.av, title: c.name + " · " + c.role,
      desc: c.greeting || c.detail,
      options: [
        { id: "skill", label: c.skill.label, icon: c.skill.icon, sub: c.skill.note },
        { id: "ask",   label: "听他说话",   icon: "💬", sub: "了解他此刻的状态" },
        { id: "leave", label: "结束交谈",   icon: "👋", sub: "" },
      ],
      onChoose: (opt) => {
        if (opt.id === "skill") {
          const key = "skill_" + c.id;
          if (flags[key]) return c.name + "今天的「" + c.skill.label + "」已经做过了，明天再说。（每天仅一次）";
          D.applyStats(c.skill.effect); D.setFlag(key, true);
          return c.skill.line + "（每天仅一次）";
        }
        if (opt.id === "ask") {
          const n = spoke[c.id] || 0;
          setSpoke((s) => ({ ...s, [c.id]: n + 1 }));
          return lines.length ? lines[n % lines.length] : "他没有作声。";
        }
        return "你没有再说什么，回到自己的角落，听着外面的世界一寸寸沉默下去。";
      },
      onContinue: () => D.closeDecision(),
    });
  };

  /* 同伴在房间里的落点（最多 3 人） */
  const SLOTS = [
    { left: "58%", top: 400 }, { left: "24%", top: 560 }, { left: "70%", top: 600 },
  ];
  const SPRITE_COLOR = ["var(--magenta)", "var(--cyan)", "var(--gold)"];

  return (
    <div className="scene">
      <div className="scene-title-chip">🏚️ 栖身 · Day {D.day} · 点击同伴或墙缝互动</div>
      <ShelterBg>
        {/* 外面的声响 — 事件热点（墙缝/破窗） */}
        <Hotspot variant="gold" label={flags.knock ? "🌫️ 墙外（已查看）" : "🌫️ 探查墙外"}
          badge={flags.knock ? null : "!"} onClick={probeOutside}
          style={{ left: "7%", top: "26%", width: 150, height: 300 }}>
          <div style={{ width: "100%", height: "100%", background: "#0e0a06",
            border: "4px solid #3a2f1d", boxShadow: "inset 0 0 0 3px #1c1610",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52 }}>
            🪟
            <div style={{ position: "absolute", right: 16, top: "50%", width: 14, height: 14,
              background: "var(--gold)", borderRadius: "50%" }} />
          </div>
        </Hotspot>

        {/* 主角（不可交互） */}
        <div className="char-sprite hero bob" style={{ left: "40%", top: 360 }}>
          <div className="body">🧍🏻</div>
          <div className="shadow" />
          <div className="name-tag">叙述者 · 你</div>
        </div>

        {/* 当日在场的同伴 */}
        {here.map((c, i) => (
          <Hotspot key={c.id} variant={i === 0 ? "magenta" : ""}
            label={"💬 和 " + c.name + " 对话"} onClick={() => talk(c)}
            style={SLOTS[i] || SLOTS[0]}>
            <div className="char-sprite" style={{ position: "static" }}>
              <div className="body" style={{ fontSize: 44, borderColor: SPRITE_COLOR[i],
                boxShadow: "0 0 18px rgba(200,53,42,.35)" }}>{c.av}</div>
              <div className="shadow" />
              <div className="name-tag">{c.name} · {c.role.slice(0, 4)}</div>
            </div>
          </Hotspot>
        ))}

        {/* 行囊 — 打开整理 */}
        <Hotspot label="🎒 整理行囊" onClick={() => D.goScene("organize")}
          style={{ left: "69%", top: 560, width: 190, height: 120 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-end", height: "100%" }}>
            <div style={{ width: 96, height: 88, background: "#2a2114", border: "3px solid #4a3c22",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>🎒</div>
            <div style={{ width: 76, height: 64, background: "#1c1610", border: "3px solid var(--gold-deep)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>🥫</div>
          </div>
        </Hotspot>
      </ShelterBg>

      {hint && <div className="room-hint">👆 点击发光的同伴/墙缝互动 · 准备好后点右下角「出发逃亡」</div>}

      <div className="go-out-btn">
        <button className="btn gold" onClick={() => D.goOut()}>🌄 出发逃亡 →</button>
      </div>
    </div>
  );
}

/* ============================================================
   整理行囊
   ============================================================ */
function SceneOrganize({ D, pack, companions }) {
  const [preview, setPreview] = useStateH(null);
  const [detail, setDetail] = useStateH(null);
  const here = companionsToday(companions, D.day);

  const useItem = (it) => {
    D.applyStats(it.effect);
    D.removeItem(it.id, 1);
    D.toast({ icon: it.icon, name: it.name + " ×1", lose: true });
  };

  return (
    <div className="scene">
      <div className="scene-title-chip">🏚️ 栖身 · 整理行囊</div>
      <ShelterBg />

      <div style={{ position: "absolute", left: 36, top: 70, zIndex: 50 }}>
        <button className="btn sm" onClick={() => D.goScene("home")}>← 返回栖身</button>
      </div>

      <div style={{ position: "absolute", inset: "120px 40px 110px", display: "flex", gap: 26 }}>
        {/* 物资 */}
        <div className="pixel-box" style={{ flex: 1, padding: 22, display: "flex",
          flexDirection: "column", minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
            marginBottom: 14 }}>
            <span style={{ fontFamily: "var(--pixel)", fontSize: 15, color: "var(--cyan)",
              letterSpacing: 1 }}>🎒 行囊清单</span>
            <span style={{ fontSize: "var(--t-xs)", color: "var(--txt-faint)" }}>
              消耗品可「使用」· 工具被动生效 · 材料按需消耗</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
            {pack.map((it) => {
              const consume = it.kind === "consume";
              const effColor = consume ? "var(--txt-dim)"
                : it.kind === "tool" ? "var(--green)" : "var(--txt-faint)";
              const bdr = consume ? "var(--gold)" : it.kind === "tool" ? "var(--green)" : "var(--line)";
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
                          color: "#0c2208", padding: "5px 11px", fontSize: "var(--t-xs)",
                          border: "2px solid #6aa83e", animation: "floatUp 1.4s ease-out forwards" }}>
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
                行囊空空如也。
              </div>
            )}
          </div>
        </div>

        {/* 同伴 */}
        <div className="pixel-box" style={{ width: 440, padding: 22, display: "flex",
          flexDirection: "column" }}>
          <div style={{ fontFamily: "var(--pixel)", fontSize: 15, color: "var(--magenta)",
            marginBottom: 18, letterSpacing: 1 }}>🤝 同行者</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {here.map((c) => (
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
            {here.length === 0 && (
              <div style={{ color: "var(--txt-faint)", fontSize: "var(--t-sm)", padding: 16 }}>
                此刻只剩你一人。死寂的城市里，连脚步声都显得多余。
              </div>
            )}
          </div>
          {detail && (
            <div style={{ marginTop: 16, padding: 16, background: "var(--bg-deep)",
              border: "2px solid var(--magenta)" }}>
              <div style={{ fontSize: "var(--t-md)", color: "var(--magenta)", marginBottom: 8 }}>
                {detail.av} {detail.name}</div>
              <div style={{ fontSize: "var(--t-sm)", color: "var(--txt-dim)", lineHeight: 1.6,
                marginBottom: 10 }}>{detail.detail}</div>
              <div style={{ fontSize: "var(--t-xs)", color: "var(--txt-faint)" }}>
                状态 {detail.status} · {detail.mood}</div>
            </div>
          )}
        </div>
      </div>

      <div className="go-out-btn">
        <button className="btn gold" onClick={() => D.goOut()}>🌄 出发逃亡 →</button>
      </div>
    </div>
  );
}

Object.assign(window, { ShelterBg, Hotspot, SceneHome, SceneOrganize, companionsToday });
