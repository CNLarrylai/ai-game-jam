/* ============================================================
   scenes-out.jsx — 选择目的地 + 探索地图（自由行走 tile 版）
   ============================================================ */
const { useState: useStateO, useEffect: useEffectO, useRef: useRefO } = React;

/* representative pixel art per destination thumbnail (floor tileset + landmark) */
const DEST_ART = {
  factory:    { floor: "../assets/maps/factory/tile_floor_concrete.png", obj: "../assets/maps/factory/tile_machine.png" },
  market:     { floor: "../assets/maps/supermarket/tile_floor_a.png",    obj: "../assets/maps/supermarket/tile_shelf_full.png" },
  wjx:        { floor: "../assets/maps/supermarket/tile_floor_b.png",    obj: "../assets/maps/supermarket/tile_box_a.png" },
  whitehouse: { floor: "../assets/maps/factory/tile_floor_grate.png",    obj: "../assets/maps/factory/tile_ai_core.png" },
};
function DestThumb({ d }) {
  const art = DEST_ART[d.id];
  if (!art) return <div className="dc-thumb">{d.icon}</div>;
  return (
    <div className="dc-thumb dc-thumb-art" style={{ backgroundImage: "url(" + art.floor + ")" }}>
      <img src={art.obj} alt="" className="dc-thumb-obj" />
    </div>
  );
}

/* ============================================================
   选择目的地
   ============================================================ */
function SceneDestination({ D }) {
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
              <DestThumb d={d} />
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
   探索地图 (tile) — 自由行走 · 走近 POI 触发
   抄 live-demo 行走引擎：32px tile、2px 步进、脚部碰撞盒、
   迷雾 seen 集合按走到揭开、走近 POI（< 1.2 tile）触发原 handler
   ============================================================ */
const TILE = 32;                 // 32px tile（资产即 32×32）
const MAP_W = 12, MAP_H = 8;     // 12×8 起步
const VIEW_SCALE = 3;            // pixelated 3x 显示
const PLAYER_SPEED = 62;         // px/s（对齐 live-demo 手感 58，略调）
const WALK_FRAME_T = 0.16;       // 行走帧间隔（s）
const FOG_RADIUS = 2;            // 玩家周围 2 格揭开
const POI_TRIGGER = TILE * 1.2;  // 走近 < 1.2 tile 触发

/* 看播端复用本组件但只镜像，不接管键盘 */
const IS_VIEWER_PAGE = /viewer|看播/i.test(decodeURIComponent(location.pathname) + document.title);

/* —— tile 资产表（ascii char → png）。floor 在底层，obj 叠加，# 实心墙 —— */
const A = "../assets/maps/";
const TILESETS = {
  supermarket: {
    floor: A + "supermarket/tile_floor_a.png",
    floorB: A + "supermarket/tile_floor_b.png",
    objs: {
      "#": A + "supermarket/tile_wall.png",
      "S": A + "supermarket/tile_shelf_full.png",
      "s": A + "supermarket/tile_shelf_empty.png",
      "C": A + "supermarket/tile_counter.png",
      "F": A + "supermarket/tile_freezer.png",
      "B": A + "supermarket/tile_box_a.png",
      "b": A + "supermarket/tile_box_b.png",
      "D": A + "supermarket/tile_door_entrance.png",
    },
    solid: "#SsCFBb",
  },
  factory: {
    floor: A + "factory/tile_floor_concrete.png",
    floorB: A + "factory/tile_floor_grate.png",
    objs: {
      "#": A + "factory/tile_wall_metal.png",
      "M": A + "factory/tile_machine.png",
      "V": A + "factory/tile_conveyor.png",
      "P": A + "factory/tile_pipes.png",
      "X": A + "factory/tile_crate.png",
      "A": A + "factory/tile_ai_core.png",
      "D": A + "factory/tile_wall_metal.png",
    },
    solid: "#MPXA",
  },
};
/* destination id → tileset（医院等就近映射） */
const DEST_TILESET = { market: "supermarket", wjx: "supermarket", factory: "factory", whitehouse: "factory" };

/* 12×8 地图布局（外圈墙，内部留可达走道；大写=障碍，'.'=地面，数字=POI 锚点） */
const MAP_LAYOUTS = {
  supermarket: [
    "############",
    "#..S..S..S.#",
    "#..S..S..S.#",
    "#.0........#",
    "#....C.....#",
    "#.B....F..1#",
    "#.b..s....2#",
    "######D#####",
  ],
  factory: [
    "############",
    "#.M..P..M..#",
    "#.M..P..M..#",
    "#.0..V.....#",
    "#....V....A#",
    "#.X......1.#",
    "#.X....2...#",
    "######D#####",
  ],
};

/* 把 cells（HEX_TILES 非 hero）均匀映射到地图 POI 锚点；不足则按内部地面铺开 */
function buildPois(cells, layout, setKey) {
  const anchors = [];      // [{tx,ty,key}]
  for (let ty = 0; ty < layout.length; ty++) {
    for (let tx = 0; tx < layout[ty].length; tx++) {
      const ch = layout[ty][tx];
      if (ch >= "0" && ch <= "9") anchors.push({ tx, ty, idx: +ch });
    }
  }
  anchors.sort((a, b) => a.idx - b.idx);
  /* spawn = anchor '0' */
  const spawnAnchor = anchors.find((a) => a.idx === 0) || { tx: 1, ty: 1 };
  const poiCells = cells.filter((c) => c.type !== "hero" && c.type !== "fog");
  /* 可用 POI 锚点（排除 spawn 的 0） */
  let slots = anchors.filter((a) => a.idx !== 0).map((a) => ({ tx: a.tx, ty: a.ty }));
  /* 若锚点不足，补充内部空地（与已用错开） */
  if (slots.length < poiCells.length) {
    const used = new Set(slots.map((s) => s.tx + "," + s.ty));
    used.add(spawnAnchor.tx + "," + spawnAnchor.ty);
    for (let ty = 1; ty < layout.length - 1 && slots.length < poiCells.length; ty++) {
      for (let tx = 1; tx < layout[ty].length - 1 && slots.length < poiCells.length; tx++) {
        if (layout[ty][tx] !== ".") continue;
        const k = tx + "," + ty;
        if (used.has(k)) continue;
        used.add(k); slots.push({ tx, ty });
      }
    }
  }
  return {
    spawn: { tx: spawnAnchor.tx, ty: spawnAnchor.ty },
    pois: poiCells.map((c, i) => ({
      cell: c,
      tx: (slots[i] || { tx: 1, ty: 1 }).tx,
      ty: (slots[i] || { tx: 1, ty: 1 }).ty,
    })),
  };
}

function SceneExplore({ D, mirror, dest }) {
  const [ap, setAp] = useStateO(5);                 // 每日 5 行动点
  const [revealed, setRevealed] = useStateO({});    // cell.id -> true（已开格）
  const [foe, setFoe] = useStateO(null);
  const [npc, setNpc] = useStateO(null);
  const [busy, setBusy] = useStateO(false);         // 事件卡打开时锁移动

  /* 当前目的地 → tileset / 布局 */
  const destId = (dest && dest.id) || (mirror && mirror.destId) || "market";
  const tsKey = DEST_TILESET[destId] || "supermarket";
  const layout = MAP_LAYOUTS[tsKey] || MAP_LAYOUTS.supermarket;
  const tileset = TILESETS[tsKey] || TILESETS.supermarket;

  const cells = window.HEX_TILES || [];
  /* cells → POI 锚点 + spawn（memoized by destId） */
  const built = useRefO(null);
  if (!built.current || built.current.key !== destId) {
    built.current = { key: destId, ...buildPois(cells, layout, null) };
  }
  const { spawn, pois } = built.current;

  /* —— 主播状态（像素坐标） —— */
  const [hero, setHero] = useStateO(() => ({
    x: (spawn.tx + 0.5) * TILE, y: (spawn.ty + 0.5) * TILE,
  }));
  const [facing, setFacing] = useStateO("down");
  const [stepF, setStepF] = useStateO(0);
  const [moving, setMoving] = useStateO(false);
  const [seen, setSeen] = useStateO(() => new Set());

  /* —— 双端同步：mirror 只读渲染；主播端上报像素坐标 —— */
  const vAp = mirror ? mirror.ap : ap;
  const vRevealed = mirror ? (mirror.revealed || {}) : revealed;
  /* hero 同步：优先像素字段 px/py，向后兼容旧的格坐标 x/y */
  const mHero = mirror && mirror.hero;
  const vHero = mirror
    ? (mHero && mHero.px != null
        ? { x: mHero.px, y: mHero.py }
        : { x: (((mHero && mHero.x) || 0) + 1.5) * TILE, y: (((mHero && mHero.y) || 0) + 1.5) * TILE })
    : hero;
  const vFacing = mirror ? (mirror.facing || "down") : facing;
  const vStepF = mirror ? (mirror.stepF || 0) : stepF;
  const vMoving = mirror ? !!mirror.moving : moving;
  const vSeen = mirror ? new Set(mirror.seen || []) : seen;

  /* refs for the rAF loop（避免闭包过期） */
  const stateRef = useRefO({});
  stateRef.current = { ap, revealed, hero, facing, stepF, moving, seen, busy, foe, npc, pois, layout, tileset, spawn };
  if (!mirror && typeof window !== "undefined") {
    window.__WL_EXPLORE__ = {
      get ap(){ return stateRef.current.ap; },
      get hero(){ return stateRef.current.hero; },
      get revealed(){ return stateRef.current.revealed; },
      get seenCount(){ return stateRef.current.seen.size; },
      pois: pois.map((p) => ({ id: p.cell.id, type: p.cell.type, tx: p.tx, ty: p.ty, px: (p.tx+0.5)*TILE, py: (p.ty+0.5)*TILE })),
      spawn, TILE,
      // QC：把主播瞬移到某像素坐标（仅测试用）
      _tp(px, py){ setHero({ x: px, y: py }); setSeen((prev) => revealFog(px, py, prev)); checkPoi(px, py); },
    };
  }

  useEffectO(() => {
    if (mirror || !D.reportExplore) return;
    D.reportExplore({
      ap, revealed,
      hero: { x: hero.x / TILE - 0.5 | 0, y: hero.y / TILE - 0.5 | 0, px: hero.x, py: hero.y },
      facing, stepF, moving, seen: Array.from(seen), destId,
    });
  }, [ap, revealed, hero, facing, stepF, moving, seen]);

  const finishEvent = () => { setFoe(null); setNpc(null); setBusy(false); D.closeDecision(); };

  /* ---- 原"翻开该格"handler：走近 POI 即触发（机制完全保留） ---- */
  const explore = (t, atPx, atPy) => {
    if (ap <= 0 || revealed[t.id]) return;
    if (t.type === "search" || t.type === "npc" || t.type === "battle") setBusy(true);
    setRevealed((r) => ({ ...r, [t.id]: true }));
    setAp((a) => a - 1);
    if (t.type !== "empty") D.spawn({ x: atPx, y: atPy + 70 });

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
      setTimeout(() => {
        D.banner({ id: Date.now(), big: true, icon: "⚠️", html: "前方发现敌对目标！" });
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
      D.applyStats({ sanity: 2 });
      D.addItem("scrap");
      D.toast({ icon: "🔩", name: "空房间 · 搜到废铁 ×1（理智 +2）" });
    }
  };
  const exploreRef = useRefO(explore);
  exploreRef.current = explore;

  /* ---- 碰撞：脚部盒（抄 live-demo blocked，按 32px tile 放大） ---- */
  const solidSet = new Set(tileset.solid.split(""));
  const solidAt = (px, py) => {
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    if (tx < 0 || ty < 0 || ty >= layout.length || tx >= layout[ty].length) return true;
    const ch = layout[ty][tx];
    return solidSet.has(ch);
  };
  const blocked = (x, y) => {
    const hw = 8, top = 4, bot = 12;  // live-demo 用 4/2/6（16tile），32tile 翻倍
    return solidAt(x - hw, y - top) || solidAt(x + hw, y - top) ||
           solidAt(x - hw, y + bot) || solidAt(x + hw, y + bot) ||
           solidAt(x - hw, y) || solidAt(x + hw, y);
  };

  /* ---- 揭迷雾：玩家周围 FOG_RADIUS 格 ---- */
  const revealFog = (px, py, prev) => {
    const ctx = Math.floor(px / TILE), cty = Math.floor(py / TILE);
    let changed = false;
    const next = new Set(prev);
    for (let dy = -FOG_RADIUS; dy <= FOG_RADIUS; dy++)
      for (let dx = -FOG_RADIUS; dx <= FOG_RADIUS; dx++) {
        const tx = ctx + dx, ty = cty + dy;
        if (tx < 0 || ty < 0 || ty >= layout.length || tx >= layout[0].length) continue;
        const k = tx + "," + ty;
        if (!next.has(k)) { next.add(k); changed = true; }
      }
    return changed ? next : prev;
  };

  /* ---- POI proximity 触发：走近未开格 POI < 1.2 tile ---- */
  const checkPoi = (px, py) => {
    const st = stateRef.current;
    if (st.ap <= 0) {
      /* 仅在尚有未开 POI 时提示一次（避免刷屏：靠 revealed 判定） */
      return;
    }
    for (const p of st.pois) {
      if (st.revealed[p.cell.id]) continue;
      const cx = (p.tx + 0.5) * TILE, cy = (p.ty + 0.5) * TILE;
      if (Math.hypot(px - cx, py - cy) < POI_TRIGGER) {
        exploreRef.current(p.cell, cx, cy);
        break;
      }
    }
  };

  /* ---- 键盘 + rAF 行走循环（仅主播端） ---- */
  const keysRef = useRefO({});
  useEffectO(() => {
    if (mirror || IS_VIEWER_PAGE) return;
    const KEYMAP = { ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down",
      ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right" };
    const onDown = (e) => {
      const dir = KEYMAP[e.code]; if (!dir) return;
      const tag = (e.target.tagName || "").toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;
      e.preventDefault(); keysRef.current[dir] = true;
    };
    const onUp = (e) => { const dir = KEYMAP[e.code]; if (dir) keysRef.current[dir] = false; };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);

    let raf, last = 0, animT = 0;
    const loop = (ts) => {
      const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
      const st = stateRef.current;
      const k = keysRef.current;
      /* 事件卡打开（busy/foe/npc）时停止移动监听（抄 live-demo：.evt.show 不响应） */
      const locked = st.busy || st.foe || st.npc;
      let vx = 0, vy = 0;
      if (!locked) {
        if (k.left) vx -= 1; if (k.right) vx += 1;
        if (k.up) vy -= 1; if (k.down) vy += 1;
      }
      if (vx && vy) { vx *= 0.7071; vy *= 0.7071; }
      const isMoving = !!(vx || vy);
      let nx = st.hero.x, ny = st.hero.y, nface = st.facing;
      if (vx) nface = vx < 0 ? "left" : "right";
      else if (vy) nface = vy < 0 ? "up" : "down";
      if (vx) { const tx = st.hero.x + vx * PLAYER_SPEED * dt; if (!blocked(tx, st.hero.y)) nx = tx; }
      if (vy) { const ty = st.hero.y + vy * PLAYER_SPEED * dt; if (!blocked(st.hero.x, ty)) ny = ty; }

      if (isMoving) {
        animT += dt;
        if (animT > WALK_FRAME_T) { animT = 0; setStepF((f) => f ^ 1); }
        if (nx !== st.hero.x || ny !== st.hero.y) {
          setHero({ x: nx, y: ny });
          setSeen((prev) => revealFog(nx, ny, prev));
          checkPoi(nx, ny);
        }
        if (nface !== st.facing) setFacing(nface);
        if (!st.moving) setMoving(true);
      } else {
        if (st.moving) setMoving(false);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame((ts) => { last = ts; raf = requestAnimationFrame(loop); });

    /* 进场即揭开出生点迷雾 */
    setSeen((prev) => revealFog(stateRef.current.hero.x, stateRef.current.hero.y, prev));

    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      cancelAnimationFrame(raf);
      keysRef.current = {};
    };
  }, [destId]);  // 切目的地重挂

  /* mirror 端：进场补一次出生迷雾（防 seen 为空时全黑） */
  useEffectO(() => {
    if (!mirror) return;
  }, [mirror]);

  /* ============================================================
     Canvas 渲染（地图 / 迷雾 / POI / 玩家）
     ============================================================ */
  const canvasRef = useRefO(null);
  const imgCache = useRefO({});
  /* 预加载所有图片 */
  const loadImg = (src) => {
    const c = imgCache.current;
    if (c[src]) return c[src];
    const im = new Image(); im.src = src; c[src] = im;
    im.onload = () => { im._ready = true; };
    return im;
  };

  useEffectO(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const fogImg = loadImg(A + "fog.png");
    /* 预加载 tileset + 角色 */
    loadImg(tileset.floor); loadImg(tileset.floorB);
    Object.values(tileset.objs).forEach(loadImg);
    ["idle", "walk_up_f1", "walk_up_f2", "walk_down_f1", "walk_down_f2",
     "walk_left_f1", "walk_left_f2", "walk_right_f1", "walk_right_f2"]
      .forEach((n) => loadImg("../assets/characters/char_player_" + n + ".png"));

    let raf;
    const draw = () => {
      const W = MAP_W * TILE, H = MAP_H * TILE;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = "#070810"; ctx.fillRect(0, 0, cv.width, cv.height);

      /* floor + objs */
      const floor = loadImg(tileset.floor), floorB = loadImg(tileset.floorB);
      for (let ty = 0; ty < layout.length; ty++) {
        for (let tx = 0; tx < layout[ty].length; tx++) {
          const ch = layout[ty][tx];
          const ox = tx * TILE, oy = ty * TILE;
          const fimg = ((tx + ty) % 2 === 0 ? floor : floorB);
          if (fimg && fimg._ready) ctx.drawImage(fimg, ox, oy, TILE, TILE);
          const objSrc = tileset.objs[ch];
          if (objSrc) {
            const oimg = loadImg(objSrc);
            if (oimg && oimg._ready) ctx.drawImage(oimg, ox, oy, TILE, TILE);
          }
        }
      }

      /* POI 标记：未开 POI 画半透明深色块 + "?" */
      const curRevealed = mirror ? (mirror.revealed || {}) : stateRef.current.revealed;
      ctx.save();
      for (const p of pois) {
        if (curRevealed[p.cell.id]) continue;
        const ox = p.tx * TILE, oy = p.ty * TILE;
        ctx.fillStyle = "rgba(24,20,37,.6)";
        ctx.fillRect(ox + 2, oy + 2, TILE - 4, TILE - 4);
        ctx.fillStyle = "#feae34";
        ctx.font = "bold 18px monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("?", ox + TILE / 2, oy + TILE / 2 + 1);
      }
      ctx.restore();

      /* 玩家 sprite */
      const hx = mirror ? vHero.x : stateRef.current.hero.x;
      const hy = mirror ? vHero.y : stateRef.current.hero.y;
      const hf = mirror ? vFacing : stateRef.current.facing;
      const hmv = mirror ? vMoving : stateRef.current.moving;
      const hsf = mirror ? vStepF : stateRef.current.stepF;
      const spriteName = hmv
        ? "walk_" + hf + "_f" + (hsf + 1)
        : "idle";
      const pImg = loadImg("../assets/characters/char_player_" + spriteName + ".png");
      /* 角色 32×32，脚底对齐 hero 中心；略上移让脚踩在格点 */
      if (pImg && pImg._ready) {
        ctx.drawImage(pImg, Math.round(hx - TILE / 2), Math.round(hy - TILE + 6), TILE, TILE);
      }

      /* 迷雾：未 seen 的 tile 叠 fog.png */
      const curSeen = mirror ? new Set(mirror.seen || []) : stateRef.current.seen;
      for (let ty = 0; ty < layout.length; ty++) {
        for (let tx = 0; tx < layout[ty].length; tx++) {
          if (curSeen.has(tx + "," + ty)) continue;
          const ox = tx * TILE, oy = ty * TILE;
          if (fogImg && fogImg._ready) ctx.drawImage(fogImg, ox, oy, TILE, TILE);
          else { ctx.fillStyle = "rgba(8,8,16,.92)"; ctx.fillRect(ox, oy, TILE, TILE); }
        }
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [destId, mirror]);

  const destName = (dest && dest.name) || (DESTINATIONS.find((d) => d.id === destId) || {}).name || "废弃区域";

  return (
    <div className="scene">
      <div className="scene-title-chip">🗺️ 出门 · 探索{destName}</div>
      <div className="explore">
        <div className="ap-bar">
          <span className="ap-label">行动点 {vAp}/5</span>
          <div className="ap-pips">
            {[0,1,2,3,4].map((i) => <div key={i} className={"ap-pip " + (i >= vAp ? "used" : "")} />)}
          </div>
          {!IS_VIEWER_PAGE && !mirror && <span className="ap-hint" style={{ marginLeft: 12, opacity: .65,
            fontSize: "var(--t-xs)" }}>↑↓←→ / WASD 自由行走 · 走近 ? 点位自动探索</span>}
        </div>

        <div className="walkwrap">
          <canvas ref={canvasRef}
            className={"walk-canvas" + (mirror ? " mirror" : "")}
            width={MAP_W * TILE} height={MAP_H * TILE}
            style={{
              /* host：3x pixelated；看播端（mirror）按手机宽度等比自适应（aspectRatio 保形） */
              ...(mirror
                ? { width: "92%", aspectRatio: MAP_W + " / " + MAP_H, height: "auto", maxHeight: "100%" }
                : { width: MAP_W * TILE * VIEW_SCALE, height: MAP_H * TILE * VIEW_SCALE,
                    maxWidth: "100%", maxHeight: "100%" }),
              imageRendering: "pixelated",
              display: "block",
              border: "2px solid var(--ui-line, #3a4466)",
              borderRadius: 6,
              boxShadow: "0 8px 28px rgba(0,0,0,.5)",
            }} />
        </div>

        {/* foe sprite during battle */}
        {foe && (
          <div className="battle-foe">
            <div className="char-sprite hero" style={{ position: "static" }}>
              <img className="player-sprite" src="../assets/characters/char_player_idle.png"
                width={96} height={96} alt="" /><div className="shadow" />
            </div>
            <div style={{ fontFamily: "var(--pixel)", fontSize: 20, color: "var(--red)" }}>VS</div>
            <div className="char-sprite" style={{ position: "static" }}>
              <div className="body" style={{ borderColor: "var(--red)", fontSize: 48,
                boxShadow: "inset 0 0 0 2px var(--ui-danger)" }}>{foe.icon}</div>
              <div className="shadow" /><div className="name-tag">{foe.name}</div>
            </div>
          </div>
        )}

        {/* npc portrait + bubble */}
        {npc && (
          <React.Fragment>
            <img src="../assets/characters/char_npc_cashier.png" width={144} height={216} alt=""
              style={{ position: "absolute", left: "30%", top: "20%", imageRendering: "pixelated",
                filter: "drop-shadow(2px 2px 0 rgba(24,20,37,.6))", zIndex: 18 }} />
            <div className="npc-bubble" style={{ left: "52%", top: "26%" }}>
              <b style={{ color: "var(--cyan)" }}>{npc.av} {npc.name}</b><br />{npc.line}
            </div>
          </React.Fragment>
        )}

        {/* out of AP */}
        {!mirror && ap <= 0 && !foe && !npc && (
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
