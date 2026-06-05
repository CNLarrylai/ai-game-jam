/* ============================================================
   scenes-out.jsx — 选择目的地 + 探索地图
   ============================================================ */
const { useState: useStateO, useEffect: useEffectO } = React;

/* ============================================================
   选择目的地
   ============================================================ */
function SceneDestination({ D }) {
  /* no fake banners */

  return (
    <div className="scene">
      <div className="scene-title-chip">🚪 出门 · 选择目的地</div>
      <div className="region-map">
        <div className="rm-head">扫描周边区域 — 选择一处探索目标 · 当前行动点 <b>5</b></div>
        <div className="dest-grid">
          {DESTINATIONS.map((d) => (
            <div key={d.id} className={"dest-card " + (d.generated ? "generated" : "")}
              onClick={() => D.confirmDest(d)}>
              {d.generated && <div className="gen-tag">✨ 由观众评论生成</div>}
              <div className="dc-thumb">{d.icon}</div>
              <div className="dc-name">{d.name}</div>
              <div className="dc-row"><span>危险等级</span>
                <span className="danger">{"⭐".repeat(d.danger)}</span></div>
              <div className="dc-row"><span>预估收益</span>
                <span className="reward">{d.reward}</span></div>
              <div className="dc-row"><span>行动点</span><span>{d.ap}</span></div>
              {d.generated && <div style={{ fontSize: "var(--t-xs)", color: "var(--gold)",
                marginTop: 8 }}>灵感来源：@雾</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   探索地图 (hex)
   ============================================================ */
const HEX_W = 116, HEX_H = 130, CX = 250, CY = 330;
const NEIGHBORS = [[0,-1],[0,1],[1,-1],[1,0],[-1,-1],[-1,0]];

function hexPos(x, y) {
  const odd = ((x % 2) + 2) % 2 === 1;
  return {
    left: CX + x * (HEX_W * 0.75) - HEX_W / 2,
    top: CY + y * HEX_H + (odd ? HEX_H / 2 : 0) - HEX_H / 2,
  };
}

function SceneExplore({ D }) {
  const [ap, setAp] = useStateO(3);
  const [revealed, setRevealed] = useStateO({});   // id -> true
  const [foe, setFoe] = useStateO(null);            // battle tile active
  const [npc, setNpc] = useStateO(null);            // npc tile active
  const tiles = window.HEX_TILES;

  // Expose internal state for viewer sync
  useEffectO(() => {
    window.__EXPLORE_STATE__ = { ap, revealed, foe: foe ? { name: foe.name, icon: foe.icon } : null, npc: npc ? { name: npc.name, av: npc.av, line: npc.line } : null };
  }, [ap, revealed, foe, npc]);

  const isAdjacent = (t) =>
    NEIGHBORS.some(([nx, ny]) => nx === t.x && ny === t.y) && !revealed[t.id] && t.type !== "hero";

  const finishEvent = () => { setFoe(null); setNpc(null); D.closeDecision(); };

  const explore = (t) => {
    if (ap <= 0 || revealed[t.id]) return;
    setRevealed((r) => ({ ...r, [t.id]: true }));
    setAp((a) => a - 1);
    const p = hexPos(t.x, t.y);
    const px = p.left + HEX_W / 2, py = p.top + HEX_H / 2;
    if (t.type !== "empty") D.spawn({ x: px, y: py + 70 });

    if (t.type === "search") {
      setTimeout(() => D.decision({
        id: "search", icon: "🏥", title: t.title, desc: t.desc,
        options: [
          { id: "search", label: "搜索药品", icon: "🔍", sub: "细致翻找，耗时" },
          { id: "pass", label: "快速通过", icon: "🏃", sub: "拿了就走" },
          { id: "trap", label: "设置陷阱", icon: "🪤", sub: "消耗废铁，反制追兵" },
        ],
        onChoose: (opt) => {
          if (opt.id === "search") {
            D.applyStats({ hp: -8, supply: 14 });
            D.addItem("pills"); D.toast({ icon: "💊", name: "镇静剂 ×1" });
            return "你在碎玻璃间翻出一板镇静剂和几卷绷带，手被划伤。HP -8，物资 +14。";
          }
          if (opt.id === "pass") {
            D.applyStats({ sanity: -4, supply: 6 });
            return "你抓起最近的药盒就走，没敢深入。物资 +6。";
          }
          D.removeItem("scrap", 1); D.applyStats({ sanity: 6 });
          return "你用废铁在门口架起绊索陷阱，安全感回升。理智 +6。";
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
              D.removeItem("scrap", 1); D.addItem("can"); D.applyStats({ hunger: 6 });
              D.toast({ icon: "🥫", name: "罐头 ×1" });
              return "你用废铁换来两罐午餐肉。老鸦咧嘴一笑，露出缺了的门牙。";
            }
            if (opt.id === "recruit") {
              D.applyStats({ sanity: 8, supply: 6 });
              D.addCompanion({ id: "crow", name: "老鸦", av: "🧑‍🦲", role: "拾荒者", status: "健康",
                detail: "独行拾荒者，熟悉城市每个角落。能找到隐藏的物资点。", hp: 60, mood: "警觉",
                skill: { id: "scavenge", label: "搜刮", icon: "🔍", effect: { hunger: 8 },
                  line: "老鸦凭着直觉翻出了藏在角落的食物。饱腹 +8。", note: "恢复 饱腹 · 每天一次" },
                ask: "「别问我从哪来的，你只需要知道我能帮你找到吃的。」" });
              D.toast({ icon: "🤝", name: "新同伴：老鸦 · 拾荒者" });
              return "老鸦盯着你看了很久：「……行吧，反正一个人也是死。」拾荒者加入了队伍。";
            }
            if (opt.id === "info") {
              D.applyStats({ sanity: 4 });
              D.banner({ id: Date.now(), icon: "🗺️", html: "<b>线索</b> 老鸦透露：城东地铁隧道尽头有一扇还在通电的门" });
              return "「想离开这城？地铁隧道尽头，那扇门还亮着灯。」——你记下了逃离通道的方向。";
            }
            D.applyStats({ sanity: -3 });
            return "你没有冒险，绕开了他。背后传来一声嗤笑。";
          },
          onContinue: finishEvent,
        });
      }, 650);
    } else if (t.type === "battle") {
      // BOSS — full story moment
      setTimeout(() => {
        D.banner({ id: Date.now(), big: true, icon: "⚠️",
          html: "前方发现敌对目标！" });
      }, 500);
      setTimeout(() => {
        D.story({
          illus: "🤖", source: null,
          text: "红色的光学镜在黑暗中亮起。生锈的机械犬抬起头，关节发出刺耳的摩擦声——它认出了你身上的体温。",
          onContinue: () => {
            D.closeStory();
            setFoe({ name: t.title, icon: "🤖" });
            D.decision({
              id: "battle", icon: "⚔️", title: "机械守卫 来袭",
              desc: "弹幕正在为你投票，选择你的行动：",
              votes: { smash: 23, dodge: 17 },
              options: [
                { id: "smash", label: "猛击", icon: "💥", sub: "高伤害，硬碰硬" },
                { id: "dodge", label: "闪避", icon: "💨", sub: "保命优先，伺机脱离" },
              ],
              onChoose: (opt) => {
                if (opt.id === "smash") {
                  D.applyStats({ hp: -18, supply: 10 });
                  D.addItem("flashlight"); D.toast({ icon: "🔦", name: "军用手电筒" });
                  return "你抄起钢管砸向它的光学镜——火花四溅，机械犬瘫倒。HP -18，但你撬下了它的军用手电筒。";
                }
                D.applyStats({ sanity: -6 });
                return "你贴墙滑步避开扑击，趁尘烟翻窗脱离。理智 -6，全身而退。";
              },
              onContinue: finishEvent,
            });
          },
        });
      }, 1400);
    } else {
      // empty room — still give clear feedback so a click never feels dead
      D.applyStats({ sanity: 2 });
      D.addItem("scrap");
      D.toast({ icon: "🔩", name: "空房间 · 搜到废铁 ×1（理智 +2）" });
    }
  };

  const heroPos = hexPos(0, 0);
  return (
    <div className="scene">
      <div className="scene-title-chip">🗺️ 出门 · 探索废弃医院</div>
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
              const adj = isAdjacent(t);
              const rev = revealed[t.id];
              let cls = "hex ";
              if (t.type === "hero") cls += "hero ";
              else if (rev) cls += "revealed " + t.type + " ";
              else if (adj) cls += "adjacent ";
              else cls += "fog ";
              if (t.generated && (rev || adj)) cls += "generated ";
              const icon = t.type === "hero" ? "🧑‍🚀"
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

        {/* foe sprite during battle */}
        {foe && (
          <div className="battle-foe">
            <div className="char-sprite hero" style={{ position: "static" }}>
              <div className="body">🧑‍🚀</div><div className="shadow" />
            </div>
            <div style={{ fontFamily: "var(--pixel)", fontSize: 20, color: "var(--red)" }}>VS</div>
            <div className="char-sprite" style={{ position: "static" }}>
              <div className="body" style={{ borderColor: "var(--red)", fontSize: 48,
                boxShadow: "0 0 20px rgba(255,59,92,.5)" }}>{foe.icon}</div>
              <div className="shadow" /><div className="name-tag">{foe.name}</div>
            </div>
          </div>
        )}

        {/* npc bubble */}
        {npc && (
          <div className="npc-bubble" style={{ left: "52%", top: "26%" }}>
            <b style={{ color: "var(--cyan)" }}>{npc.av} {npc.name}</b><br />{npc.line}
          </div>
        )}

        {/* out of AP */}
        {ap <= 0 && !foe && !npc && (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 28, display: "flex",
            justifyContent: "center", zIndex: 50 }}>
            <button className="btn gold" onClick={() => D.returnShelter()}>
              行动点已用完，返回避难所 →</button>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { SceneDestination, SceneExplore });
