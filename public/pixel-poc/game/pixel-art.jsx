/* ============================================================
   pixel-art.jsx — block-based pixel sprites (no emoji)
   load BEFORE viewer-views.jsx
   ============================================================ */

/* palette */
const C = {
  ink:  "#15101f",
  hairD:"#3a2718", hair:"#5a3d22",
  skin: "#e3ad7a", skinS:"#c98a55",
  jac:  "#2bb6a8", jacD:"#187a70",   // hero teal
  strap:"#ffcf3f",
  pant: "#241f44", boot:"#3a2f1a",
  white:"#eef0ff", whiteS:"#bcc0e0",
  red:  "#ff3b5c",
  coat: "#8a6a3a", coatD:"#5e4626",  // scavenger
  scarf:"#b0492e",
  wall: "#3b3663", wallD:"#2a2548", wallL:"#4a4577",
  win:  "#ffd24a", winD:"#5a4a8a",
  steel:"#43506b", steelD:"#2c3550", steelL:"#5d6b88",
  rust: "#c2662e", rustL:"#ffa83d",
  army: "#566b34", armyD:"#3c4d22", armyL:"#6f8743",
  brick:"#7a5a30", brickD:"#5e4422", brickL:"#9a7440",
  cyan: "#35e0d0", purp:"#8b5cf6", gold:"#ffcf3f",
  shadow:"rgba(0,0,0,.35)",
  glass:"#173a52", glassL:"#2b6f8a",
  awn:  "#c23b56", awnL:"#ff5d77",
  dark: "#1b1730",
};

/* sprite data: { w, h, px:[ [x,y,w,h,color], ... ] } in canonical px */
const SPRITES = {
  /* ---------- survivor hero ---------- */
  hero: { w: 64, h: 84, px: [
    [22,80,22,4, C.shadow],
    [14,2,36,9, C.hairD], [12,9,40,8, C.hair],
    [12,15,4,16, C.hair], [48,15,4,16, C.hair],
    [16,14,32,22, C.skin], [16,30,32,6, C.skinS],
    [23,22,5,6, C.ink], [36,22,5,6, C.ink],
    [16,36,32,30, C.jac], [16,36,32,5, C.jacD],
    [29,41,6,25, C.jacD],
    [22,41,3,25, C.strap], [39,41,3,25, C.strap],
    [6,40,9,22, C.jac], [49,40,9,22, C.jac],
    [6,60,9,7, C.skin], [49,60,9,7, C.skin],
    [18,66,12,12, C.pant], [34,66,12,12, C.pant],
    [16,78,14,5, C.boot], [34,78,14,5, C.boot],
  ]},

  /* ---------- medic companion ---------- */
  medic: { w: 64, h: 84, px: [
    [22,80,22,4, C.shadow],
    [14,4,36,9, C.white], [12,11,40,4, C.whiteS],
    [30,1,4,9, C.red], [27,3,10,4, C.red],
    [16,15,32,21, C.skin], [16,30,32,6, C.skinS],
    [23,22,5,6, C.ink], [36,22,5,6, C.ink],
    [16,36,32,30, C.white], [16,36,32,5, C.whiteS],
    [29,44,6,8, C.red], [26,46,12,4, C.red],
    [6,40,9,22, C.white], [49,40,9,22, C.white],
    [6,60,9,7, C.skin], [49,60,9,7, C.skin],
    [18,66,12,12, C.pant], [34,66,12,12, C.pant],
    [16,78,14,5, C.boot], [34,78,14,5, C.boot],
  ]},

  /* ---------- scavenger NPC (老鸦) ---------- */
  scavenger: { w: 64, h: 84, px: [
    [22,80,22,4, C.shadow],
    [12,4,40,12, C.coatD], [16,8,32,10, C.coat],
    [18,16,28,18, C.skin], [18,28,28,6, C.skinS],
    [24,22,5,5, C.ink], [37,22,5,5, C.ink],
    [16,33,32,7, C.scarf],
    [14,38,36,28, C.coat], [14,38,36,5, C.coatD],
    [28,43,8,23, C.coatD],
    [6,42,9,20, C.coat], [49,42,9,20, C.coat],
    [6,60,9,6, C.skin], [49,60,9,6, C.skin],
    [18,66,12,12, C.pant], [34,66,12,12, C.pant],
    [16,78,14,5, C.boot], [34,78,14,5, C.boot],
  ]},

  /* ---------- wooden supply crate ---------- */
  crate: { w: 64, h: 56, px: [
    [12,52,40,4, C.shadow],
    [8,10,48,42, C.brick], [8,10,48,7, C.brickL],
    [8,10,5,42, C.brickD], [51,10,5,42, C.brickD],
    [8,28,48,5, C.brickD], [27,10,5,42, C.brickD],
    [11,13,5,4, C.gold], [48,13,5,4, C.gold],
    [11,46,5,4, C.gold], [48,46,5,4, C.gold],
  ]},

  /* ---------- pharmacy / medical building ---------- */
  pharmacy: { w: 84, h: 76, px: [
    [10,70,64,6, C.shadow],
    [8,22,68,50, C.wall], [8,22,68,6, C.wallL],
    [4,14,76,10, C.wallD],
    [34,4,16,14, C.white], [40,6,4,10, C.red], [36,9,12,4, C.red],
    [16,32,14,14, C.winD], [17,33,12,12, C.win],
    [54,32,14,14, C.winD], [55,33,12,12, C.win],
    [34,46,16,26, C.dark], [34,46,16,4, C.wallD],
    [40,56,3,8, C.gold],
    [8,66,68,6, C.wallD],
  ]},

  /* ---------- abandoned factory ---------- */
  factory: { w: 96, h: 78, px: [
    [10,72,78,6, C.shadow],
    [14,8,11,28, C.steelD], [13,5,13,4, C.rust],
    [30,2,11,34, C.steelD], [29,-1,13,4, C.rustL],
    [8,30,82,46, C.steel], [8,30,82,6, C.steelL],
    [8,30,5,46, C.steelD], [85,30,5,46, C.steelD],
    [16,40,10,10, C.win], [30,40,10,10, C.winD],
    [44,40,10,10, C.win], [58,40,10,10, C.winD],
    [72,40,10,10, C.win],
    [16,40,10,10, C.win],
    [60,52,20,24, C.dark], [60,52,20,4, C.steelD],
    [16,56,30,4, C.rust], [16,62,22,3, C.rust],
    [8,72,82,4, C.steelD],
  ]},

  /* ---------- ammo / munitions box ---------- */
  ammo: { w: 64, h: 56, px: [
    [12,52,40,4, C.shadow],
    [12,6,6,10, C.gold], [20,6,5,10, C.gold], [27,6,5,10, C.rustL],
    [8,16,48,8, C.armyL], [8,24,48,28, C.army], [8,24,48,4, C.armyD],
    [8,16,5,36, C.armyD], [51,16,5,36, C.armyD],
    [28,30,9,9, C.gold],
    [16,42,12,4, C.red], [32,42,16,4, C.red],
  ]},

  /* ---------- market (storefront) ---------- */
  market: { w: 84, h: 76, px: [
    [10,70,64,6, C.shadow],
    [8,24,68,48, C.wall], [8,24,68,6, C.wallL],
    [6,16,72,9, C.awn],
    [12,16,8,9, C.awnL], [28,16,8,9, C.awnL], [44,16,8,9, C.awnL], [60,16,8,9, C.awnL],
    [14,34,24,18, C.glass], [14,34,24,4, C.glassL],
    [46,34,22,18, C.glass], [46,34,22,4, C.glassL],
    [36,52,16,20, C.dark], [36,52,16,4, C.wallD],
    [8,66,68,6, C.wallD],
  ]},

  /* ---------- radio station (tower) ---------- */
  radio: { w: 84, h: 80, px: [
    [24,74,36,6, C.shadow],
    [40,4,4,40, C.steelL], [34,12,16,3, C.steel], [30,22,24,3, C.steel], [26,32,32,3, C.steelD],
    [38,2,8,4, C.rustL],
    [18,42,48,32, C.wall], [18,42,48,6, C.wallL],
    [26,52,12,12, C.win], [46,52,12,12, C.winD],
    [36,62,12,12, C.dark],
    [18,68,48,6, C.wallD],
  ]},

  /* ---------- unexplored "?" ---------- */
  q: { w: 48, h: 56, px: [
    [12,6,24,8, C.purp], [30,12,8,14, C.purp], [20,24,14,8, C.purp],
    [18,32,10,8, C.purp], [18,46,10,9, C.cyan],
  ]},

  /* ---------- moon ---------- */
  moon: { w: 56, h: 56, px: [
    [12,4,32,8, C.win], [6,12,44,8, C.win], [4,20,48,16, C.win],
    [6,36,44,8, C.win], [12,44,32,8, C.win],
    [28,10,8,8, C.winD], [38,22,8,8, C.winD], [22,34,8,8, C.winD],
  ]},
};

/* emoji → sprite key map (so existing data keeps working) */
const EMOJI_SPRITE = {
  "🧑‍🚀": "hero", "🧑": "hero", "👩‍🔧": "medic", "🧑‍🦲": "scavenger",
  "📦": "crate", "🏥": "pharmacy", "💊": "pharmacy", "🧰": "ammo",
  "🏭": "factory", "🏪": "market", "📻": "radio", "❔": "q", "❓": "q",
};

function Sprite({ name, size, style, className }) {
  const sp = SPRITES[name];
  if (!sp) return null;
  const scale = size / Math.max(sp.w, sp.h);
  const W = sp.w * scale, H = sp.h * scale;
  return (
    <div className={"pxspr " + (className || "")} style={{ position: "relative", width: W, height: H, ...style }}>
      {sp.px.map((p, i) => (
        <i key={i} style={{ position: "absolute", left: p[0] * scale, top: p[1] * scale,
          width: p[2] * scale, height: p[3] * scale, background: p[4] }} />
      ))}
    </div>
  );
}

/* render either a sprite (if the icon maps) or fall back to the emoji/text */
function IconOrSprite({ icon, size, style }) {
  const key = EMOJI_SPRITE[icon];
  if (key) return <Sprite name={key} size={size} style={style} />;
  return <span style={{ fontSize: size * 0.6 }}>{icon}</span>;
}

Object.assign(window, { SPRITES, EMOJI_SPRITE, Sprite, IconOrSprite, PXC: C });
