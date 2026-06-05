/* ============================================================
   scenes-out.jsx — 选择路线（目的地）+ 探索地图（含空格潜行）
   ============================================================ */
const { useState: useStateO, useEffect: useEffectO, useRef: useRefO } = React;

/* ============================================================
   选择路线 / 目的地
   ============================================================ */
function SceneDestination({ D }) {
  useEffectO(() => {
    const t = setTimeout(() => {
      D.adoptComment({ user: "夜行者", av: "🌙", text: "钻进哈利福德废宅吧 紧贴圆筒反而最隐蔽" });
      D.banner({ id: Date.now(), icon: "✨", html: "<b>@夜行者</b> 的建议生效了！「地图上浮现出哈利福德的半塌废宅」" });
    }, 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="scene">
      <div className="scene-title-chip">🚪 出发 · 选择下一段逃亡路线</div>
      <div className="region-map">
        <div className="rm-head">侦察周边 — 选择一处前进目标 · 当前行动点 <b>5</b></div>
        <div className="dest-grid">
          {DESTINATIONS.map((d) => (
            <div key={d.id} className={"dest-card " + (d.generated ? "generated" : "")}
              onClick={() => D.confirmDest(d)}>
              {d.generated && <div className="gen-tag">✨ 由观众弹幕生成</div>}
              <div className="dc-thumb">{d.icon}</div>
              <div className="dc-name">{d.name}</div>
              <div className="dc-row"><span>危险等级</span>
                <span className="danger">{"⭐".repeat(d.danger)}</span></div>
              <div className="dc-row"><span>预估收益</span>
                <span className="reward">{d.reward}</span></div>
              <div className="dc-row"><span>行动点</span><span>{d.ap}</span></div>
              {d.generated && <div style={{ fontSize: "var(--t-xs)", color: "var(--gold)",
                marginTop: 8 }}>灵感来源：@{d.by === "观众投票" ? "夜行者" : "红草观察员"}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   探索地图（六边形）+ 空格潜行
   ============================================================ */
const HEX_W = 116, HEX_H = 130, CX = 250, CY = 330;
const NEIGHBORS = [[0,-1],[0,1],[1,-1],[1,0],[-1,-1],[-1,0]];
/* 揭格优先级（空格潜行时按这个顺序选最近的雾格）*/
const PROBE_ORDER = [[0,-1],[-1,0],[1,0],[0,1],[-1,-1],[1,-1]];

function hexPos(x, y) {
  const odd = ((x % 2) + 2) % 2 === 1;
  return {
    left: CX + x * (HEX_W * 0.75) - HEX_W / 2,
    top: CY + y * HEX_H + (odd ? HEX_H / 2 : 0) - HEX_H / 2,
  };
}

function SceneExplore({ D }) {
  const [ap, setAp] = useStateO(5);
  const [revealed, setRevealed] = useStateO({});
  const [foe, setFoe] = useStateO(null);     // 三脚机器人对峙中
  const [npc, setNpc] = useStateO(null);
  const [cool, setCool] = useStateO(false);  // 空格冷却
  const tiles = window.HEX_TILES;

  // 用 ref 让全局 keydown 始终读到最新状态
  const apRef = useRefO(ap); apRef.current = ap;
  const revRef = useRefO(revealed); revRef.current = revealed;
  const busyRef = useRefO(false); busyRef.current = !!(foe || npc || cool);

  const isAdjacent = (t, rev) =>
    NEIGHBORS.some(([nx, ny]) => nx === t.x && ny === t.y) && !rev[t.id] && t.type !== "hero";

  const finishEvent = () => { setFoe(null); setNpc(null); D.closeDecision(); };

  const explore = (t) => {
    if (apRef.current <= 0 || revRef.current[t.id]) return;
    setRevealed((r) => ({ ...r, [t.id]: true }));
    setAp((a) => a - 1);
    const p = hexPos(t.x, t.y);
    const px = p.left + HEX_W / 2, py = p.top + HEX_H / 2;
    if (t.type !== "empty") D.spawn({ x: px, y: py + 70 });

    if (t.type === "search") {
      setTimeout(() => D.decision({
        id: "search", icon: "🏚️", title: t.title, desc: t.desc,
        options: [
          { id: "ransack", label: "仔细翻找", icon: "🔍", sub: "收获多，但动静大" },
          { id: "grab",    label: "抓了就走", icon: "🏃", sub: "少拿一点，保住隐蔽" },
          { id: "barricade", label: "用废铁封门", icon: "🪤", sub: "消耗废铁，提升隐蔽" },
        ],
        onChoose: (opt) => {
          if (opt.id === "ransack") {
            D.applyStats({ conceal: -6, supply: 16 });
            D.addItem("bread"); D.toast({ icon: "🍞", name: "干面包 ×1" });
            return "你掀开每一只橱柜，翻出面包、净水和一卷毛毯。可瓷器哗啦碎了一地——隐蔽 -6，补给 +16。";
          }
          if (opt.id === "grab") {
            D.applyStats({ supply: 7 });
            return "你只摸了最近的食物就退出来，没敢深入。补给 +7，没人听见你。";
          }
          D.removeItem("scrap", 1); D.applyStats({ conceal: 8 });
          return "你用废铁和家具把门窗钉死，留出一个能藏身的角落。隐蔽 +8。";
        },
        onContinue: finishEvent,
      }), 650);

    } else if (t.type === "weed") {
      // 红草：理智 / 氛围
      setTimeout(() => D.decision({
        id: "weed", icon: "🟥", title: t.title, desc: t.desc,
        options: [
          { id: "avoid", label: "绕开红草", icon: "↩️", sub: "多走路，但不被它扰乱心神" },
          { id: "push",  label: "穿过去抄近路", icon: "🟥", sub: "快，但景象侵蚀理智" },
          { id: "study", label: "采一株观察", icon: "🔬", sub: "也许是它们的弱点……" },
        ],
        onChoose: (opt) => {
          if (opt.id === "avoid") { D.applyStats({ supply: -4 }); return "你绕了一大圈避开那片猩红。脚程更累，补给 -4，但心神还稳。"; }
          if (opt.id === "push") { D.applyStats({ sanity: -10, conceal: 3 }); return "你踩着脆裂的红草穿行，那不属于地球的颜色灌满双眼。理智 -10，但红草也替你遮了身形，隐蔽 +3。"; }
          D.applyStats({ sanity: -4 }); D.addItem("scrap");
          return "你折下一段猩红的茎，它在掌心里微微搏动，像活物。理智 -4，你把样本塞进了行囊。";
        },
        onContinue: finishEvent,
      }), 650);

    } else if (t.type === "npc") {
      setTimeout(() => {
        setNpc(window.MAP_NPC);
        D.decision({
          id: "npc", icon: window.MAP_NPC.av, title: window.MAP_NPC.name,
          desc: window.MAP_NPC.line, options: window.MAP_NPC.options,
          onChoose: (opt) => {
            if (opt.id === "trade") {
              D.removeItem("scrap", 1); D.addItem("bread"); D.applyStats({ supply: 8 });
              D.toast({ icon: "🍞", name: "干面包 ×1" });
              return "你用废铁换来两块干面包。他把东西塞给你，眼神警惕地扫着天空。补给 +8。";
            }
            if (opt.id === "share") {
              D.applyStats({ supply: -6, sanity: 10 });
              return "你掰了一半口粮给他。他怔了很久，哑声道谢。在这末世里，你还记得自己是个人。补给 -6，理智 +10。";
            }
            if (opt.id === "info") {
              D.applyStats({ sanity: 4 });
              D.banner({ id: Date.now(), icon: "🗺️", html: "<b>情报</b> 他说：往东去埃塞克斯海岸，铁甲舰『雷霆之子号』在掩护难民登船" });
              return "「想活命就往海边走，趁火星人还没封死河口。」——你记下了海岸撤离的方向。理智 +4。";
            }
            D.applyStats({ conceal: 2 });
            return "你没有冒险接触，悄悄绕了过去。隐蔽 +2，但你不知错过了什么。";
          },
          onContinue: finishEvent,
        });
      }, 650);

    } else if (t.type === "tripod") {
      // 三脚机器人：不是战斗，是"能否不被看见"的躲避对峙
      setTimeout(() => {
        D.banner({ id: Date.now(), big: true, icon: "✨",
          html: "<b>@纸鹤</b> 的脑洞生效了！「一台三脚机器人正巡过街口」" });
      }, 500);
      setTimeout(() => {
        D.story({
          illus: "🛸", source: "@纸鹤",
          text: "百尺高的金属巨像跨过屋脊，钢索般的触手拖在地上。它的镜头缓缓扫过这条街——你能听见自己的心跳。它，还，没，看，见，你。",
          onContinue: () => {
            D.closeStory();
            setFoe({ name: t.title, icon: "🛸" });
            D.decision({
              id: "tripod", icon: "🛸", title: "三脚机器人 · 近在咫尺",
              desc: "弹幕在为你的活法投票——记住：这东西打不过，只能不被它看见。",
              votes: { freeze: 26, detour: 14, dash: 9 },
              options: [
                { id: "freeze", label: "贴地静止", icon: "🤫", sub: "把命押在隐蔽上" },
                { id: "detour", label: "退回绕远", icon: "↩️", sub: "耗补给，稳妥脱离" },
                { id: "dash",   label: "赌命冲过去", icon: "💨", sub: "快，但可能撞进热射线" },
              ],
              onChoose: (opt) => {
                if (opt.id === "freeze") {
                  D.applyStats({ conceal: 6, sanity: -6 });
                  return "你把脸埋进泥里，连呼吸都停了。触手在头顶三尺处扫过，又移开。它走了。隐蔽 +6，但这六十秒像六十年。理智 -6。";
                }
                if (opt.id === "detour") {
                  D.applyStats({ supply: -10, conceal: 4 });
                  return "你一寸寸退回断墙后，绕了半座城才脱身。补给 -10，但全身而退，隐蔽 +4。";
                }
                // 赌命：风险结果——靠当前隐蔽决定生死代价
                D.applyStats({ life: -22, conceal: -10, supply: 6 });
                D.addItem("scrap"); D.toast({ icon: "🔩", name: "废铁 ×1（逃命路上捡的）" });
                return "你猛地冲过街口——身后热射线的白光擦着脊背烧过，空气都焦了。你活着，但伤得不轻。生命 -22，隐蔽 -10。";
              },
              onContinue: finishEvent,
            });
          },
        });
      }, 1400);

    } else {
      // 空地 — 也给明确反馈，点击绝不"空"
      D.applyStats({ conceal: 2 });
      D.addItem("scrap");
      D.toast({ icon: "🔩", name: "空荡的院子 · 捡到废铁 ×1（隐蔽 +2）" });
    }
  };

  /* —— 空格潜行：自动揭开最近的相邻雾格 —— */
  const stealthProbe = () => {
    if (busyRef.current || apRef.current <= 0) return;
    const rev = revRef.current;
    // 找到第一个"相邻且未揭开"的格子（按 PROBE_ORDER 的就近顺序）
    let target = null;
    for (const [dx, dy] of PROBE_ORDER) {
      const t = tiles.find((x) => x.x === dx && x.y === dy);
      if (t && !rev[t.id] && t.type !== "hero") { target = t; break; }
    }
    if (!target) { D.toast({ icon: "🌫️", name: "四周已无可潜行的方向（试试更外圈或返回）", lose: true }); return; }
    setCool(true);
    setTimeout(() => setCool(false), 900);
    explore(target);
  };

  useEffectO(() => {
    const onKey = (e) => {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        stealthProbe();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []); // stealthProbe 读 ref，无需依赖

  const heroPos = hexPos(0, 0);
  return (
    <div className="scene">
      <div className="scene-title-chip">🗺️ 逃亡途中 · 潜行穿越废墟</div>
      <div className="explore">
        <div className="ap-bar">
          <span className="ap-label">行动点 {ap}/5</span>
          <div className="ap-pips">
            {[0,1,2,3,4].map((i) => <div key={i} className={"ap-pip " + (i >= ap ? "used" : "")} />)}
          </div>
        </div>

        <div className="hexwrap">
          <div className="hexgrid" style={{ width: 520, height: 700 }}>
            {tiles.map((t) => {
              const pos = hexPos(t.x, t.y);
              const adj = isAdjacent(t, revealed);
              const rev = revealed[t.id];
              let cls = "hex ";
              if (t.type === "hero") cls += "hero ";
              else if (rev) cls += "revealed " + t.type + " ";
              else if (adj) cls += "adjacent ";
              else cls += "fog ";
              if (t.generated && (rev || adj)) cls += "generated ";
              const icon = t.type === "hero" ? "🧍🏻"
                : rev ? (t.icon || (t.type === "empty" ? "·" : ""))
                : adj ? "❔" : "";
              return (
                <div key={t.id} className={cls} style={{ left: pos.left, top: pos.top }}
                  onClick={() => adj && explore(t)}>
                  <div className="hx-inner">
                    {icon}
                    {rev && t.label && t.type !== "hero" &&
                      <span className="htype">{t.label}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 三脚机器人对峙立绘 */}
        {foe && (
          <div className="battle-foe">
            <div className="char-sprite hero" style={{ position: "static" }}>
              <div className="body">🧍🏻</div><div className="shadow" />
            </div>
            <div style={{ fontFamily: "var(--pixel)", fontSize: 18, color: "var(--magenta)" }}>对峙</div>
            <div className="char-sprite" style={{ position: "static" }}>
              <div className="body" style={{ borderColor: "var(--red)", fontSize: 48,
                boxShadow: "0 0 20px rgba(210,59,46,.5)" }}>{foe.icon}</div>
              <div className="shadow" /><div className="name-tag">{foe.name}</div>
            </div>
          </div>
        )}

        {/* npc 气泡 */}
        {npc && (
          <div className="npc-bubble" style={{ left: "52%", top: "26%" }}>
            <b style={{ color: "var(--cyan)" }}>{npc.av} {npc.name}</b><br />{npc.line}
          </div>
        )}

        {/* 空格潜行提示（只在还有行动点、且没在事件中时显示） */}
        {ap > 0 && !foe && !npc && (
          <div className={"stealth-hint " + (cool ? "cool" : "")}>
            <kbd>空格</kbd>
            <span>{cool ? "屏息中…" : "屏息潜行 — 自动摸向最近的方向（消耗 1 行动点）"}</span>
          </div>
        )}

        {/* 行动点耗尽 */}
        {ap <= 0 && !foe && !npc && (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 28, display: "flex",
            justifyContent: "center", zIndex: 50 }}>
            <button className="btn gold" onClick={() => D.returnShelter()}>
              行动点已用完，回到栖身处 →</button>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { SceneDestination, SceneExplore });
