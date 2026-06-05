/* ============================================================
   app.jsx — orchestrator: state, director (D), scene routing
   ============================================================ */
const { useState, useEffect, useRef, useCallback } = React;

let _uid = 0;
const uid = () => "u" + (++_uid) + "_" + Date.now();

const INIT_STATS = { hp: 50, hunger: 70, sanity: 60, supply: 70 };
const initPack = () => ([
  { ...ITEMS.can }, { ...ITEMS.bandage }, { ...ITEMS.water }, { ...ITEMS.scrap },
]);

function App(props) {
  const isViewer = props && props.viewerMode;
  const [scene, setScene] = useState("home");
  const [day, setDay] = useState(1);
  const maxDay = 7;
  const [stats, setStats] = useState({ ...INIT_STATS });
  const [pack, setPack] = useState(initPack());
  const [companions, setCompanions] = useState([]);
  const [comments, setComments] = useState([
    { id: uid(), user: "废土老兵", av: "🪖", text: "新的一天，撑住啊主播", mod: true },
    { id: uid(), user: "夜行猫", av: "🐱", text: "第一天，加油啊主播！" },
    { id: uid(), user: "番茄罐头", av: "🥫", text: "物资不多了，出门碰碰运气吧" },
  ]);
  const [viewers, setViewers] = useState(0);
  const [likes, setLikes] = useState(0);
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
  const [viewerCountdown, setViewerCountdown] = useState(30);

  const voteTimer = useRef(null);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  /* ---- VIEWER MODE: receive all state from host via WebSocket ---- */
  useEffect(() => {
    if (!isViewer || !props.viewerWs) return;
    const ws = props.viewerWs;
    const handler = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      if (msg.type === 'state_sync' && msg.data) {
        const d = msg.data;
        if (d.day != null) setDay(d.day);
        if (d.stats) setStats(s => ({ ...s, ...d.stats }));
        if (d.scene) {
          setScene(d.scene);
          // Clear stale explore state when leaving explore scene
          if (d.scene !== 'explore') window.__EXPLORE_STATE__ = null;
        }
        if (d.pack) setPack(d.pack);
        if (d.flags) setFlags(d.flags);
        if (d.companions) setCompanions(d.companions);
        if (d.confirmD !== undefined) setConfirmD(d.confirmD);
        if (d.toasts) setToasts(d.toasts);
        // Decision
        if (d.decision) setDecision(d.decision);
        else if (d.decision === null) setDecision(null);
        // Overlays
        if (d.banner) { setBanner({ ...d.banner, id: uid() }); }
        else if (d.banner === null) setBanner(null);
        if (d.story) setStory(d.story);
        else if (d.story === null) setStory(null);
        if (d.phase) setPhase({ ...d.phase, id: uid() });
        else if (d.phase === null) setPhase(null);
        if (d.cta) setCta(d.cta);
        else if (d.cta === null) setCta(null);
        // Explore internal state
        if (d.explore) window.__EXPLORE_STATE__ = d.explore;
      }
      if (msg.type === 'host_action') {
        if (msg.action === 'explore_state' && msg.data) {
          window.__EXPLORE_STATE__ = msg.data;
        }
        if (msg.action === 'cursor' && msg.data) {
          window.__HOST_CURSOR__ = msg.data;
        }
        if (msg.action === 'click' && msg.data) {
          window.__HOST_CLICK__ = { ...msg.data, t: Date.now() };
        }
      }
      if (msg.type === 'new_comment') {
        streamComment({ user: msg.name || '?', av: msg.avatar || '👤', text: msg.text });
      }
      // Banner from AI generation
      if (msg.type === 'banner' && msg.data) {
        setBanner({ ...msg.data, id: uid() });
        setTimeout(() => setBanner(null), 4500);
      }
      // Game event from AI generation
      if (msg.type === 'game_event' && msg.data) {
        if (isViewer) {
          // Viewer: only show notification, decision comes via state_sync from host
          const ev = msg.data;
          const tid = uid();
          setToasts(ts => [...ts, { id: tid, icon: '🎮', name: 'AI 正在为主播生成新事件...' }]);
          setTimeout(() => setToasts(ts => ts.filter(t => t.id !== tid)), 4000);
        } else {
          // Host: show decision card for host to interact with
          const ev = msg.data;
          if (ev.narrative) {
            setStory({ illus: '✨', text: ev.narrative, source: ev.source_user || '' });
            setTimeout(() => setStory(null), 8000);
          }
          if (ev.options && ev.options.length) {
            setDecision({
              icon: '🎮', title: ev.event_title || 'AI 生成事件',
              desc: ev.narrative || '', options: ev.options,
            });
          }
        }
      }
      // Comment adopted notification
      if (msg.type === 'comment_adopted' && msg.data) {
        if (msg.data.banner) {
          setBanner({ ...msg.data.banner, id: uid() });
          setTimeout(() => setBanner(null), 5000);
        }
      }
      // Comment feedback (accepted/rejected)
      if (msg.type === 'comment_feedback') {
        if (msg.accepted) {
          // Show toast: your comment was accepted
          const tid = uid();
          setToasts(ts => [...ts, { id: tid, icon: '✅', name: msg.category + ' · 已收录，等待采集' }]);
          setTimeout(() => setToasts(ts => ts.filter(t => t.id !== tid)), 3000);
        } else if (msg.reason) {
          const tid = uid();
          setToasts(ts => [...ts, { id: tid, icon: '💬', name: msg.reason, lose: true }]);
          setTimeout(() => setToasts(ts => ts.filter(t => t.id !== tid)), 3000);
        }
      }
    };
    ws.addEventListener('message', handler);
    return () => ws.removeEventListener('message', handler);
  }, [isViewer, props?.viewerWs]);

  /* ---- viewer: 30s countdown for comment collection ---- */
  useEffect(() => {
    if (!isViewer) return;
    const t = setInterval(() => {
      setViewerCountdown(c => c <= 0 ? 30 : c - 1);
    }, 1000);
    return () => clearInterval(t);
  }, [isViewer]);

  /* ---- ambient comment stream (host only) ---- */
  useEffect(() => {
    if (isViewer) return;
    var elapsed = 0;
    const t = setInterval(() => {
      elapsed++;
      const c = (typeof getSceneComment === "function")
        ? getSceneComment(sceneRef.current)
        : AMBIENT_COMMENTS[Math.floor(Math.random() * AMBIENT_COMMENTS.length)];
      if (elapsed >= 3) streamComment({ ...c });
      // Viewers ramp up then stabilize
      if (elapsed <= 10) {
        setViewers((v) => v + Math.floor(Math.random() * 30) + 10);
      } else {
        setViewers((v) => Math.max(0, v + Math.floor(Math.random() * 9) - 3));
      }
      // Likes grow steadily
      setLikes((l) => l + Math.floor(Math.random() * 5));
    }, 2900);
    return () => clearInterval(t);
  }, []);

  /* spam-burst simulator — demonstrates anti-pollution: a flood of identical
     comments collapses into ONE muted ×N line, then the AI posts a notice that
     repeating the same content gains no adoption weight. */
  useEffect(() => {
    if (isViewer) return;
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
    // Classify comment — skip noise if API bridge is available
    const classification = window.ApiBridge ? window.ApiBridge.classifyComment(c.text) : { actionable: true };
    if (!classification.actionable) return;
    // Also post adopted comment to server buffer
    if (window.ApiBridge) { window.ApiBridge.postComment(c.user || 'anonymous', c.text); }
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
      if (["hp", "hunger", "sanity", "supply"].some((k) => ns[k] <= 0)) {
        setTimeout(() => triggerFail(), 900);
      }
      return ns;
    });
  }, []);

  /* ---- AI event generation (API bridge) ---- */
  const generateAIEvent = useCallback(async (tileType, comments) => {
    const rawComments = comments
      .filter(c => !c.system)
      .slice(-10)
      .map(c => ({ user: c.user, text: c.text, timestamp: c._t || Date.now() }));

    const result = await window.ApiBridge.generateEvent(
      { day, stats, pack, companions: companions, history: [], ap: 5, karma: 0 },
      'explore_tile',
      rawComments
    );

    if (result && result.narrative) {
      return result;
    }
    return null; // fall back to hardcoded
  }, [day, stats, pack]);

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
    // Likes burst when event triggers
    setLikes((l) => l + Math.floor(Math.random() * 50) + 20);
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
      setDay(nd); setScene("organize");
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
    phase: showPhase, goOut, confirmDest, returnShelter, goScene, setFlag, day, stats,
    addCompanion: (c) => { setCompanions((prev) => [...prev, c]); },
    generateAIEvent,
  };

  /* enter-scene chat banners */
  useEffect(() => {
    if (scene !== "fail" && scene !== "win") setChatBanner(null);
  }, [scene]);

  /* ---- periodically check server comment buffer for actionable comments ---- */
  useEffect(() => {
    if (isViewer || !window.ApiBridge) return;
    const interval = setInterval(async () => {
      const serverComments = await ApiBridge.getComments();
      if (serverComments.length > 0) {
        // Find actionable ones
        const actionable = serverComments.filter(c => {
          const cls = ApiBridge.classifyComment(c.text);
          return cls.actionable;
        });
        if (actionable.length > 0 && sceneRef.current === 'explore') {
          // Could trigger an AI event here
          console.log('[API] Actionable comments found:', actionable.length);
        }
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  /* ---- broadcast FULL game state for spectators (WebSocket) ---- */
  useEffect(() => {
    if (!isViewer && window.WsSync && WsSync.connected) {
      WsSync.broadcastGameState({
        day, stats, scene,
        pack: pack.map(i => ({ id: i.id, name: i.name, qty: i.qty, icon: i.icon })),
        decision: decision ? {
          icon: decision.icon, title: decision.title, desc: decision.desc,
          options: decision.options || decision.opts, votes: decision.votes, result: decision.result
        } : null,
        banner: banner ? { icon: banner.icon, html: banner.html, big: banner.big } : null,
        story: story ? { illus: story.illus, text: story.text, source: story.source } : null,
        phase: phase ? { big: phase.big, sub: phase.sub } : null,
        cta: cta ? { prompt: cta.prompt } : null,
        flags: flags,
        companions: companions.map(c => ({
          id: c.id, name: c.name, av: c.av, role: c.role, status: c.status, hp: c.hp, mood: c.mood,
          detail: c.detail || "", ask: c.ask || "",
          skill: c.skill ? { id: c.skill.id, label: c.skill.label, icon: c.skill.icon, note: c.skill.note, effect: c.skill.effect, line: c.skill.line } : { id:"", label:"", icon:"", note:"", effect:{}, line:"" },
        })),
        confirmD: confirmD ? { name: confirmD.name, confirm: confirmD.confirm, icon: confirmD.icon, danger: confirmD.danger, ap: confirmD.ap } : null,
        toasts: toasts.map(t => ({ id: t.id, icon: t.icon, name: t.name, lose: t.lose })),
        explore: window.__EXPLORE_STATE__ || null,
      });
    }
  }, [day, stats, scene, decision, banner, story, phase, cta, flags, pack, companions, confirmD, share]);

  // Broadcast explore internal state changes separately (since they're in a child component)
  useEffect(() => {
    if (isViewer || scene !== 'explore') return;
    const t = setInterval(() => {
      if (window.WsSync && WsSync.connected && window.__EXPLORE_STATE__) {
        WsSync.send({ type: 'host_action', action: 'explore_state', data: window.__EXPLORE_STATE__ });
      }
    }, 1000);
    return () => clearInterval(t);
  }, [scene]);

  /* ---- receive viewer comments via WebSocket ---- */
  useEffect(() => {
    if (isViewer || !window.WsSync) return;
    const onViewerComment = (msg) => {
      streamComment({ user: msg.name, av: msg.avatar, text: msg.text });
    };
    const onViewerJoin = (msg) => {
      setViewers(msg.viewerCount || viewers);
      pushComment({ user: "系统", av: "📢", text: (msg.name || "新观众") + " 进入了直播间", system: true });
    };
    const onViewerLeave = (msg) => {
      setViewers(msg.viewerCount || viewers);
    };
    // Host receives AI-generated events from bridge
    const onGameEvent = (msg) => {
      const ev = msg.data || {};
      const cat = ev.final_category || ev.type || '';
      const source = ev.source_user || '观众';
      console.log('[HOST] AI game_event:', cat, ev.narrative?.substring(0, 60));

      // ============ LOCATION: 新增目的地 ============
      if (cat === 'LOCATION' || cat === 'LOCATION_PASSTHROUGH') {
        const locName = ev.event_title || ev.name || ev.narrative?.match(/「(.+?)」/)?.[1] || '观众创造的地点';
        const newDest = {
          id: 'gen_' + Date.now(), icon: '✨', name: locName,
          danger: ev.danger_level || 3, reward: ev.reward || '未知',
          ap: ev.ap || 3, generated: true, by: source,
          confirm: '确定前往「' + locName + '」？这是观众 @' + source + ' 创造的地点。'
        };
        // Add to DESTINATIONS global
        if (window.DESTINATIONS) window.DESTINATIONS.push(newDest);
        showBanner({ big: true, icon: '🏭', html: '<b>@' + source + '</b> 创造了新地点！「' + locName + '」已加入目的地列表' });
        toast({ icon: '🗺️', name: '新目的地: ' + locName + ' (by @' + source + ')' });
        return;
      }

      // ============ EVENT/CHARACTER: 新增选项或弹决策 ============
      if (cat === 'EVENT' || cat === 'CHARACTER' || cat === 'NPC_ENCOUNTER' || cat === 'EVENT_TRIGGER') {
        // If there's already an active decision, inject a new option from the viewer
        if (decision && !decision.result) {
          const newOpt = {
            id: 'viewer_' + Date.now(),
            label: ev.event_title || ev.narrative?.substring(0, 20) || '观众创意',
            icon: '✨',
            sub: '由 @' + source + ' 创造'
          };
          setDecision(d => d ? {
            ...d,
            options: [...(d.options || []), newOpt],
          } : d);
          showBanner({ icon: '✨', html: '<b>@' + source + '</b> 为当前事件添加了新选项！「' + newOpt.label + '」' });
          return;
        }

        // No active decision — create a new one
        const opts = (ev.options || []).map(o =>
          typeof o === 'string' ? { id: o, label: o, icon: '▸' }
          : { id: o.id || o.label, label: o.label || o.text, icon: o.icon || '▸', sub: o.sub || '' }
        );
        showBanner({ big: true, icon: '✨', html: '<b>@' + source + '</b> 的创意生效了！' + (ev.event_title ? '「' + ev.event_title + '」' : '') });
        if (opts.length) {
          setTimeout(() => {
            openDecision({
              id: 'ai_' + Date.now(), icon: '🎮',
              title: ev.event_title || 'AI 生成事件 (by @' + source + ')',
              desc: ev.narrative || '',
              options: opts,
              onChoose: (opt) => {
                if (window.WsSync && WsSync.connected) {
                  WsSync.send({ type: 'host_action', action: 'choice', data: { choice: opt.label || opt.id } });
                }
                return '你选择了「' + (opt.label || opt.id) + '」，等待结果...';
              },
              onContinue: () => closeDecision(),
            });
          }, 1500);
        } else if (ev.narrative) {
          setStory({ illus: '✨', text: ev.narrative, source: '@' + source, onContinue: () => setStory(null) });
        }
      }

      // ============ ITEM: 获得物品 ============
      if (cat === 'ITEM' || cat === 'ITEM_RECEIVED') {
        const itemName = ev.event_title || ev.name || ev.narrative?.match(/「(.+?)」/)?.[1] || '神秘物品';
        showBanner({ icon: '✨', html: '<b>@' + source + '</b> 的创意生效了！获得「' + itemName + '」' });
        toast({ icon: '🎒', name: '获得: ' + itemName + ' (by @' + source + ')' });
        if (ev.narrative) {
          pushComment({ user: '🎮 系统', av: '🎮', text: ev.narrative, system: true });
        }
      }

      // Apply stat changes if any
      if (ev.stat_changes) {
        const delta = {};
        if (ev.stat_changes.hp) delta.hp = ev.stat_changes.hp;
        if (ev.stat_changes.hunger) delta.hunger = ev.stat_changes.hunger;
        if (ev.stat_changes.sanity) delta.sanity = ev.stat_changes.sanity;
        if (ev.stat_changes.thirst) delta.supply = ev.stat_changes.thirst;
        if (Object.keys(delta).length) applyStats(delta);
      }
      if (ev.inventory_change?.add_items) {
        ev.inventory_change.add_items.forEach(item => toast({ icon: '🎒', name: '获得: ' + item }));
      }
    };
    const onBanner = (msg) => {
      if (msg.data) showBanner({ ...msg.data, id: Date.now() });
    };
    const onChoiceResult = (msg) => {
      const r = msg.data || {};
      if (r.narrative) {
        closeDecision();
        setStory({ illus: '📖', text: r.narrative, source: '', onContinue: () => setStory(null) });
      }
      if (r.stat_changes) {
        const delta = {};
        Object.entries(r.stat_changes).forEach(([k, v]) => { if (v) delta[k] = v; });
        if (Object.keys(delta).length) applyStats(delta);
      }
    };

    WsSync.on('viewer_comment', onViewerComment);
    WsSync.on('viewer_join', onViewerJoin);
    WsSync.on('viewer_leave', onViewerLeave);
    WsSync.on('game_event', onGameEvent);
    WsSync.on('banner', onBanner);
    WsSync.on('choice_result', onChoiceResult);
    return () => {
      WsSync.off('viewer_comment', onViewerComment);
      WsSync.off('viewer_join', onViewerJoin);
      WsSync.off('viewer_leave', onViewerLeave);
      WsSync.off('game_event', onGameEvent);
      WsSync.off('banner', onBanner);
      WsSync.off('choice_result', onChoiceResult);
    };
  }, []);

  /* hidden review shortcuts (NOT visible streamer controls): 1=fail 2=win 3=settle 0=restart */
  useEffect(() => {
    if (isViewer) return;
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

  /* ---- broadcast cursor position for viewers ---- */
  useEffect(() => {
    if (isViewer || !window.WsSync || !WsSync.connected) return;
    const stage = document.querySelector('.stage-col');
    if (!stage) return;
    let last = 0;
    const onMove = (e) => {
      const now = Date.now();
      if (now - last < 200) return; // throttle to ~5fps
      last = now;
      const rect = stage.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width * 1920 * 0.7) | 0;
      const y = ((e.clientY - rect.top) / rect.height * 1080) | 0;
      WsSync.broadcastAction('cursor', { x, y });
    };
    const onClick = (e) => {
      const rect = stage.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width * 1920 * 0.7) | 0;
      const y = ((e.clientY - rect.top) / rect.height * 1080) | 0;
      WsSync.broadcastAction('click', { x, y });
    };
    stage.addEventListener('mousemove', onMove);
    stage.addEventListener('click', onClick);
    return () => { stage.removeEventListener('mousemove', onMove); stage.removeEventListener('click', onClick); };
  }, [scene]);

  /* ---- render scene ---- */
  const renderScene = () => {
    switch (scene) {
      case "home": return <SceneHome D={D} flags={flags} companions={companions} />;
      case "organize": return <SceneOrganize D={D} pack={pack} companions={companions} />;
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
        <div className={"stage-col" + (isViewer ? " viewer-stage" : "")}>
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

          {/* viewer: watch badge + countdown bar */}
          {isViewer && (
            <React.Fragment>
              <div className="watch-badge">
                <span className="dot" style={{ background: props?.viewerConnected ? 'var(--green)' : 'var(--red)' }} />
                {props?.viewerConnected ? '已同步 · Day ' + day + ' · 观看中' : '连接中...'}
              </div>
              <div className="collect-bar" style={{ position: 'absolute', left: '50%', bottom: 104, transform: 'translateX(-50%)', zIndex: 100, width: '56%', background: 'rgba(10,8,20,.9)', border: '2px solid var(--gold)', boxShadow: '0 0 22px rgba(255,207,63,.3)', padding: '12px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 9 }}>
                  <span style={{ fontSize: 'var(--t-sm)', color: 'var(--gold)' }}>🎮 {viewerCountdown <= 3 ? '正在采集评论...' : '下一轮创意采集'}</span>
                  <span style={{ fontFamily: 'var(--pixel)', fontSize: 'var(--t-md)', color: '#fff' }}>{viewerCountdown}s</span>
                </div>
                <div style={{ height: 12, background: '#0c0a1c', border: '2px solid var(--line)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--gold-deep), var(--gold))', width: Math.round((viewerCountdown / 30) * 100) + '%', transition: 'width 1s linear' }} />
                </div>
              </div>
            </React.Fragment>
          )}

          {/* streamer call-to-action button (only legitimate top control) */}
          {(scene === "home" || scene === "organize" || scene === "destination" || scene === "explore") && (
            <div style={{ position: "absolute", top: 18, right: 22, zIndex: 55, display: "flex", gap: 8 }}>
              <button className="btn sm gold" onClick={startCTA} disabled={!!cta}>📢 征集创意</button>
            </div>
          )}
        </div>

        <CommentFeed comments={comments} viewers={viewers} likes={likes}
          inputHot={inputHot} chatBanner={chatBanner}
          isViewer={isViewer}
          viewerChatVal={props?.viewerChatVal || ""}
          viewerSetChatVal={props?.viewerSetChatVal}
          viewerSendComment={props?.viewerSendComment} />
      </div>
    </div>
  );
}

// Expose App globally so viewer-app.jsx can use it
window.App = App;

// Only auto-mount if NOT in viewer mode (viewer-app.jsx mounts its own wrapper)
if (!window.__VIEWER_MODE__) {
  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
}
