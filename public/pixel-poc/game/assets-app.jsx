/* ============================================================
   assets-app.jsx — Asset Library gallery
   ============================================================ */
const { useRef: useRefG, useLayoutEffect: useLayoutG, useState: useStateG } = React;

/* a scene scaled to fit its responsive card */
function SceneFrame({ name }) {
  const wrapRef = useRefG(null);
  const [scale, setScale] = useStateG(0.3);
  useLayoutG(() => {
    const fit = () => { if (wrapRef.current) setScale(wrapRef.current.clientWidth / 1344); };
    fit();
    const ro = new ResizeObserver(fit);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);
  const info = window.LIB_SCENES[name];
  const Comp = info.comp;
  return (
    <div className="scene-card">
      <div className="frame" ref={wrapRef}>
        <div className="scaler" style={{ transform: "scale(" + scale + ")" }}><Comp /></div>
      </div>
      <div className="cap"><span className="nm">{info.name}</span><span className="id">{info.id}</span></div>
    </div>
  );
}

const CHARACTERS = [
  { key: "hero", name: "幸存者 · 主角", role: "🎮 玩家角色", id: "hero",
    desc: "20 多岁的中性幸存者。青绿夹克、黄色背包带、棕靴；蓬乱头发，神情坚毅而疲惫。" },
  { key: "rin", name: "凛 · 机械师", role: "🤝 同伴", id: "rin",
    desc: "工程师。深灰工装、额头护目镜、腰挂扳手，手上沾着油污。能修装备、破电子锁。" },
  { key: "doc_k", name: "老K · 军医", role: "🤝 同伴", id: "doc_k",
    desc: "50 多岁退役军医。脏污白大褂+红十字、灰白头发、眼镜，左腿旧伤微跛。" },
  { key: "scavenger", name: "拾荒者 老鸦", role: "💬 NPC", id: "scavenger",
    desc: "独行中年男。棕风衣、深红围巾、挂满零件的拾荒大背包，脸有疤，眼神精明。" },
  { key: "mech_dog", name: "机械守卫", role: "💀 敌人", id: "mech_dog",
    desc: "AI 巡逻机器狗。锈蚀金属四足、独眼红色光学镜，关节裸露电线与液压管。" },
  { key: "ai_terminal", name: "AI 终端", role: "🖥️ NPC", id: "ai_terminal",
    desc: "墙上终端屏。两个光点为眼、弧线为嘴，青紫色幽光，电线管道延伸入墙。" },
];

const ITEMS = [
  { key: "it_can", name: "罐头", desc: "圆柱铁罐，标签残破。饱腹 +30" },
  { key: "it_bandage", name: "绷带", desc: "白色卷绷带，微带血迹。HP +25" },
  { key: "it_water", name: "净水", desc: "水瓶，液体微浑。饱腹 +12 理智 +8" },
  { key: "it_pills", name: "镇静剂", desc: "橙色药瓶+白药片。理智 +30" },
  { key: "it_flashlight", name: "军用手电筒", desc: "战术手电，黑色金属。视野 +1" },
  { key: "it_scrap", name: "废铁", desc: "锈蚀金属片与螺丝。制作材料" },
  { key: "it_pistol", name: "改装手枪", desc: "土制手枪，缠着胶带。战斗 +" },
  { key: "it_keycard", name: "钥匙卡", desc: "磁条卡，印有 ACCESS。开启电子门" },
];

const SWATCHES = [
  ["#0a0814", "底"], ["#151229", "板"], ["#35e0d0", "cyan"], ["#ff4d8d", "magenta"],
  ["#8b5cf6", "purple"], ["#ffcf3f", "gold"], ["#ff3b5c", "red"], ["#57e08a", "green"],
];

function AssetApp() {
  return (
    <div className="lib-page">
      <div className="lib-head">
        <h1>🎨 WASTELAND LIVE — 像素素材库</h1>
        <p>近未来 AI 末日。AI 清除了所有不对它说"谢谢"的人类（99.99%）。城市荒废，电子设备被劫持，幸存者用土制工具求生。全部素材为纯 CSS 像素绘制，暗色复古未来 / 废土风格。</p>
        <div className="tagrow">
          <span className="tag">8 场景</span><span className="tag">6 角色</span><span className="tag">8 道具</span>
          <span className="tag">SCENE 1344×970</span><span className="tag">SPRITE 64×84</span><span className="tag">ICON 32×32</span>
        </div>
        <div className="swatches">
          {SWATCHES.map((s, i) => <i key={i} data-hex={s[1]} style={{ background: s[0] }} />)}
        </div>
      </div>

      <div className="lib-section">
        <h2>一 · 场景背景</h2>
        <div className="sub">8 个场景 · 玩家一眼可辨识 · 1344×970（缩放预览，点开看大图请放大窗口）</div>
        <div className="scene-grid">
          {Object.keys(window.LIB_SCENES).map((k) => <SceneFrame key={k} name={k} />)}
        </div>
      </div>

      <div className="lib-section">
        <h2>二 · 角色精灵</h2>
        <div className="sub">6 个角色 · 64×84 站立全身像 + 放大特写</div>
        <div className="char-grid">
          {CHARACTERS.map((c) => (
            <div key={c.key} className="char-card">
              <div className="portrait"><Sprite name={c.key} size={c.key === "mech_dog" ? 150 : 132} /></div>
              <div className="meta">
                <div className="row"><span className="nm">{c.name}</span><span className="id">{c.id}</span></div>
                <div className="role">{c.role}</div>
                <div className="desc">{c.desc}</div>
                <div className="mini">
                  <span className="lbl">64×84</span><Sprite name={c.key} size={c.key === "mech_dog" ? 56 : 48} />
                  <span className="lbl">3×</span><Sprite name={c.key} size={c.key === "mech_dog" ? 92 : 78} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="lib-section">
        <h2>三 · 道具图标</h2>
        <div className="sub">8 个道具 · 32×32 背包图标</div>
        <div className="item-grid">
          {ITEMS.map((it) => (
            <div key={it.key} className="item-card">
              <div className="slot"><Sprite name={it.key} size={72} /></div>
              <div className="nm">{it.name}</div>
              <div className="desc">{it.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<AssetApp />);
