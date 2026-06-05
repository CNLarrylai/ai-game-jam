/* ============================================================
   scenes-lib.jsx — 8 illustrated pixel scenes (1344×970 canvas)
   each <Scene name> renders a full backdrop; load AFTER pixel-art
   ============================================================ */
const ScS = window.Sprite;

/* helper: window-light dots row */
function litRow(n, on) {
  return Array.from({ length: n }).map((_, i) => i);
}

function SceneHome() {
  return (
    <div className="lib-scene s-home">
      <div className="hm-wall" />
      <div className="hm-studs">{[...Array(9)].map((_, i) => <span key={i} />)}</div>
      <div className="hm-beam t" /><div className="hm-beam m" />
      {/* hand-drawn map nailed to wall */}
      <div className="hm-map"><span className="pin" /><span className="route" /><span className="route r2" /><span className="x-mark">✕</span></div>
      {/* small barred window with moon */}
      <div className="hm-window"><ScS name="moon" size={70} style={{ position: "absolute", left: 24, top: 18 }} /><div className="bars" /></div>
      {/* battery lamp */}
      <div className="hm-lamp"><span className="cord" /><span className="batt" /><span className="bulb" /><span className="glow" /></div>
      <div className="hm-floor" />
      {/* crates shelf */}
      <div className="hm-shelf">{[...Array(6)].map((_, i) => <span key={i} className="bx" />)}</div>
      <ScS name="it_can" size={42} style={{ position: "absolute", left: 1042, bottom: 250 }} />
      {/* folding cot + blanket */}
      <div className="hm-cot"><div className="legs" /><div className="mat" /><div className="pillow" /><div className="blanket" /></div>
      <ScS name="crate" size={120} style={{ position: "absolute", left: 150, bottom: 150 }} />
    </div>
  );
}

function SceneHomeDoor() {
  return (
    <div className="lib-scene s-door">
      <div className="sd-wall" />
      <div className="sd-floor" />
      {/* reinforced door */}
      <div className="sd-door">
        <div className="bar b1" /><div className="bar b2" /><div className="bar b3" />
        <div className="weld w1" /><div className="weld w2" />
        <div className="lock l1" /><div className="lock l2" /><div className="lock l3" />
        <div className="peep" />
        <div className="gap" />
      </div>
      {/* silhouette outside through the gap */}
      <div className="sd-figure" />
      <div className="sd-lightbeam" />
    </div>
  );
}

function SceneHospital() {
  return (
    <div className="lib-scene s-hosp">
      <div className="hp-wall" />
      <div className="hp-tilefloor" />
      <div className="hp-cross"><span /><span /></div>
      <div className="hp-emergency" />
      <div className="hp-spray">AI CHECKPOINT →</div>
      {/* toppled bed */}
      <div className="hp-bed"><div className="frame" /><div className="legs" /></div>
      {/* med cabinet spilled */}
      <div className="hp-cabinet">{[...Array(6)].map((_, i) => <span key={i} className="vial" style={{ background: ["#57e08a","#4dd2ff","#ff4d6d","#ffcf3f","#8b5cf6","#57e08a"][i] }} />)}</div>
      <ScS name="it_pills" size={40} style={{ position: "absolute", left: 360, bottom: 250 }} />
      <ScS name="it_bandage" size={40} style={{ position: "absolute", left: 430, bottom: 235 }} />
      <div className="hp-hallshadow" />
      <ScS name="hero" size={150} style={{ position: "absolute", left: "50%", bottom: 240, transform: "translateX(-50%)" }} />
    </div>
  );
}

function SceneFactory() {
  return (
    <div className="lib-scene s-factory">
      <div className="fc-wall" />
      <div className="fc-roofbeams">{[...Array(7)].map((_, i) => <span key={i} />)}</div>
      <div className="fc-roofhole" />
      {/* big gears + pipes */}
      <div className="fc-gear g1" /><div className="fc-gear g2" />
      <div className="fc-pipe p1" /><div className="fc-pipe p2" /><div className="fc-pipe p3" />
      {/* conveyor */}
      <div className="fc-conveyor"><span /><span /><span /><span /><span /><span /></div>
      {/* robotic arm with red light */}
      <div className="fc-arm"><div className="base" /><div className="seg1" /><div className="seg2" /><div className="claw" /><span className="rlight" /></div>
      <div className="fc-floor" />
      <ScS name="ammo" size={92} style={{ position: "absolute", left: 200, bottom: 150 }} />
      <ScS name="ammo" size={72} style={{ position: "absolute", left: 300, bottom: 140 }} />
      <ScS name="crate" size={86} style={{ position: "absolute", left: 1040, bottom: 150 }} />
    </div>
  );
}

function SceneMarket() {
  return (
    <div className="lib-scene s-market">
      <div className="mk-wall" />
      <div className="mk-collapse" />{/* collapsed roof corner */}
      <div className="mk-neon">W<span>E</span>L<span>C</span>OM<span>E</span></div>
      <div className="mk-floor" />
      {/* toppled shelves */}
      <div className="mk-shelf s1">{[...Array(4)].map((_, i) => <span key={i} />)}</div>
      <div className="mk-shelf s2 fallen">{[...Array(4)].map((_, i) => <span key={i} />)}</div>
      {/* checkout */}
      <div className="mk-checkout"><div className="belt" /><div className="reg" /></div>
      {/* cart */}
      <div className="mk-cart"><div className="basket" /><div className="wheel w1" /><div className="wheel w2" /></div>
      {/* broken auto-door glass */}
      <div className="mk-glass"><i /><i /><i /></div>
      <ScS name="it_can" size={38} style={{ position: "absolute", left: 520, bottom: 210 }} />
      <ScS name="it_can" size={32} style={{ position: "absolute", left: 580, bottom: 195 }} />
      <ScS name="it_water" size={38} style={{ position: "absolute", left: 470, bottom: 200 }} />
    </div>
  );
}

function SceneRadio() {
  return (
    <div className="lib-scene s-radio">
      <div className="rd-sky" />
      <div className="rd-cityline">{[...Array(14)].map((_, i) => <span key={i} style={{ height: 30 + (i * 37) % 90 }} />)}</div>
      {/* antenna tower */}
      <div className="rd-tower">
        <div className="mast" />
        <div className="x x1" /><div className="x x2" /><div className="x x3" /><div className="x x4" />
        <span className="beacon" />
      </div>
      {/* control building */}
      <div className="rd-building"><div className="win w1" /><div className="win w2" /><div className="dish" /></div>
      <div className="rd-ground" />
      <div className="rd-grass">{[...Array(20)].map((_, i) => <span key={i} style={{ left: i * 70 + (i % 3) * 12 }} />)}</div>
    </div>
  );
}

function SceneSubway() {
  return (
    <div className="lib-scene s-subway">
      <div className="sw-arch" />
      <div className="sw-archtiles" />
      <div className="sw-dark" />
      <div className="sw-exit">EXIT →</div>
      <div className="sw-graffiti">HUMANS WERE HERE</div>
      {/* train car */}
      <div className="sw-train"><div className="body" /><div className="win w1" /><div className="win w2" /><span className="headlight" /></div>
      {/* rails */}
      <div className="sw-platform" />
      <div className="sw-rails"><span className="rail r1" /><span className="rail r2" />{[...Array(12)].map((_, i) => <span key={i} className="tie" style={{ left: i * 110 }} />)}</div>
      <ScS name="hero" size={140} style={{ position: "absolute", left: 360, bottom: 150 }} />
    </div>
  );
}

function SceneCityRuins() {
  return (
    <div className="lib-scene s-city">
      <div className="ct-sky" />
      <div className="ct-drone"><span className="body" /><span className="rotor l" /><span className="rotor r" /><span className="dot" /></div>
      <div className="ct-skyline">{[...Array(12)].map((_, i) => {
        const broken = i % 3 === 0;
        return <span key={i} className={"b " + (broken ? "broken" : "")} style={{ height: 120 + (i * 53) % 200 }}>
          {[...Array(3)].map((_, j) => <i key={j} className={(i + j) % 2 ? "on" : ""} />)}
        </span>;
      })}</div>
      <div className="ct-road" />
      <div className="ct-weeds">{[...Array(16)].map((_, i) => <span key={i} style={{ left: i * 86 + (i % 4) * 9 }} />)}</div>
      {/* wrecked cars */}
      <div className="ct-car c1"><div className="cab" /><div className="body" /><div className="wheel w1" /><div className="wheel w2" /></div>
      <div className="ct-car c2"><div className="cab" /><div className="body" /><div className="wheel w1" /><div className="wheel w2" /></div>
    </div>
  );
}

const LIB_SCENES = {
  home: { comp: SceneHome, name: "避难所 · 室内", id: "home" },
  home_door: { comp: SceneHomeDoor, name: "避难所 · 门口事件", id: "home_door" },
  hospital: { comp: SceneHospital, name: "废弃医院", id: "hospital" },
  factory: { comp: SceneFactory, name: "废弃工厂", id: "factory" },
  market: { comp: SceneMarket, name: "塌陷超市", id: "market" },
  radio_station: { comp: SceneRadio, name: "广播电台", id: "radio_station" },
  subway: { comp: SceneSubway, name: "地铁隧道", id: "subway" },
  city_ruins: { comp: SceneCityRuins, name: "城市废墟 · 户外", id: "city_ruins" },
};

Object.assign(window, { LIB_SCENES,
  SceneHome, SceneHomeDoor, SceneHospital, SceneFactory, SceneMarket, SceneRadio, SceneSubway, SceneCityRuins });
