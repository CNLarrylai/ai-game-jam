/* ============================================================
   app.jsx — 编排：状态机 / 导演 D / 场景路由（WORLDS LIVE）
   资源：生命 life / 补给 supply / 理智 sanity / 隐蔽 conceal
   死亡：life/sanity/conceal 任一 ≤0；撑到 maxDay = 火星人被细菌击倒(通关)
   ============================================================ */
const { useState, useEffect, useRef, useCallback } = React;

let _uid = 0;
const uid = () => "u" + (++_uid) + "_" + Date.now();

const INIT_STATS = window.INIT_STATS || { life: 70, supply: 60, sanity: 64, conceal: 75 };
const initPack = () => ([
  { ...ITEMS.bread }, { ...ITEMS.water }, { ...ITEMS.scrap }, { ...ITEMS.blanket, qty: 1 },
]);
const FATAL = ["life", "sanity", "conceal"];

/* 栖身随天数推进（忠于原著的住所演进） */
function dwellingForDay(day) {
  if (day <= 2) return { icon: "🏠", name: "沃金的家 / 单马车", exposure: "中" };
  if (day <= 5) return { icon: "🧱", name: "哈利福德废宅", exposure: "低（出不去）" };
  return { icon: "🕳️", name: "帕特尼山地窖", exposure: "低" };
}

function App() {
  const [scene, setScene] = useState("intro");
  const [day, setDay] = useState(1);
  const maxDay = 7;
  const [stats, setStats] = useState({ ...INIT_STATS });
  const [pack, setPack] = useState(initPack());
  const [comments, setComments] = useState([
    { id: uid(), user: "煤气灯下", av: "🕯️", text: "主播稳住，火星人刚落地，还有时间", mod: true },
    { id: uid(), user: "怀表先生", av: "⏱️", text: "Day1！先把妻子送走啊" },
    { id: uid(), user: "夜行者", av: "🌙", text: "记住口诀：白天藏，夜里走" },
  ]);
  const [viewers, setViewers] = useState(12903);
  const [floats, setFloats] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [banner, setBanner] = useState(null);
  const [cta, setCta] = useState(null);
  const [spawn, setSpawn] = useState(null);
  const [byTag, setByTag] = useState(null);
  const [decision, setDecision] = useState(null);
  const [story, setStory] = useState(null);
  const [phase, setPhase] = useState(null);
  const [flashSlot, setFlashSlot] = useState(null);
  const [inputHot, setInputHot] = useState(false);
  const [chatBanner, setChatBanner] = useState(null);
  const [confirmD, setConfirmD] = useState(null);
  const [share, setShare] = useState(false);
  const [flags, setFlags] = useState({ knock: false });

  const voteTimer = useRef(null);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  /* ---- 环境弹幕流 ---- */
  useEffect(() => {
    const t = setInterval(() => {
      const c = AMBIENT_COMMENTS[Math.floor(Math.random() * AMBIENT_COMMENTS.length)];
      streamComment({ ...c });
      setViewers((v) => v + Math.floor(Math.random() * 11) - 4);
    }, 2900);
    return () => clearInterval(t);
  }, []);

  /* 刷屏去重演示 */
  useEffect(() => {
    let timers = [];
    const burst = () => {
      const phrase = SPAM_PHRASES[Math.floor(Math.random() * SPAM_PHRASES.length)];
      const n = 7 + Math.floor(Math.random() * 12);
      for (let i = 0; i < n; i++) {
        const u = SPAM_USERS[Math.floor(Math.random() * SPAM_USERS.length)];
        timers.push(setTimeout(() => streamComment({ ...u, text: phrase }), 150 + i * 160));
      }
      timers.push(setTimeout(() =>
        pushSystem("检测到「" + phrase + "」短时间内重复刷屏，已合并 " + n +
          " 条 · 刷同样的内容不会被重复采纳，也不会提升权重"), 150 + n * 160 + 500));
    };
    const first = setTimeout(burst, 9000);
    const iv = setInterval(burst, 24000);
    return () => { clearTimeout(first); clearInterval(iv); timers.forEach(clearTimeout); };
  }, []);

  /* ============ 导演 ============ */
  const pushComment = useCallback((c, opts = {}) => {
    const id = uid();
    setComments((cs) => [...cs.slice(-26), { ...c, id, _t: Date.now(), ...opts }]);
    return id;
  }, []);

  const streamComment = useCallback((c) => {
    const now = Date.now();
    setComments((cs) => {
      for (let i = cs.length - 1; i >= 0 && i >= cs.length - 12; i--) {
        const x = cs[i];
        if (!x.system && !x.adopted && x.text === c.text && now - (x._t || 0) < 9000) {
          const copy = cs.slice();
          copy[i] = { ...x, dup: (x.dup || 1) + 1, merged: true, _t: now };
          return copy;
        }
      }
      return [...cs.slice(-27), { ...c, id: uid(), _t: now, dup: 1 }];
    });
  }, []);

  const pushSystem = useCallback((text) => {
    setComments((cs) => [...cs.slice(-27),
      { id: uid(), system: true, av: "🛡️", user: "AI 守护", text, _t: Date.now() }]);
  }, []);

  const adoptComment = useCallback((c) => {
    const classification = window.ApiBridge ? window.ApiBridge.classifyComment(c.text) : { actionable: true };
    if (!classification.actionable) return;
    if (window.ApiBridge) { window.ApiBridge.postComment(c.user || 'anonymous', c.text); }
    const id = pushComment(c, { adopted: true, flash: true });
    setViewers((v) => v + 12 + Math.floor(Math.random() * 24));
    setTimeout(() => setComments((cs) => cs.map((x) => x.id === id ? { ...x, flash: false } : x)), 1700);
  }, [pushComment]);

  const applyStats = useCallback((delta) => {
    setStats((s) => {
      const ns = { ...s };
      Object.entries(delta).forEach(([k, dv]) => {
        if (!dv) return;
        ns[k] = Math.max(0, Math.min(100, Math.round((s[k] || 0) + dv)));
        const fid = uid();
        setFloats((fs) => [...fs, { id: fid, stat: k, delta: dv }]);
        setTimeout(() => setFloats((fs) => fs.filter((f) => f.id !== fid)), 1500);
      });
      if (FATAL.some((k) => ns[k] <= 0)) {
        setTimeout(() => triggerFail(), 900);
      }
      return ns;
    });
  }, []);

  /* ---- AI 事件生成（接 cheney comment_engine；离线时为空走兜底）---- */
  const generateAIEvent = useCallback(async (tileType, cmts) => {
    if (!window.ApiBridge) return null;
    const rawComments = cmts.filter(c => !c.system).slice(-10)
      .map(c => ({ user: c.user, text: c.text, timestamp: c._t || Date.now() }));
    const result = await window.ApiBridge.generateEvent(
      { day, stats, pack, companions: COMPANIONS, history: [], ap: 5, karma: 0 },
      'explore_tile', rawComments);
    return result && result.narrative ? result : null;
  }, [day, stats, pack]);

  const addItem = useCallback((itemId) => {
    const def = ITEMS[itemId]; if (!def) return;
    setPack((p) => {
      const idx = p.findIndex((x) => x.id === itemId);
      let np, slot;
      if (idx >= 0) { np = p.map((x, i) => i === idx ? { ...x, qty: x.qty + 1 } : x); slot = idx; }
      else if (p.length < 6) { np = [...p, { ...def, qty: 1 }]; slot = np.length - 1; }
      else { np = p; slot = null; }
      if (slot != null) { setFlashSlot(slot); setTimeout(() => setFlashSlot(null), 1000); }
      return np;
    });
  }, []);

  const removeItem = useCallback((itemId, qty = 1) => {
    setPack((p) => p.map((x) => x.id === itemId ? { ...x, qty: x.qty - qty } : x).filter((x) => x.qty > 0));
  }, []);

  const toast = useCallback((t) => {
    const id = uid();
    setToasts((ts) => [...ts, { ...t, id }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 3000);
  }, []);

  const showBanner = useCallback((b) => {
    setBanner({ ...b, id: uid() });
    setTimeout(() => setBanner((cur) => (cur && cur.html === b.html ? null : cur)), b.big ? 3600 : 3400);
  }, []);
  const showSpawn = useCallback((pos) => {
    setSpawn({ ...pos, id: uid() }); setTimeout(() => setSpawn(null), 1500);
  }, []);
  const showByTag = useCallback((t) => {
    setByTag({ ...t, id: uid() }); setTimeout(() => setByTag(null), 3000);
  }, []);
  const showPhase = useCallback((p, after) => {
    setPhase({ ...p, id: uid() });
    setTimeout(() => { setPhase(null); after && after(); }, 1700);
  }, []);

  /* 决策 + 实时投票 */
  const openDecision = useCallback((d) => {
    setDecision(d);
    if (voteTimer.current) clearInterval(voteTimer.current);
    if (d.votes) {
      voteTimer.current = setInterval(() => {
        setDecision((cur) => {
          if (!cur || !cur.votes || cur.result) return cur;
          const keys = Object.keys(cur.votes);
          const k = keys[Math.floor(Math.random() * keys.length)];
          return { ...cur, votes: { ...cur.votes, [k]: cur.votes[k] + Math.floor(Math.random() * 3) + 1 } };
        });
      }, 700);
    }
  }, []);
  const closeDecision = useCallback(() => {
    if (voteTimer.current) clearInterval(voteTimer.current);
    setDecision(null);
  }, []);

  /* ---- 阶段导航 ---- */
  const triggerFail = useCallback(() => {
    closeDecision(); setStory(null);
    setChatBanner({ type: "fail", text: "💀 直播结束——主播没能撑过去…" });
    setScene("fail");
  }, [closeDecision]);

  const triggerWin = useCallback(() => {
    closeDecision(); setStory(null);
    setChatBanner({ type: "win", text: "🦠 火星人倒下了！所有观众，我们活到了最后！" });
    setScene("win");
  }, [closeDecision]);

  const goOut = useCallback(() => {
    showPhase({ big: "🌄 出发", sub: "Day " + day + " · 离开" + dwellingForDay(day).name }, () => setScene("destination"));
  }, [day, showPhase]);

  const confirmDest = useCallback((d) => setConfirmD(d), []);
  const goExplore = useCallback(() => {
    setConfirmD(null);
    showPhase({ big: "🚪 抵达 " + (confirmD ? confirmD.name : "目标"), sub: "屏息潜入" },
      () => setScene("explore"));
  }, [confirmD, showPhase]);

  const returnShelter = useCallback(() => {
    const nd = day + 1;
    if (nd > maxDay) {
      showPhase({ big: "🌅 第 " + maxDay + " 天的清晨…", sub: "三脚机器人，再也没有动" }, () => triggerWin());
      return;
    }
    // 补给见底 → 饥饿扣血
    let starve = false;
    setStats((s) => {
      if (s.supply <= 0) { starve = true; return { ...s, life: Math.max(0, s.life - 10) }; }
      return s;
    });
    showPhase({ big: "🌙 Day " + nd + "…", sub: starve ? "饥肠辘辘地挪回栖身处（生命 -10）" : "拖着疲惫的身体回到栖身处" }, () => {
      setDay(nd); setFlags({ knock: false }); setScene("organize");
    });
  }, [day, showPhase, triggerWin]);

  /* ---- 征集创意 ---- */
  const startCTA = useCallback(() => {
    if (cta) return;
    const prompt = sceneRef.current === "explore"
      ? "下一个废墟里会藏着什么？打在公屏上！"
      : "接下来该怎么活下去？把你的主意打在公屏！";
    setCta({ prompt }); setInputHot(true);
    pushComment({ user: "红草观察员", av: "🟥", text: "让红草里钻出一只受伤的难民犬，叼着半块面包！" });
    SPAM_USERS.slice(0, 6).forEach((u, i) =>
      setTimeout(() => streamComment({ ...u, text: "躲起来躲起来" }), 700 + i * 260));
    setTimeout(() => pushSystem("本轮征集共收到 53 条 · 去重合并后 14 条有效创意参与评选 · 重复刷屏不计权重"), 3200);
    setTimeout(() => {
      setCta(null); setInputHot(false);
      adoptComment({ user: "红草观察员", av: "🟥", text: "让红草里钻出一只受伤的难民犬，叼着半块面包！" });
      showBanner({ big: true, icon: "✨",
        html: "<b>@红草观察员</b> 的创意生效了！「红草丛里钻出一只叼着面包的难民犬」" });
      showSpawn({ x: 360, y: 380 });
      showByTag({ x: 300, y: 300, user: "@红草观察员" });
      addItem("bread");
      toast({ icon: "🍞", name: "难民犬叼来的干面包 ×1" });
    }, 8000);
  }, [cta, adoptComment, pushComment, streamComment, pushSystem, showBanner, showSpawn, showByTag, addItem, toast]);

  const resetGame = useCallback(() => {
    closeDecision(); setStory(null); setBanner(null); setCta(null); setInputHot(false);
    setChatBanner(null); setConfirmD(null); setShare(false); setToasts([]); setFloats([]);
    setStats({ ...INIT_STATS }); setPack(initPack()); setDay(1); setFlags({ knock: false }); setScene("home");
  }, [closeDecision]);

  const goScene = useCallback((s) => { closeDecision(); setStory(null); setScene(s); }, [closeDecision]);
  const setFlag = useCallback((k, v) => setFlags((f) => ({ ...f, [k]: v })), []);

  const D = {
    adoptComment, applyStats, addItem, removeItem, toast, injectComment: pushComment,
    banner: showBanner, spawn: showSpawn, byTag: showByTag, story: setStory,
    closeStory: () => setStory(null), decision: openDecision, closeDecision,
    phase: showPhase, goOut, confirmDest, returnShelter, goScene, setFlag, day,
    generateAIEvent,
  };

  useEffect(() => {
    if (scene !== "fail" && scene !== "win") setChatBanner(null);
  }, [scene]);

  /* 隐藏的 review 快捷键：1=失败 2=通关 3=结算 0=重开（空格已被探索潜行占用）*/
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key === "1") triggerFail();
      else if (e.key === "2") triggerWin();
      else if (e.key === "3") { closeDecision(); setStory(null); setScene("settle"); }
      else if (e.key === "0") resetGame();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [triggerFail, triggerWin, resetGame, closeDecision]);

  /* ---- 场景渲染 ---- */
  const renderScene = () => {
    switch (scene) {
      case "home": return <SceneHome D={D} flags={flags} companions={COMPANIONS} />;
      case "organize": return <SceneOrganize D={D} pack={pack} companions={COMPANIONS} />;
      case "destination": return <SceneDestination D={D} />;
      case "explore": return <SceneExplore D={D} />;
      default: return <ShelterBg />;
    }
  };

  const exploredCount = 5, itemCount = pack.reduce((a, b) => a + b.qty, 0);

  /* 开场代入：全屏 cold-open，结束后进入避难所（重开则跳过，不重看）*/
  if (scene === "intro") {
    return (
      <div id="app">
        <SceneIntro onStart={() => setScene("home")} />
      </div>
    );
  }

  return (
    <div id="app">
      <StatusBar day={day} maxDay={maxDay} stats={stats} pack={pack}
        floats={floats} flashSlot={flashSlot} dwelling={dwellingForDay(day)} />

      <div className="main-row">
        <div className="stage-col">
          {scene !== "fail" && scene !== "win" && scene !== "settle" && renderScene()}

          <SpawnFx fx={spawn} />
          <ByTag tag={byTag} />
          <BroadcastBanner banner={banner} />
          <CallToAction cta={cta} />
          {scene !== "settle" && <DecisionCard decision={decision}
            onChoose={(opt) => {
              const res = decision.onChoose ? decision.onChoose(opt) : "";
              if (voteTimer.current) clearInterval(voteTimer.current);
              setDecision((d) => d ? { ...d, result: res } : d);
            }}
            onContinue={() => decision && (decision.onContinue ? decision.onContinue() : closeDecision())} />}
          <StoryCard story={story}
            onContinue={() => story && (story.onContinue ? story.onContinue() : setStory(null))} />
          <ItemToast toasts={toasts} />
          <ConfirmModal confirm={confirmD} onGo={goExplore} onBack={() => setConfirmD(null)} />
          <PhaseTransition phase={phase} />

          {scene === "fail" && <EndingFail days={day}
            onSettle={() => setScene("settle")} onReplay={resetGame} />}
          {scene === "win" && <EndingWin days={day} explored={exploredCount} items={itemCount}
            onSettle={() => setScene("settle")} onShare={() => setShare(true)} />}
          {scene === "settle" && <Settlement outcome="win"
            days={day} onShare={() => setShare(true)} onReplay={resetGame} />}
          {share && <ShareCard onClose={() => setShare(false)} />}

          {/* 主播征集创意按钮 */}
          {(scene === "home" || scene === "organize" || scene === "destination" || scene === "explore") && (
            <div style={{ position: "absolute", top: 18, right: 22, zIndex: 55, display: "flex", gap: 8 }}>
              <button className="btn sm gold" onClick={startCTA} disabled={!!cta}>📢 征集创意</button>
            </div>
          )}
        </div>

        <CommentFeed comments={comments} viewers={viewers}
          inputHot={inputHot} chatBanner={chatBanner} />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
