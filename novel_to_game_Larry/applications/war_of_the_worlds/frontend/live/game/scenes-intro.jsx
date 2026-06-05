/* ============================================================
   scenes-intro.jsx — 开场代入（cold-open）
   一段忠于原著的世界观铺垫：日常 → 坠星 → 热射线 → 逃亡 → 玩法引导。
   空格 / 回车 / 点击推进；可跳过。结束后进入游戏(home)。
   ============================================================ */
const { useState: useStateI, useEffect: useEffectI } = React;

/* 五拍开场（取自 world_bible 的 catastrophe.progression_phases） */
const INTRO_BEATS = [
  {
    art: "🔭", tag: "1894 · 仲夏 · 萨里郡沃金",
    title: "灾难之前",
    lines: [
      "煤气灯、晚祷的钟声、与妻子为琐事拌嘴又和好的傍晚——这是属于人类的、最后的寻常时光。",
      "天文学家说火星上有微光闪动。报纸把它当作奇闻，没有人当真。",
    ],
  },
  {
    art: "☄️", tag: "霍塞尔公地",
    title: "那颗坠落的星",
    lines: [
      "一道绿光划破夜空，一只巨大的圆筒砸进公地，掀起焦黑的沙坑。",
      "人群带着野餐的心情围拢过来看热闹。然后，盖子开始，缓缓地，旋松——",
    ],
  },
  {
    art: "🔥", tag: "梅伯里 · 第一次屠杀",
    title: "看不见的火",
    lines: [
      "一束无形的热从机器里扫出，所过之处，人与松林在白光里瞬间化为灰烬。",
      "没有宣战，没有谈判。对它们而言，我们不过是需要清除的虫豸。",
    ],
  },
  {
    art: "🐎", tag: "你 · 一个普通人",
    title: "带她离开",
    lines: [
      "你不是士兵，不是英雄——只是个写字为生的普通人。你借来一辆单马车，要赶在火星人扩散前，把妻子送到莱瑟黑德。",
      "这场仗打不赢。能做的，只有活下去、不被看见，并在末日里尽量还像个人。",
    ],
  },
  {
    art: "📡", tag: "如何活下去",
    title: "这是一场生存直播",
    lines: [
      "🌫️ 火星人只能<b>躲</b>，不能打——盯住「隐蔽」别归零；生命 / 补给 / 理智，任一耗尽即终局。",
      "🏚️ 栖身处<b>点击同伴</b>对话 · 出门<b>选路线、探索废墟</b> · 探索时<b>按空格屏息潜行</b>。",
      "📺 观众的弹幕会<b>融入你的命运</b>。撑过 7 天，火星人将被这颗星球最卑微的东西击倒。",
    ],
  },
];

function SceneIntro({ onStart }) {
  const [i, setI] = useStateI(0);
  const [show, setShow] = useStateI(false);
  const last = i >= INTRO_BEATS.length - 1;

  useEffectI(() => { setShow(false); const t = setTimeout(() => setShow(true), 40); return () => clearTimeout(t); }, [i]);

  const next = () => { if (last) { onStart(); } else { setI((n) => n + 1); } };

  useEffectI(() => {
    const onKey = (e) => {
      if (e.code === "Space" || e.key === "Enter") { e.preventDefault(); next(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, last]);

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

Object.assign(window, { SceneIntro, INTRO_BEATS });
