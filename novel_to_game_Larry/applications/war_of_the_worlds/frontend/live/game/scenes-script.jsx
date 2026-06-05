/* ============================================================
   scenes-script.jsx — 开局对白演出（scripted scene）
   NPC↔玩家 你来我往的剧情过场，勾出当天情景 + 任务。
   数据来自技能契约 dist/opening.json（window.WL_OPENING，见 OPENING_SCENE_SPEC.md）。
   空格 / 回车 / 点击：未打完→立即显示整句；已打完→下一句；末句→任务卡→进游戏。
   ============================================================ */
const { useState: useStateS, useEffect: useEffectS } = React;

function SceneScript({ scene, onDone }) {
  const lines = (scene && scene.lines) || [];
  const [idx, setIdx] = useStateS(0);
  const [typed, setTyped] = useStateS("");
  const [done, setDone] = useStateS(false);
  const [obj, setObj] = useStateS(false);

  const cur = lines[idx];

  // 空场景保护：直接收尾
  useEffectS(() => { if (!lines.length) onDone(); }, []);

  // 当前句打字机
  useEffectS(() => {
    if (obj || !cur) return;
    setTyped(""); setDone(false);
    let i = 0; const full = cur.text;
    const t = setInterval(() => {
      i++; setTyped(full.slice(0, i));
      if (i >= full.length) { clearInterval(t); setDone(true); }
    }, 30);
    return () => clearInterval(t);
  }, [idx, obj]);

  const advance = () => {
    if (obj) return;                       // 任务卡只能点按钮关闭,空格/点背景不跳过,确保读完
    if (!done) { setTyped(cur.text); setDone(true); return; }
    if (idx < lines.length - 1) setIdx((n) => n + 1);
    else setObj(true);
  };

  useEffectS(() => {
    const onKey = (e) => {
      if (e.code === "Space" || e.key === "Enter") { e.preventDefault(); advance(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, done, obj]);

  if (!lines.length) return null;

  // 左右两侧立绘：已登场角色各占一边,说话者高亮、另一边压暗
  const leftChar = lines.find((l) => l.side === "left");
  const rightChar = lines.find((l) => l.side === "right");
  const speakingSide = cur ? cur.side : null;

  const Portrait = ({ ch, side }) => {
    if (!ch) return <div className="sc-portrait empty" />;
    const active = speakingSide === side && !obj;
    return (
      <div className={"sc-portrait " + side + (active ? " active" : " dim")}>
        <div className="sc-av">{ch.av}</div>
        <div className="sc-name">{ch.speaker}</div>
      </div>
    );
  };

  return (
    <div className="script-stage" onClick={advance}>
      <div className="sc-sky" />
      <div className="sc-vignette" />

      <div className="sc-setting">{scene.setting}</div>
      <button className="intro-skip" onClick={(e) => { e.stopPropagation(); onDone(); }}>
        跳过 ⏭
      </button>

      <div className="sc-stage-row">
        <Portrait ch={leftChar} side="left" />
        <Portrait ch={rightChar} side="right" />
      </div>

      {!obj ? (
        <div className="sc-box">
          <div className={"sc-speaker " + cur.side}>{cur.av} {cur.speaker}</div>
          <div className="sc-text">
            {typed}{!done && <span className="caret">▋</span>}
          </div>
          <div className="sc-hint">{done ? "空格 / 点击 继续 ▸" : "（点击立即显示整句）"}</div>
        </div>
      ) : (
        <div className="sc-objective">
          <div className="sc-obj-badge">📜 今日</div>
          <div className="sc-obj-text">{scene.objective}</div>
          <button className="btn gold" onClick={(e) => { e.stopPropagation(); onDone(); }}>
            开始这一天 →
          </button>
        </div>
      )}

      {!obj && (
        <div className="sc-progress">
          {lines.map((_, k) => (
            <div key={k} className={"sc-dot " + (k === idx ? "cur" : k < idx ? "done" : "")} />
          ))}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { SceneScript });
