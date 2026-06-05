/* ============================================================
   viewer-app.jsx — 看播端 (audience) 7-step journey
   ============================================================ */
const { useState, useEffect, useRef, useCallback } = React;

let _vid = 0;
const vid = () => "v" + (++_vid);
const rand = (a) => a[Math.floor(Math.random() * a.length)];

/* fast hype comments for the live feel */
const FAST_POOL = [
  { user: "夜行猫", av: "🐱", text: "主播这波稳了" },
  { user: "K", av: "🦊", text: "饱腹有点低啊" },
  { user: "废土老兵", av: "🪖", text: "别开那个门" },
  { user: "Z3RO", av: "🤖", text: "哈哈哈哈AI太离谱" },
  { user: "椰奶", av: "🥥", text: "这格子里有东西" },
  { user: "脉冲", av: "📡", text: "投闪避！" },
  { user: "番茄罐头", av: "🥫", text: "666666" },
  { user: "深蓝", av: "🐟", text: "Day3进度好快" },
  { user: "纸鹤", av: "🕊️", text: "那只机械狗能驯服吗" },
  { user: "锈铁", av: "⚙️", text: "苟住别浪" },
  { user: "甜筒", av: "🍦", text: "主播声音好听" },
  { user: "小满", av: "🌙", text: "好紧张啊" },
  { user: "雾", av: "🌫️", text: "去废弃医院！" },
  { user: "阿七", av: "🎲", text: "弹幕护体冲" },
  { user: "电子幽灵", av: "👻", text: "把绷带留着" },
  { user: "Luna", av: "🌟", text: "招募她！看着很强" },
];
const REACTIONS = [
  { user: "番茄罐头", av: "🥫", text: "去去去！军用装备！" },
  { user: "Z3RO", av: "🤖", text: "这个人太强了吧" },
  { user: "脉冲", av: "📡", text: "工厂！必须去" },
  { user: "夜行猫", av: "🐱", text: "楼主创造力满分" },
  { user: "锈铁", av: "⚙️", text: "我也想被采纳…" },
  { user: "甜筒", av: "🍦", text: "主播快选工厂！" },
  { user: "深蓝", av: "🐟", text: "军用装备库 听着就刺激" },
  { user: "Luna", av: "🌟", text: "膜拜世界建筑师🏭" },
];
const BARRAGE_TEXT = ["🏭", "去工厂！", "军用装备！", "太强了", "🏆🏆🏆", "膜拜", "这个人牛", "工厂冲冲冲", "🔥", "+1"];

/* hex geometry (must match viewer-views.jsx) */
const HW = 112, HH = 126, HCX = 600, HCY = 430;
const odd = (x) => ((x % 2) + 2) % 2 === 1;
const hxC = (x, y) => ({ x: HCX + x * (HW * 0.75), y: HCY + y * HH + (odd(x) ? HH / 2 : 0) });

const VIEW_STATS = { hp: 64, hunger: 48, sanity: 70, supply: 66 };
const VIEW_PACK = [
  { id: "can", icon: "🥫", name: "罐头", qty: 3 }, { id: "bandage", icon: "🩹", name: "绷带", qty: 1 },
  { id: "water", icon: "💧", name: "净水", qty: 2 }, { id: "scrap", icon: "🔩", name: "废铁", qty: 2 },
];

/* the streamer's scripted exploration — each tile click reveals an event */
const NE = hxC(1, -1), SE = hxC(1, 0), SS = hxC(0, 1);
const EXPLORE_BEATS = [
  { tile: "ne", tx: NE.x, ty: NE.y, reveal: "💊",
    dec: { icon: "🏥", title: "废弃药房", scene: "pharmacy", desc: "货架翻倒，几盒药散落在地。深处有金属反光。",
      options: [
        { id: "search", icon: "🔍", label: "搜索药品", sub: "细致翻找" },
        { id: "pass", icon: "🏃", label: "快速通过", sub: "拿了就走" },
        { id: "trap", icon: "🪤", label: "设置陷阱", sub: "消耗废铁" }] },
    chosen: "search", optX: 270,
    result: "主播选择「搜索药品」— 翻出一板镇静剂，手被划伤。HP -8，物资 +14。", stats: { hp: -8, supply: 14 } },
  { tile: "se", tx: SE.x, ty: SE.y, reveal: "🧑‍🦲",
    dec: { icon: "🧑‍🦲", title: "拾荒者 老鸦", scene: "street", desc: "「活人？真稀奇。我这儿有罐头和子弹……你拿什么换？」",
      options: [
        { id: "trade", icon: "🔁", label: "交易", sub: "废铁换罐头" },
        { id: "recruit", icon: "🤝", label: "招募", sub: "邀请入队" },
        { id: "info", icon: "🗺️", label: "询问情报", sub: "打听通道" },
        { id: "leave", icon: "🚶", label: "离开", sub: "不冒险" }] },
    chosen: "info", optX: 821,
    result: "主播选择「询问情报」—「地铁隧道尽头那扇门还亮着灯。」记下了逃离方向。理智 +6。", stats: { sanity: 6 } },
];

const STEP_META = {
  1: { cap: "", next: "" },
  2: { cap: "你正在<b>观看</b>主播探索 — 画面与主播实时同步。主播每点开一个格子都会触发事件和选项，你能看到他的每一步操作和结果（你只能看，不能点）。", next: "倒计时归零 ▸" },
  3: { cap: "<b>本轮采集完成。</b>看 —— @老王 的评论真的变成了游戏内容，主播正在探索它！原来评论能影响世界。", next: "主播准备回家 ▸" },
  4: { cap: "轮到你了。<b>在下方输入框</b>写下你的创意发送 —— 等本轮「创意采集」倒计时归零，看看会发生什么。", next: "倒计时归零 ▸" },
  5: { cap: "<b>只有你能看到</b>这条自见通知 —— 你的创意被 AI 采纳了，正在生成专属剧情。", next: "进入新的一天 ▸" },
  6: { cap: "<b>全场高光。</b>你创造的「废弃工厂」出现在地图上，公屏炸了，主播也选了它。", next: "直到游戏结束 ▸" },
  7: { cap: "结算 —— 你拿下了「最强世界建筑师」。", next: "重新体验 ▸" },
};

/* ============================================================ */
function ViewerApp() {
  const [step, setStep] = useState(1);
  const [nick, setNick] = useState("");
  const [avatar, setAvatar] = useState("🦊");

  const [comments, setComments] = useState([]);
  const [viewers, setViewers] = useState(1234);
  const [cd, setCd] = useState({ label: "下一轮创意采集", time: 23, total: 30, hot: false });
  const [collectFlash, setCollectFlash] = useState(false);
  const [goldBanner, setGoldBanner] = useState(null);
  const [bigBanner, setBigBanner] = useState(null);
  const [selfNotif, setSelfNotif] = useState(false);
  const [selfText, setSelfText] = useState("");
  const [barrage, setBarrage] = useState([]);
  const [cursor, setCursor] = useState({ x: HCX, y: HCY, tap: false });
  const [ripples, setRipples] = useState([]);
  const [spawnTile, setSpawnTile] = useState(false);
  const [destPicked, setDestPicked] = useState(false);
  const [chatVal, setChatVal] = useState("");
  const [inputFocus, setInputFocus] = useState(false);
  const [ownSent, setOwnSent] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [vstats, setVstats] = useState({ ...VIEW_STATS });
  const [statFloats, setStatFloats] = useState([]);
  const [revealed, setRevealed] = useState({});
  const [decision, setDecision] = useState(null);
  const [ap, setAp] = useState(3);
  const [phaseWipe, setPhaseWipe] = useState(null);

  const ownId = useRef(null);
  const wangId = useRef(null);
  const ownSentRef = useRef(false);
  const ownAdoptedRef = useRef(false);
  const ownTextRef = useRef("");
  const timers = useRef([]);

  const clr = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const at = (ms, fn) => timers.current.push(setTimeout(fn, ms));

  const pushCmt = useCallback((c, opts = {}) => {
    const id = vid();
    setComments((cs) => [...cs.slice(-60), { ...c, id, ...opts }]);
    return id;
  }, []);

  const ripple = useCallback((x, y) => {
    const id = vid();
    setRipples((r) => [...r, { id, x, y }]);
    setTimeout(() => setRipples((r) => r.filter((z) => z.id !== id)), 1000);
  }, []);

  const applyStats = useCallback((delta) => {
    setVstats((s) => {
      const ns = { ...s };
      Object.entries(delta).forEach(([k, dv]) => {
        ns[k] = Math.max(0, Math.min(100, ns[k] + dv));
        const id = vid();
        setStatFloats((f) => [...f, { id, stat: k, delta: dv }]);
        setTimeout(() => setStatFloats((f) => f.filter((x) => x.id !== id)), 1500);
      });
      return ns;
    });
  }, []);

  /* fast live comment stream */
  useEffect(() => {
    if (step < 2) return;
    const t = setInterval(() => {
      pushCmt(rand(FAST_POOL));
      setViewers((v) => v + Math.floor(Math.random() * 7) - 2);
    }, step === 6 ? 700 : 1600);
    return () => clearInterval(t);
  }, [step, pushCmt]);

  /* countdown loop */
  useEffect(() => {
    if (step < 2 || step === 7 || collectFlash) return;
    const t = setInterval(() => {
      setCd((c) => (c.time <= 0 ? { ...c, time: c.total, hot: false } : { ...c, time: c.time - 1 }));
    }, 1000);
    return () => clearInterval(t);
  }, [step, collectFlash]);

  /* ---- streamer exploration director (step 2) ---- */
  useEffect(() => {
    if (step !== 2) return;
    const local = [];
    const lat = (ms, fn) => local.push(setTimeout(fn, ms));
    let t = 1400;
    EXPLORE_BEATS.forEach((b) => {
      lat(t, () => setCursor({ x: b.tx, y: b.ty, tap: false }));
      lat(t + 850, () => {
        setCursor((c) => ({ ...c, tap: true })); ripple(b.tx, b.ty);
        setRevealed((r) => ({ ...r, [b.tile]: b.reveal })); setAp((a) => Math.max(0, a - 1));
      });
      lat(t + 1500, () => setDecision({ ...b.dec, chosenId: null, result: null }));
      lat(t + 3500, () => setCursor({ x: b.optX, y: 846, tap: false }));
      lat(t + 4300, () => { setCursor((c) => ({ ...c, tap: true })); ripple(b.optX, 846);
        setDecision((d) => (d ? { ...d, chosenId: b.chosen } : d)); });
      lat(t + 5100, () => { setDecision((d) => (d ? { ...d, result: b.result } : d)); applyStats(b.stats); });
      lat(t + 7400, () => { setDecision(null); setCursor({ x: HCX, y: HCY, tap: false }); });
      t += 8200;
    });
    return () => local.forEach(clearTimeout);
  }, [step]);

  /* barrage (step 6) */
  useEffect(() => {
    if (step !== 6) return;
    const t = setInterval(() => {
      const id = vid();
      const b = { id, text: rand(BARRAGE_TEXT), top: 80 + Math.random() * 520,
        dur: 5 + Math.random() * 3, left: 100 + Math.random() * 10 };
      setBarrage((bs) => [...bs.slice(-18), b]);
      setTimeout(() => setBarrage((bs) => bs.filter((x) => x.id !== id)), b.dur * 1000);
    }, 360);
    return () => clearInterval(t);
  }, [step]);

  /* ---- viewer's own creative adoption ---- */
  const adoptOwn = useCallback(() => {
    if (ownAdoptedRef.current) return;
    ownAdoptedRef.current = true;
    setCollectFlash(true);
    setTimeout(() => {
      setCollectFlash(false);
      setSelfText(ownTextRef.current);
      setSelfNotif(true);
      const id = ownId.current;
      if (id) {
        setComments((cs) => cs.map((x) => x.id === id ? { ...x, adopted: true, flash: true } : x));
        setTimeout(() => setComments((cs) => cs.map((x) => x.id === id ? { ...x, flash: false } : x)), 1800);
      }
      setTimeout(() => setSelfNotif(false), 6500);
    }, 1800);
  }, []);

  const sendOwn = () => {
    const fallback = step === 4 ? "明天去废弃工厂，里面有军用装备" : "";
    const text = chatVal.trim() || fallback;
    if (!text) return;
    const id = pushCmt({ user: nick || "你", av: avatar, text }, { own: true });
    ownId.current = id; ownTextRef.current = text; ownSentRef.current = true; setOwnSent(true);
    setChatVal(""); setInputFocus(false);
    if (!ownAdoptedRef.current) { setCd((c) => ({ ...c, time: 5, hot: true })); at(5300, () => adoptOwn()); }
  };

  /* ---- step navigation ---- */
  const enterRoom = () => { setNick(nick.trim() || "未命名观众"); setStep(2); };

  const next = () => {
    if (step === 2) goStep3();
    else if (step === 3) goStep4();
    else if (step === 4) goStep5();
    else if (step === 5) goStep6();
    else if (step === 6) setStep(7);
    else if (step === 7) resetAll();
  };

  const goStep3 = () => {
    clr(); setDecision(null); setStep(3);
    setCd((c) => ({ ...c, time: 0 }));
    setCollectFlash(true);
    at(3000, () => {
      setCollectFlash(false);
      setSpawnTile(true);
      wangId.current = pushCmt({ user: "老王", av: "🦉", text: "地下室肯定藏了弹药，快搜！" },
        { adopted: true, flash: true });
      setGoldBanner({ html: "<b>@老王</b> 的建议生效了！「地下室发现了一箱弹药」" });
      at(1800, () => setComments((cs) => cs.map((x) => x.id === wangId.current ? { ...x, flash: false } : x)));
      at(4000, () => setGoldBanner(null));
      at(1600, () => { setSpawnTile(false); setRevealed((r) => ({ ...r, s: "🧰" })); });
      setCd({ label: "下一轮创意采集", time: 30, total: 30, hot: false });
    });
    // streamer then explores the newly-created tile
    at(5200, () => setCursor({ x: SS.x, y: SS.y, tap: false }));
    at(6050, () => { setCursor((c) => ({ ...c, tap: true })); ripple(SS.x, SS.y); setAp((a) => Math.max(0, a - 1)); });
    at(6700, () => setDecision({ icon: "🧰", title: "地下室 · 弹药库", scene: "bunker", desc: "@老王 说对了——锈蚀的弹药箱就压在塌方下。",
      options: [
        { id: "haul", icon: "📦", label: "搬空弹药", sub: "全部带走" },
        { id: "some", icon: "✋", label: "取一部分", sub: "减重防追兵" },
        { id: "trap", icon: "🪤", label: "留作陷阱", sub: "引爆退路" }],
      chosenId: null, result: null }));
    at(8600, () => setCursor({ x: 270, y: 846, tap: false }));
    at(9400, () => { setCursor((c) => ({ ...c, tap: true })); ripple(270, 846); setDecision((d) => d ? { ...d, chosenId: "haul" } : d); });
    at(10200, () => { setDecision((d) => d ? { ...d, result: "主播选择「搬空弹药」— 整箱军火到手！物资 +20。@老王 的脑洞成了真。" } : d); applyStats({ supply: 20 }); });
    at(12600, () => { setDecision(null); setCursor({ x: HCX, y: HCY, tap: false }); });
  };

  const showWipe = (big, sub) => { setPhaseWipe({ id: vid(), big, sub }); at(2200, () => setPhaseWipe(null)); };

  const goStep4 = () => {
    clr(); setDecision(null); setStep(4);
    showWipe("🎒 行动点已用完", "主播拖着战利品返回避难所 · 今天的探索结束");
    setCd({ label: "下一轮创意采集", time: 14, total: 30, hot: false });
  };

  const goStep5 = () => {
    setStep(5);
    if (!ownSentRef.current) sendOwn();
    setCd((c) => ({ ...c, time: 0, hot: false }));   // completing the round triggers adoption
    if (ownSentRef.current && !ownAdoptedRef.current) at(200, () => adoptOwn());
  };

  const goStep6 = () => {
    setSelfNotif(false); setStep(6);
    showWipe("☀️ Day 4 开始", "新的一天 · 主播选择今天的目的地");
    setCd({ label: "下一轮创意采集", time: 26, total: 30, hot: false });
    at(2500, () => {
      setBigBanner({ html: "🏭 <b>@" + nick + "</b> 为这个世界创造了新地点！「废弃工厂 — 据说里面有军用装备…」" });
      REACTIONS.forEach((r, i) => at(400 + i * 320, () => pushCmt(r, { reaction: true })));
      at(5000, () => setBigBanner(null));
    });
    at(5200, () => { setCursor({ x: 360, y: 300, tap: false });
      at(1000, () => { setCursor((c) => ({ ...c, tap: true })); ripple(360, 300); setDestPicked(true); }); });
  };

  const resetAll = () => {
    clr();
    setStep(1); setComments([]); setSelfNotif(false); setBigBanner(null); setGoldBanner(null);
    setDestPicked(false); setOwnSent(false); setShareOpen(false); setDecision(null);
    setRevealed({}); setAp(3); setVstats({ ...VIEW_STATS }); setSpawnTile(false); setPhaseWipe(null);
    ownId.current = null; ownSentRef.current = false; ownAdoptedRef.current = false; ownTextRef.current = "";
    setCd({ label: "下一轮创意采集", time: 23, total: 30, hot: false });
  };

  /* ---------- render ---------- */
  const cdPct = Math.round((Math.max(0, cd.time) / cd.total) * 100);
  const streamerName = "荒原阿陈";
  const showCursor = (step === 2 || step === 3 || step === 6) && !selfNotif && !collectFlash;

  return (
    <div id="app">
      {step >= 2 && (
        <StatusBar day={3} maxDay={7} stats={vstats} pack={VIEW_PACK} floats={statFloats} flashSlot={null} />
      )}

      <div className="main-row">
        <div className={"stage-col " + (step >= 2 ? "viewer-stage" : "")}>
          {step >= 2 && step <= 3 && <HexWatch spawnTile={spawnTile} revealed={revealed} ap={ap} />}
          {(step === 2 || step === 3) && decision && decision.scene && <EncounterScene name={decision.scene} />}
          {(step === 4 || step === 5) && <NightWatch />}
          {step === 6 && <DestWatch nick={nick} picked={destPicked} />}
          {step === 7 && <SettleWatch nick={nick} avatar={avatar} onShare={() => setShareOpen(true)} />}

          {step >= 2 && (
            <div className="watch-badge"><span className="dot" /> 观看中 · 你看到的与主播同步</div>
          )}

          {/* event/decision card the streamer drives */}
          {(step === 2 || step === 3) && <WatchDecision decision={decision} />}

          {/* collect countdown */}
          {step >= 2 && step <= 6 && (
            <div className={"collect-bar " + (cd.hot ? "hot" : "")}>
              <div className="cb-top">
                <span className="cb-label">🎮 {cd.hot ? "你的创意将出现在游戏中…" : cd.label}</span>
                <span className="cb-time">{Math.max(0, cd.time)}s</span>
              </div>
              <div className="cb-track"><div className="cb-fill" style={{ width: cdPct + "%" }} /></div>
            </div>
          )}

          {/* overlays */}
          {collectFlash && (
            <div className="collect-flash">
              <div className="cf-1">✨ 本轮采集完成！</div>
              <div className="cf-2 cf-dots">正在生成剧情</div>
            </div>
          )}
          {goldBanner && (
            <div className="banner-layer"><div className="banner">
              <span className="b-icon">✨</span>
              <span className="b-text" dangerouslySetInnerHTML={{ __html: goldBanner.html }} />
            </div></div>
          )}
          {bigBanner && (
            <div className="banner-layer"><div className="banner big">
              <span className="b-icon">🏭</span>
              <span className="b-text" dangerouslySetInnerHTML={{ __html: bigBanner.html }} />
            </div></div>
          )}
          {selfNotif && <SelfNotif text={selfText} />}

          {phaseWipe && (
            <div className="phase-wipe" key={phaseWipe.id}>
              <div className="pw-big">{phaseWipe.big}</div>
              {phaseWipe.sub && <div className="pw-sub">{phaseWipe.sub}</div>}
            </div>
          )}
          {step === 6 && (
            <div className="barrage">
              {barrage.map((b) => (
                <div key={b.id} className="bullet"
                  style={{ top: b.top, left: b.left + "%", animationDuration: b.dur + "s" }}>{b.text}</div>
              ))}
            </div>
          )}

          {/* streamer cursor + click ripples (above everything) */}
          {showCursor && (
            <React.Fragment>
              {ripples.map((r) => (
                <div key={r.id} className="click-ripple" style={{ left: r.x, top: r.y }}><i /><i /></div>
              ))}
              <div className={"sync-cursor " + (cursor.tap ? "tap" : "")} style={{ left: cursor.x, top: cursor.y }}>
                <span className="who">主播</span>
              </div>
            </React.Fragment>
          )}

          {/* step caption + next control */}
          {step >= 2 && (
            <React.Fragment>
              <div className="step-caption" dangerouslySetInnerHTML={{ __html: STEP_META[step].cap }} />
              <div className="next-ctrl">
                <div className="step-pip">
                  {[2,3,4,5,6,7].map((s) => <i key={s} className={step >= s ? "on" : ""} />)}
                </div>
                <button className="btn primary" onClick={next}>{STEP_META[step].next}</button>
              </div>
            </React.Fragment>
          )}
        </div>

        <ViewerChat comments={comments} viewers={viewers} streamerName={streamerName}
          canType={step >= 2} chatVal={chatVal} setChatVal={setChatVal}
          inputFocus={inputFocus} setInputFocus={setInputFocus} onSend={sendOwn}
          hot={cd.hot && (step === 4 || ownSentRef.current)} />
      </div>

      {shareOpen && <ShareView nick={nick} avatar={avatar} onClose={() => setShareOpen(false)} />}

      {step === 1 && (
        <EnterPage nick={nick} setNick={setNick} avatar={avatar} setAvatar={setAvatar}
          onEnter={enterRoom} streamerName={streamerName} />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<ViewerApp />);
