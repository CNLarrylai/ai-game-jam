/* ===== doom.jsx — 末日生存冷开场:三层递进 ===== */
const { useState, useEffect, useRef } = React;

/* ---- content ---- */
const WORLD_LINES = [
  { t: '瘟疫爆发的第 47 天。', cls: '' },
  { t: '城市早已沉默。', cls: '' },
  { t: '你带着剩下的三个人,往北走。', cls: 'accent2' },
  { t: '背包里的食物,还够撑两天。', cls: 'accent' },
];

const CREW = [
  { key: 'chen', name: '老陈', tag: '曾经的医生', line: ['背包里,还藏着最后几片药。'], rim: 'oklch(0.6 0.06 30 / 0.5)', silTop: 'oklch(0.27 0.02 250)', detail: 'cross' },
  { key: 'yu', name: '小雨', tag: '十六岁', line: ['她的父母,在第 9 天就没了。'], rim: 'oklch(0.66 0.07 70 / 0.45)', silTop: 'oklch(0.3 0.025 70)', detail: 'pony' },
  { key: 'qiang', name: '阿强', tag: '沉默寡言', line: ['没人知道,他到底', '被咬过没有。'], rim: 'oklch(0.6 0.06 200 / 0.4)', silTop: 'oklch(0.22 0.02 240)', detail: 'hood', suspense: true },
];

const SITUATION = [
  { t: '前方出现一座废弃的加油站,玻璃门半开着。', cls: '' },
  { t: '里面可能有食物和药 —— 也可能有别的东西。', cls: '' },
  { t: '天快黑了。', cls: 'dusk' },
];

const CHOICES = [
  {
    id: 'loot', num: '1', act: '进去搜刮', hint: '也许有救命的物资……也许有别的',
    tone: 'bad',
    costs: [{ res: 'food', d: +3 }, { res: 'health', d: -2 }],
    title: '货架后面有动静',
    body: '你们扒拉出半箱罐头,刚要松口气 —— 黑暗里有什么东西扑了出来。老陈把它砸了回去,可他的小臂,被划开了一道口子。',
    foot: '物资到手了。代价,记在了老陈身上。',
  },
  {
    id: 'skip', num: '2', act: '绕开,继续赶路', hint: '安全,但今晚可能要饿肚子',
    tone: 'neutral',
    costs: [{ res: 'food', d: -2 }, { res: 'morale', d: -1 }],
    title: '你们绕了过去',
    body: '没有惊动任何东西,加油站在身后慢慢沉进黑暗。可整夜没有进食,黎明时,每个人的脚步都更沉了一些。',
    foot: '活着,有时候只是因为没去赌那一把。',
  },
  {
    id: 'qiang', num: '3', act: '让阿强一个人进去探', hint: '他主动请缨。但你信得过他吗?',
    tone: 'bad',
    costs: [{ res: 'food', d: +2 }, { res: 'morale', d: -2 }],
    title: '阿强回来了',
    body: '他拎着两罐食物,从半开的门后钻出来,一句话没说。可借着最后一点天光,你看见他卷起的袖口下 —— <span class="tox">一道还在渗血的、新的咬痕。</span>',
    foot: '你拿到了食物。也拿到了一个,不敢问出口的问题。',
  },
];

const START_RES = { food: 4, health: 7, morale: 5 };
const RES_DEF = [
  { id: 'food', ic: '🥫', label: 'Food' },
  { id: 'health', ic: '💊', label: 'Health' },
  { id: 'morale', ic: '🔥', label: 'Morale' },
];

/* ---- tiny ambient + sfx ---- */
let _ac, _drone;
function ensureAudio() {
  if (_ac) return _ac;
  try { _ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  return _ac;
}
function startDrone() {
  const ac = ensureAudio(); if (!ac || _drone) return;
  const o1 = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain();
  o1.type = 'sine'; o1.frequency.value = 55; o2.type = 'sine'; o2.frequency.value = 82.5;
  g.gain.value = 0; o1.connect(g); o2.connect(g); g.connect(ac.destination);
  o1.start(); o2.start(); g.gain.linearRampToValueAtTime(0.05, ac.currentTime + 3);
  _drone = { g, ac };
}
function setMute(m) { if (_drone) _drone.g.gain.linearRampToValueAtTime(m ? 0 : 0.05, _drone.ac.currentTime + 0.4); }
function sfx(type) {
  const ac = ensureAudio(); if (!ac) return;
  if (ac.state === 'suspended') ac.resume();
  const now = ac.currentTime;
  const tone = (f, t0, dur, vol, wave) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = wave || 'sine'; o.frequency.setValueAtTime(f, now + t0);
    g.gain.setValueAtTime(0, now + t0); g.gain.linearRampToValueAtTime(vol, now + t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + t0 + dur);
    o.connect(g).connect(ac.destination); o.start(now + t0); o.stop(now + t0 + dur + 0.03);
  };
  if (type === 'tick') tone(180, 0, 0.16, 0.05, 'triangle');
  else if (type === 'hold') { tone(98, 0, 0.7, 0.08, 'sine'); }
  else if (type === 'bad') { tone(73, 0, 0.9, 0.13, 'sawtooth'); tone(58, 0.2, 0.9, 0.1, 'sawtooth'); }
  else if (type === 'good') { tone(196, 0, 0.4, 0.07); tone(262, 0.14, 0.5, 0.07); }
}

/* ---- ash particles ---- */
function Ash() {
  const bits = useRef(Array.from({ length: 26 }).map(() => ({
    left: Math.random() * 100, dur: 9 + Math.random() * 12, delay: -Math.random() * 18,
    sway: (Math.random() * 80 - 40) + 'px', size: 2 + Math.random() * 2.5, op: 0.3 + Math.random() * 0.4,
  })));
  return (
    <div className="ash">
      {bits.current.map((b, i) => (
        <i key={i} style={{ left: b.left + '%', width: b.size, height: b.size, opacity: b.op,
          '--sway': b.sway, animationDuration: b.dur + 's', animationDelay: b.delay + 's' }}></i>
      ))}
    </div>
  );
}

function Bust({ c }) {
  return (
    <div className="bust" style={{ '--rim': c.rim, '--silTop': c.silTop }}>
      <div className="glow"></div>
      {c.detail === 'pony' && <div className="ponytail"></div>}
      <div className="sil"></div>
      <div className="head"></div>
      {c.detail === 'pony' && <div className="hair"></div>}
      <div className="rim"></div>
      {c.detail === 'hood' && <><div className="hood"></div><div className="faceshadow"></div></>}
      {c.detail === 'cross' && <div className="cross"></div>}
      {c.suspense && <div className="mark"></div>}
    </div>
  );
}

function ResBar({ values, deltas, show }) {
  return (
    <div className={`resbar ${show ? 'show' : ''}`}>
      {RES_DEF.map(r => {
        const v = values[r.id];
        return (
          <div key={r.id} className={`res ${r.id}`}>
            <span className="ic">{r.ic}</span>
            <div className="col">
              <span className="rl">{r.label}</span>
              <div className="seg">
                {Array.from({ length: 10 }).map((_, i) => <span key={i} className={i < v ? 'on' : ''}></span>)}
              </div>
            </div>
            {deltas[r.id] != null && deltas[r.id] !== 0 && (
              <span className={`delta ${deltas[r.id] > 0 ? 'up' : 'down'}`}>{deltas[r.id] > 0 ? '+' : ''}{deltas[r.id]}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function App() {
  const [phase, setPhase] = useState('world'); // world | crew | choice | ending
  const [lineN, setLineN] = useState(0);       // world lines revealed
  const [sitN, setSitN] = useState(0);         // situation lines revealed
  const [crewN, setCrewN] = useState(0);       // crew cards revealed
  const [choicesIn, setChoicesIn] = useState(false);
  const [resShow, setResShow] = useState(false);
  const [dayShow, setDayShow] = useState(false);
  const [values, setValues] = useState(START_RES);
  const [deltas, setDeltas] = useState({});
  const [reveal, setReveal] = useState(null);
  const [flash, setFlash] = useState(null);
  const [shake, setShake] = useState(false);
  const [muted, setMuted] = useState(false);
  const [hairline, setHairline] = useState(8);
  const [sceneShow, setSceneShow] = useState(false);

  const firstClick = useRef(false);
  const onFirstInteract = () => { if (!firstClick.current) { firstClick.current = true; startDrone(); } };

  // ---- layer 1: auto-reveal world lines ----
  useEffect(() => {
    if (phase !== 'world') return;
    setTimeout(() => setDayShow(true), 600);
    if (lineN < WORLD_LINES.length) {
      const t = setTimeout(() => { setLineN(n => n + 1); sfx('tick'); }, lineN === 0 ? 900 : 2100);
      return () => clearTimeout(t);
    }
  }, [phase, lineN]);

  const worldAdvance = () => {
    onFirstInteract();
    if (lineN < WORLD_LINES.length) { setLineN(WORLD_LINES.length); }
    else { goCrew(); }
  };

  const goCrew = () => {
    setPhase('crew'); setHairline(36);
    setTimeout(() => setResShow(true), 1400);
  };

  // ---- layer 2: stagger crew ----
  useEffect(() => {
    if (phase !== 'crew') return;
    if (crewN < CREW.length) {
      const t = setTimeout(() => { setCrewN(n => n + 1); sfx('tick'); }, crewN === 0 ? 500 : 900);
      return () => clearTimeout(t);
    }
  }, [phase, crewN]);

  const goChoice = () => {
    onFirstInteract();
    setPhase('choice'); setHairline(64); setResShow(true);
  };

  // ---- layer 3: situation lines then choices ----
  useEffect(() => {
    if (phase !== 'choice') return;
    if (sitN < SITUATION.length) {
      const t = setTimeout(() => { setSitN(n => n + 1); sfx('tick'); }, sitN === 0 ? 500 : 1500);
      return () => clearTimeout(t);
    } else if (!choicesIn) {
      const t = setTimeout(() => setChoicesIn(true), 500);
      return () => clearTimeout(t);
    }
  }, [phase, sitN]);

  const skipToChoice = () => {
    onFirstInteract();
    setPhase('choice'); setResShow(true); setDayShow(true);
    setSitN(SITUATION.length); setChoicesIn(true); setHairline(64);
  };

  // ---- pick choice → staged reveal ----
  const pick = (choice) => {
    if (reveal) return;
    onFirstInteract();
    const tone = choice.tone === 'neutral' ? 'bad' : choice.tone; // both costs here read as loss/dread
    const net = choice.costs.reduce((s, c) => s + c.d, 0);
    const good = net > 0 && choice.tone === 'good';
    setHairline(100);
    // phase 1: breath-hold
    setReveal({ phase: 'hold', choice }); sfx('hold');
    // phase 2: outcome text
    setTimeout(() => setReveal({ phase: 'show', choice, nums: false }), 1100);
    // phase 3: numbers + feedback
    setTimeout(() => {
      const d = {};
      choice.costs.forEach(c => { d[c.res] = c.d; });
      setDeltas(d);
      setValues(prev => {
        const n = { ...prev };
        choice.costs.forEach(c => { n[c.res] = Math.max(0, Math.min(10, n[c.res] + c.d)); });
        return n;
      });
      setReveal(r => r ? { ...r, nums: true } : r);
      if (good) { setFlash('good'); sfx('good'); }
      else { setFlash('bad'); setShake(true); sfx('bad'); }
      setTimeout(() => { setFlash(null); setShake(false); setDeltas({}); }, 1100);
    }, 2200);
  };

  const goEnding = () => { setReveal(null); setPhase('ending'); };
  const replay = () => {
    setPhase('world'); setLineN(0); setSitN(0); setCrewN(0); setChoicesIn(false);
    setResShow(false); setValues(START_RES); setDeltas({}); setReveal(null); setFlash(null);
    setHairline(8); setSceneShow(false);
  };

  // reveal scene illustration shortly after entering choice (fade in)
  useEffect(() => {
    if (phase === 'choice') { const t = setTimeout(() => setSceneShow(true), 60); return () => clearTimeout(t); }
    setSceneShow(false);
  }, [phase]);

  const toggleMute = () => { const m = !muted; setMuted(m); setMute(m); };

  return (
    <div className={`world ${shake ? 'shake' : ''}`}>
      <DoomArtDefs />
      <div className="horizon"></div>
      {phase === 'world' && <DoomScene name="cityDusk" className={`world-scene ${dayShow ? 'show' : ''}`} />}
      {phase === 'choice' && <DoomScene name="gasStation" className={`choice-scene ${sceneShow ? 'show' : ''}`} />}
      <Ash />
      <div className="grain"></div>
      <div className="vignette"></div>

      {/* tap zone for layer-1 advance */}
      {phase === 'world' && <div className="tap-zone" onClick={worldAdvance}></div>}

      <div className="stage">
        <div className="topbar">
          <div className={`daystamp ${dayShow ? 'show' : ''}`}>
            <span className="d-plague">PLAGUE</span>
            <span className="d-num">DAY <b>47</b></span>
          </div>
          <ResBar values={values} deltas={deltas} show={resShow} />
        </div>

        <div className={`center ${phase === 'choice' ? 'choice-mode' : ''}`}>
          {phase === 'world' && (
            <div className="phase">
              <div className="world-lines">
                {WORLD_LINES.map((l, i) => (
                  <div key={i} className={`wline ${l.cls} ${i < lineN ? 'in' : ''} ${lineN >= WORLD_LINES.length && i < WORLD_LINES.length - 1 ? 'dim' : ''}`}>{l.t}</div>
                ))}
              </div>
              <div className={`advance-hint ${lineN >= WORLD_LINES.length ? 'show' : ''}`} onClick={worldAdvance}>▸ 继续</div>
            </div>
          )}

          {phase === 'crew' && (
            <div className="phase">
              <div className="crew-intro">— 你身后,还剩下三个人 —</div>
              <div className="crew-row">
                {CREW.map((c, i) => (
                  <div key={c.key} className={`survivor ${c.suspense ? 'suspense' : ''} ${i < crewN ? 'in' : ''}`} style={{ transitionDelay: (i * 0.04) + 's' }}>
                    <SurvivorPortrait k={c.key} />
                    <div className="s-name">{c.name}</div>
                    <div className="s-tag">{c.tag}</div>
                    <div className="s-line">{c.line.map((ln, k) => <div key={k}>{k === c.line.length - 1 ? <b>{ln}</b> : ln}</div>)}</div>
                  </div>
                ))}
              </div>
              <button className={`continue ${crewN >= CREW.length ? 'in' : ''}`} onClick={goChoice}>往前走 ▸</button>
            </div>
          )}

          {phase === 'choice' && (
            <div className="phase">
              <div className="situation">
                {SITUATION.map((s, i) => (
                  <div key={i} className={`sit-line ${s.cls} ${i < sitN ? 'in' : ''}`}>{s.t}</div>
                ))}
              </div>
              <div className="choice-list">
                {CHOICES.map((c, i) => (
                  <button key={c.id} className={`choice ${choicesIn ? 'in' : ''}`} style={{ transitionDelay: (i * 0.12) + 's' }} onClick={() => pick(c)}>
                    <span className="c-num">{c.num}</span>
                    <span className="c-body">
                      <span className="c-act">{c.act}</span>
                      <span className="c-hint">{c.hint}</span>
                    </span>
                    <span className="c-arrow">▸</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {phase === 'ending' && (
            <div className="ending">
              <div className="e-title">求 生</div>
              <div className="e-sub">从这一个选择开始,北方还有很长的路。<br />你们能撑过几天,取决于接下来每一个决定。</div>
              <div className="e-note">— 冷开场到此 · 正式游戏在此接入 —</div>
              <button className="e-replay" onClick={replay}>↺ 重看开场</button>
            </div>
          )}
        </div>
      </div>

      {/* reveal */}
      {reveal && (
        <React.Fragment>
          <div className="reveal-scrim"></div>
          <div className={`reveal-box ${reveal.phase === 'show' ? (reveal.choice.tone === 'good' ? 'good' : 'bad') : ''}`}>
            {reveal.phase === 'hold' ? (
              <div className="rv-hold">屏息<div className="dots"><i></i><i></i><i></i></div></div>
            ) : (
              <React.Fragment>
                <div className="rv-kicker">结果</div>
                <div className="rv-title">{reveal.choice.title}</div>
                <div className="rv-body" dangerouslySetInnerHTML={{ __html: reveal.choice.body }}></div>
                {reveal.nums && (
                  <div className="rv-deltas">
                    {reveal.choice.costs.map((c, i) => {
                      const def = RES_DEF.find(r => r.id === c.res);
                      return <span key={i} className={`rv-delta ${c.d > 0 ? 'up' : 'down'}`}>{def.ic} {c.d > 0 ? '+' : ''}{c.d}</span>;
                    })}
                  </div>
                )}
                {reveal.nums && <div className="rv-foot">{reveal.choice.foot}</div>}
                {reveal.nums && <button className="rv-cont" onClick={goEnding}>故事继续 ▸</button>}
              </React.Fragment>
            )}
          </div>
        </React.Fragment>
      )}

      {flash && <div className={`flash ${flash}`}></div>}

      <div className="hairline" style={{ width: hairline + '%' }}></div>
      {(phase === 'world' || phase === 'crew') && <button className="skip" onClick={skipToChoice}>跳过 ⏩</button>}
      <button className="mute" onClick={toggleMute} title="环境音">{muted ? '🔇' : '🔊'}</button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
