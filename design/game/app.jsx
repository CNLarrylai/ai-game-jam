/* ============================================================
   app.jsx — orchestrator: state, director (D), scene routing
   ============================================================ */
const { useState, useEffect, useRef, useCallback } = React;

let _uid = 0;
const uid = () => "u" + (++_uid) + "_" + Date.now();

const INIT_STATS = { hp: 78, hunger: 52, sanity: 64, supply: 70 };
const initPack = () => ([
  { ...ITEMS.can }, { ...ITEMS.bandage }, { ...ITEMS.water }, { ...ITEMS.scrap },
]);

function App() {
  const [scene, setScene] = useState("home");
  const [day, setDay] = useState(3);
  const maxDay = 7;
  const [stats, setStats] = useState({ ...INIT_STATS });
  const [pack, setPack] = useState(initPack());
  const [comments, setComments] = useState([
    { id: uid(), user: "废土老兵", av: "🪖", text: "新的一天，撑住啊主播", mod: true },
    { id: uid(), user: "夜行猫", av: "🐱", text: "Day3了！进度好快" },
    { id: uid(), user: "番茄罐头", av: "🥫", text: "饱腹有点低 记得吃东西" },
  ]);
  const [viewers, setViewers] = useState(8421);
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

  /* ---- ambient comment stream ---- */
  useEffect(() => {
    const t = setInterval(() => {
      const c = AMBIENT_COMMENTS[Math.floor(Math.random() * AMBIENT_COMMENTS.length)];
      streamComment({ ...c });
      setViewers((v) => v + Math.floor(Math.random() * 9) - 3);
    }, 2900);
    return () => clearInterval(t);
  }, []);

  /* spam-burst simulator — demonstrates anti-pollution: a flood of identical
     comments collapses into ONE muted ×N line, then the AI posts a notice that
     repeating the same content gains no adoption weight. */
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
    const first = setTimeout(burst, 7000);
    const iv = setInterval(burst, 20000);
    return () => { clearTimeout(first); clearInterval(iv); timers.forEach(clearTimeout); };
  }, []); // streamComment/pushSystem are stable useCallbacks defined below

  /* ============ DIRECTOR ============ */
  const pushComment = useCallback((c, opts = {}) => {
    const id = uid();
    setComments((cs) => [...cs.slice(-26), { ...c, id, _t: Date.now(), ...opts }]);
    return id;
  }, []);

  /* dedupe: identical text within a short window merges in-place (no new line,
     just a muted ×N counter) so spamming the same content can't pollute the feed
     or gain adoption weight. */
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
    const id = pushComment(c, { adopted: true, flash: true });
    setViewers((v) => v + 12 + Math.floor(Math.random() * 20));
    setTimeout(() => setComments((cs) => cs.map((x) => x.id === id ? { ...x, flash: false } : x)), 1700);
  }, [pushComment]);

  const applyStats = useCallback((delta) => {
    setStats((s) => {
      const ns = { ...s };
      Object.entries(delta).forEach(([k, dv]) => {
        ns[k] = Math.max(0, Math.min(100, Math.round((s[k] || 0) + dv)));
        const fid = uid();
        setFloats((fs) => [...fs, { id: fid, stat: k, delta: dv }]);
        setTimeout(() => setFloats((fs) => fs.filter((f) => f.id !== fid)), 1500);
      });
      // death check
      if (["hp", "hunger", "sanity"].some((k) => ns[k] <= 0)) {
        setTimeout(() => triggerFail(), 900);
      }
      return ns;
    });
  }, []);

  const addItem = useCallback((itemId) => {
    const def = ITEMS[itemId]; if (!def) return;
    setPack((p) => {
      const idx = p.findIndex((x) => x.id === itemId);
      let np, slot;
      if (idx >= 0) { np = p.map((x, i) => i === idx ? { ...x, qty: x.qty + 1 } : x); slot = idx; }
      else if (p.length < 6) { np = [...p, { ...def, qty: 1 }]; slot = np.length - 1; }
      else { np = p; slot = null; }
      if (slot != null) {
        setFlashSlot(slot);
        setTimeout(() => setFlashSlot(null), 1000);
      }
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
    setSpawn({ ...pos, id: uid() });
    setTimeout(() => setSpawn(null), 1500);
  }, []);
  const showByTag = useCallback((t) => {
    setByTag({ ...t, id: uid() });
    setTimeout(() => setByTag(null), 3000);
  }, []);

  const showPhase = useCallback((p, after) => {
    setPhase({ ...p, id: uid() });
    setTimeout(() => { setPhase(null); after && after(); }, 1700);
  }, []);

  /* decision + live votes */
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

  /* ---- phase navigation helpers ---- */
  const triggerFail = useCallback(() => {
    closeDecision(); setStory(null);
    setChatBanner({ type: "fail", text: "💀 游戏结束！主播倒下了…" });
    setScene("fail");
  }, [closeDecision]);

  const triggerWin = useCallback(() => {
    closeDecision(); setStory(null);
    setChatBanner({ type: "win", text: "🏆 通关！恭喜所有参与者！" });
    setScene("win");
  }, [closeDecision]);

  const goOut = useCallback(() => {
    showPhase({ big: "☀️ 准备出发", sub: "Day " + day + " · 离开避难所" }, () => setScene("destination"));
  }, [day, showPhase]);

  const confirmDest = useCallback((d) => setConfirmD(d), []);
  const goExplore = useCallback(() => {
    setConfirmD(null);
    showPhase({ big: "🚪 抵达 " + (confirmD ? confirmD.name : "目标"), sub: "进入探索" },
      () => setScene("explore"));
  }, [confirmD, showPhase]);

  const returnShelter = useCallback(() => {
    const nd = day + 1;
    if (nd > maxDay) {
      showPhase({ big: "🌙 Day " + maxDay + " 结束", sub: "七天了，城市的出口仍未找到…" }, () => triggerFail());
      return;
    }
    showPhase({ big: "🌙 Day " + nd + " 开始…", sub: "拖着战利品回到避难所" }, () => {
      setDay(nd); setFlags({ knock: false }); setScene("organize");
    });
  }, [day, showPhase, triggerFail]);

  /* ---- 征集创意 (call to action) ---- */
  const startCTA = useCallback(() => {
    if (cta) return;
    const prompt = sceneRef.current === "explore"
      ? "下一个探索格子里会出现什么？在评论区告诉我！"
      : "接下来该发生什么？把你的创意打在公屏上！";
    setCta({ prompt }); setInputHot(true);
    pushComment({ user: "小明", av: "🐧", text: "出现一只会说话的机械狗，守着逃生通道！" });
    // viewers pile on with identical spam — gets merged, not amplified
    SPAM_USERS.slice(0, 6).forEach((u, i) =>
      setTimeout(() => streamComment({ ...u, text: "机械狗机械狗机械狗" }), 700 + i * 260));
    setTimeout(() => pushSystem("本轮征集共收到 47 条 · 去重合并后 12 条有效创意参与评选 · 重复刷屏不计权重"), 3200);
    setTimeout(() => {
      setCta(null); setInputHot(false);
      adoptComment({ user: "小明", av: "🐧", text: "出现一只会说话的机械狗，守着逃生通道！" });
      showBanner({ big: true, icon: "✨",
        html: "<b>@小明</b> 的创意生效了！「废弃医院里出现了一只机械狗」" });
      showSpawn({ x: 360, y: 380 });
      showByTag({ x: 300, y: 300, user: "@小明" });
    }, 8000);
  }, [cta, adoptComment, pushComment, streamComment, pushSystem, showBanner, showSpawn, showByTag]);

  /* ---- demo story trigger ---- */
  const demoStory = useCallback(() => {
    showBanner({ big: true, icon: "✨", html: "<b>@纸鹤</b> 的创意生效了！「机械守卫苏醒了」" });
    setTimeout(() => setStory({
      illus: "🤖", source: "@纸鹤",
      text: "红色的光学镜在黑暗中亮起。生锈的机械犬抬起头，关节发出刺耳的摩擦声——它认出了你身上的体温。",
      onContinue: () => setStory(null),
    }), 1200);
  }, [showBanner]);

  const resetGame = useCallback(() => {
    closeDecision(); setStory(null); setBanner(null); setCta(null); setInputHot(false);
    setChatBanner(null); setConfirmD(null); setShare(false); setToasts([]); setFloats([]);
    setStats({ ...INIT_STATS }); setPack(initPack()); setDay(3); setFlags({ knock: false }); setScene("home");
  }, [closeDecision]);

  const goScene = useCallback((s) => { closeDecision(); setStory(null); setScene(s); }, [closeDecision]);
  const setFlag = useCallback((k, v) => setFlags((f) => ({ ...f, [k]: v })), []);

  const D = {
    adoptComment, applyStats, addItem, removeItem, toast, injectComment: pushComment,
    banner: showBanner, spawn: showSpawn, byTag: showByTag, story: setStory,
    closeStory: () => setStory(null), decision: openDecision, closeDecision,
    phase: showPhase, goOut, confirmDest, returnShelter, goScene, setFlag, day,
    injectCompanionLater: () => {},
  };

  /* enter-scene chat banners */
  useEffect(() => {
    if (scene !== "fail" && scene !== "win") setChatBanner(null);
  }, [scene]);

  /* hidden review shortcuts (NOT visible streamer controls): 1=fail 2=win 3=settle 0=restart */
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

  /* ---- render scene ---- */
  const renderScene = () => {
    switch (scene) {
      case "home": return <SceneHome D={D} flags={flags} companions={COMPANIONS} />;
      case "organize": return <SceneOrganize D={D} pack={pack} companions={COMPANIONS} />;
      case "destination": return <SceneDestination D={D} />;
      case "explore": return <SceneExplore D={D} />;
      default: return <ShelterBg />;
    }
  };

  const exploredCount = 4, itemCount = pack.reduce((a, b) => a + b.qty, 0);

  const NAV = [
    ["home", "家中"], ["organize", "整理资源"], ["destination", "选择目的地"],
    ["explore", "探索地图"], ["fail", "失败"], ["win", "胜利"], ["settle", "结算"],
  ];

  return (
    <div id="app">
      <StatusBar day={day} maxDay={maxDay} stats={stats} pack={pack}
        floats={floats} flashSlot={flashSlot} />

      <div className="main-row">
        <div className="stage-col">
          {scene !== "fail" && scene !== "win" && scene !== "settle" && renderScene()}

          {/* overlays */}
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

          {/* endings */}
          {scene === "fail" && <EndingFail days={day}
            onSettle={() => setScene("settle")} onReplay={resetGame} />}
          {scene === "win" && <EndingWin days={day} explored={exploredCount} items={itemCount}
            onSettle={() => setScene("settle")} onShare={() => setShare(true)} />}
          {scene === "settle" && <Settlement outcome="win"
            days={5} onShare={() => setShare(true)} onReplay={resetGame} />}
          {share && <ShareCard onClose={() => setShare(false)} />}

          {/* streamer call-to-action button (only legitimate top control) */}
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
