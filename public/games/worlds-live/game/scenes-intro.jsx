/* ============================================================
   scenes-intro.jsx — 开场代入（cold-open）
   拍子来自技能契约 dist/intro.json（引导加载后挂在 window.WL_INTRO，
   见 references/INTRO_SPEC.md）。空格 / 回车 / 点击推进；可跳过。
   ============================================================ */
const { useState: useStateI, useEffect: useEffectI } = React;

function SceneIntro({ onStart }) {
  const INTRO_BEATS = window.WL_INTRO || [];
  const [i, setI] = useStateI(0);
  const [show, setShow] = useStateI(false);
  const last = i >= INTRO_BEATS.length - 1;

  const next = () => { if (last || !INTRO_BEATS.length) { onStart(); } else { setI((n) => n + 1); } };

  // —— 所有 hooks 在任何提前 return 之前声明（避免条件 hook）——
  // 契约数据缺失（理论上不会，WL_BOOT 已 gate）：直接进游戏，绝不卡白屏
  useEffectI(() => { if (!INTRO_BEATS.length) onStart(); }, []);
  useEffectI(() => { setShow(false); const t = setTimeout(() => setShow(true), 40); return () => clearTimeout(t); }, [i]);
  useEffectI(() => {
    const onKey = (e) => {
      if (e.code === "Space" || e.key === "Enter") { e.preventDefault(); next(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, last]);

  if (!INTRO_BEATS.length) return null;
  const b = INTRO_BEATS[i];

  return (
    <div className="intro-stage" onClick={next}>
      {/* 火星天光 + 缓慢游动的红草雾 */}
      <div className="intro-sky" />
      <div className="intro-vignette" />

      {/* 跳过 */}
      <button className="intro-skip" onClick={(e) => { e.stopPropagation(); onStart(); }}>
        跳过开场 ⏭
      </button>

      <div className={"intro-card " + (show ? "in" : "")} key={i}>
        <div className="intro-art">{b.art}</div>
        <div className="intro-tag">{b.tag}</div>
        <div className="intro-title">{b.title}</div>
        <div className="intro-lines">
          {b.lines.map((ln, k) => (
            <p key={k} style={{ animationDelay: (0.25 + k * 0.5) + "s" }}
              dangerouslySetInnerHTML={{ __html: ln }} />
          ))}
        </div>

        <button className={"btn " + (last ? "gold intro-go" : "")} onClick={(e) => { e.stopPropagation(); next(); }}>
          {last ? "📡 开始直播 · 进入避难所 →" : "继续 ▸"}
        </button>
      </div>

      {/* 进度点 */}
      <div className="intro-dots">
        {INTRO_BEATS.map((_, k) => (
          <div key={k} className={"intro-dot " + (k === i ? "cur" : k < i ? "done" : "")} />
        ))}
      </div>

      <div className="intro-hint">空格 / 回车 / 点击 继续</div>
    </div>
  );
}

Object.assign(window, { SceneIntro });
