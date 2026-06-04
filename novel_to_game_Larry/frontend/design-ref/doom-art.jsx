/* ===== doom-art.jsx — 剪影+可调肌理 场景系统 (woodcut basis) ===== */

/* shared SVG filter defs (rough edges) — rendered once */
function DoomArtDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <filter id="dRough"><feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="5" result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale="9" /></filter>
        <filter id="dRough2"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="13" result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale="5" /></filter>
        <linearGradient id="duskSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="oklch(0.2 0.03 258)" />
          <stop offset="0.46" stopColor="oklch(0.26 0.05 290)" />
          <stop offset="0.76" stopColor="oklch(0.4 0.1 35)" />
          <stop offset="1" stopColor="oklch(0.52 0.13 45)" />
        </linearGradient>
        <radialGradient id="duskGlow" cx="0.52" cy="0.96" r="0.62">
          <stop offset="0" stopColor="oklch(0.72 0.15 52)" stopOpacity="0.85" />
          <stop offset="1" stopColor="oklch(0.72 0.15 52)" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/* a small walking survivor silhouette */
function svgSurvivor(x, y, s) {
  return `<g transform="translate(${x},${y})" filter="url(#dRough2)">
    <rect fill="#0a0b0e" x="${-7 * s}" y="${5 * s}" width="${14 * s}" height="${30 * s}" rx="${6 * s}"/>
    <circle fill="#0a0b0e" cx="0" cy="0" r="${9 * s}"/>
  </g>`;
}

/* ---- scene library (inner SVG markup, viewBox 0 0 1000 560) ---- */
const DOOM_SCENES = {
  gasStation: `
    <rect x="0" y="0" width="1000" height="560" fill="url(#duskSky)"/>
    <ellipse cx="540" cy="430" rx="520" ry="240" fill="url(#duskGlow)"/>
    <!-- distant ruined skyline -->
    <g fill="#0d0f14" opacity="0.85" filter="url(#dRough)">
      <path d="M0 352 L60 344 L70 300 L84 300 L92 346 L150 338 L150 360 L0 364 Z"/>
      <path d="M820 350 L824 300 L852 300 L856 346 L900 340 L1000 350 L1000 366 L820 366 Z"/>
      <path d="M620 352 L640 352 L650 318 L660 352 L700 348 L700 360 L620 360 Z"/>
    </g>
    <!-- gas station -->
    <g fill="#08090c" filter="url(#dRough)">
      <rect x="560" y="232" width="360" height="30" rx="3"/>
      <rect x="590" y="258" width="16" height="150"/>
      <rect x="876" y="258" width="16" height="150"/>
      <rect x="392" y="300" width="150" height="116"/>
      <rect x="486" y="320" width="40" height="96"/>
      <rect x="640" y="330" width="26" height="80" rx="2"/>
      <rect x="712" y="330" width="26" height="80" rx="2"/>
      <rect x="300" y="232" width="9" height="184"/>
      <rect x="270" y="232" width="62" height="44" rx="3"/>
    </g>
    <!-- lit window: faint, ominous -->
    <rect x="410" y="328" width="38" height="40" fill="oklch(0.7 0.15 60)" opacity="0.62" filter="url(#dRough2)"/>
    <rect x="282" y="244" width="38" height="12" fill="oklch(0.66 0.13 58)" opacity="0.4"/>
    <!-- ground -->
    <rect x="0" y="408" width="1000" height="152" fill="#06070a" filter="url(#dRough)"/>
    <!-- foreground survivors approaching -->
    ${svgSurvivor(150, 372, 1.45)}
    ${svgSurvivor(210, 380, 1.2)}
    ${svgSurvivor(258, 386, 1.0)}
  `,
  cityDusk: `
    <g fill="#090b10" filter="url(#dRough)">
      <path d="M0 420 L40 412 L48 360 L64 360 L72 414 L120 406 L128 348 L142 348 L150 410 L210 402 L210 560 L0 560 Z"/>
      <path d="M240 416 L246 374 L262 320 L276 374 L286 416 L340 408 L348 360 L362 360 L370 412 L430 404 L430 560 L240 560 Z"/>
      <path d="M470 414 L478 366 L494 366 L500 410 L560 404 L566 350 L580 350 L588 408 L650 400 L650 560 L470 560 Z"/>
      <path d="M690 412 L700 358 L716 358 L722 408 L790 400 L796 344 L812 344 L820 406 L900 398 L908 356 L922 356 L930 404 L1000 398 L1000 560 L690 560 Z"/>
    </g>
    <!-- a couple of leaning broken towers -->
    <g fill="#0b0d12" filter="url(#dRough)">
      <path d="M150 410 L156 300 L172 300 L168 410 Z"/>
      <path d="M560 404 L566 286 L582 288 L576 404 Z"/>
    </g>
  `,
};

function DoomScene({ name, className, style }) {
  return (
    <div className={`doom-scene ${className || ''}`} style={style}>
      <svg viewBox="0 0 1000 560" preserveAspectRatio="xMidYMax slice" dangerouslySetInnerHTML={{ __html: DOOM_SCENES[name] || '' }}></svg>
      <div className="scene-hatch"></div>
      <div className="scene-grain"></div>
    </div>
  );
}

/* ---- woodcut survivor portraits — parametric recipe ----
   人物公式: 体型(body) × 特征(trait) × 点睛(emblem/rim) × 悬念(eyes)
   换几个参数即生成任意新角色,供 workflow 复用。 */
const PORTRAIT_BODY = {
  tall:  { sx: 'M8 150 L13 106 Q22 86 50 80 L82 80 Q110 86 119 108 L124 150 Z', hx: 64, hy: 54, rx: 25, ry: 27 },
  mid:   { sx: 'M12 150 L17 112 Q25 92 50 88 L84 88 Q110 96 117 116 L122 150 Z', hx: 64, hy: 58, rx: 24, ry: 26 },
  small: { sx: 'M22 150 L27 116 Q34 100 52 97 L80 97 Q98 101 104 120 L109 150 Z', hx: 64, hy: 62, rx: 21, ry: 23 },
};

function portraitSVG(r) {
  const B = PORTRAIT_BODY[r.body || 'mid'];
  const rim = r.rim || 'oklch(0.74 0.05 220)';
  const bg = r.bg || rim;
  const isHood = r.trait === 'hood';
  let p = `<defs><radialGradient id="pg_${r.id}" cx="0.5" cy="0.4" r="0.62"><stop offset="0" stop-color="${bg}" stop-opacity="0.3"/><stop offset="1" stop-color="${bg}" stop-opacity="0"/></radialGradient></defs>`;
  p += `<rect width="132" height="150" fill="url(#pg_${r.id})"/>`;
  // base silhouette
  p += `<g filter="url(#dRough2)" fill="#14110d"><path d="${B.sx}"/>`;
  if (!isHood) p += `<ellipse cx="${B.hx}" cy="${B.hy}" rx="${B.rx}" ry="${B.ry}"/>`;
  p += `</g>`;
  // identifying trait (1 only)
  if (r.trait === 'glasses') {
    p += `<g fill="none" stroke="${rim}" stroke-width="2.3" opacity="0.72"><circle cx="${B.hx - 10}" cy="${B.hy + 2}" r="8"/><circle cx="${B.hx + 10}" cy="${B.hy + 2}" r="8"/><path d="M${B.hx - 2.5} ${B.hy + 2} H${B.hx + 2.5}"/></g>`;
  } else if (r.trait === 'ponytail') {
    p += `<g filter="url(#dRough2)" fill="#14110d"><path d="M${B.hx + 16} ${B.hy - 16} Q${B.hx + 36} ${B.hy - 18} ${B.hx + 32} ${B.hy + 8} Q${B.hx + 28} ${B.hy + 22} ${B.hx + 16} ${B.hy + 16} Z"/></g>`;
  } else if (r.trait === 'cap') {
    p += `<g filter="url(#dRough2)" fill="#14110d"><path d="M${B.hx - 26} ${B.hy - 10} Q${B.hx} ${B.hy - 30} ${B.hx + 26} ${B.hy - 10} L${B.hx + 32} ${B.hy - 4} L${B.hx - 22} ${B.hy - 4} Z"/></g>`;
  } else if (r.trait === 'scarf') {
    p += `<g filter="url(#dRough2)" fill="#14110d"><path d="M${B.hx - 24} ${B.hy + B.ry - 2} Q${B.hx} ${B.hy + B.ry + 12} ${B.hx + 24} ${B.hy + B.ry - 2} L${B.hx + 20} ${B.hy + B.ry + 14} L${B.hx - 20} ${B.hy + B.ry + 14} Z"/></g>`;
  } else if (isHood) {
    p += `<g filter="url(#dRough)" fill="#120f0c"><path d="M${B.hx - 38} ${B.hy + 46} Q${B.hx - 42} ${B.hy - 22} ${B.hx} ${B.hy - 26} Q${B.hx + 42} ${B.hy - 22} ${B.hx + 38} ${B.hy + 46} Q${B.hx + 30} ${B.hy + 2} ${B.hx} ${B.hy + 6} Q${B.hx - 30} ${B.hy + 2} ${B.hx - 38} ${B.hy + 46} Z"/></g>`;
    p += `<path d="M${B.hx - 24} ${B.hy + 8} Q${B.hx - 20} ${B.hy + 32} ${B.hx} ${B.hy + 38} Q${B.hx + 20} ${B.hy + 32} ${B.hx + 24} ${B.hy + 10} Q${B.hx + 14} ${B.hy + 24} ${B.hx} ${B.hy + 26} Q${B.hx - 14} ${B.hy + 24} ${B.hx - 24} ${B.hy + 8} Z" fill="#0a0807"/>`;
  }
  // rim light (subtle, accent-tinted)
  if (!isHood) p += `<path d="M${B.hx - B.rx + 2} ${B.hy - 8} Q${B.hx - B.rx - 2} ${B.hy + 8} ${B.hx - B.rx + 6} ${B.hy + 22}" stroke="${rim}" stroke-width="2.4" fill="none" opacity="0.4"/>`;
  // emblem / accent (1 only)
  const em = r.emblem || {};
  if (em.type === 'cross') p += `<g transform="translate(${B.hx},122)" filter="url(#dRough2)"><rect x="-3.2" y="-9" width="6.4" height="18" fill="${em.color}"/><rect x="-9" y="-3.2" width="18" height="6.4" fill="${em.color}"/></g>`;
  else if (em.type === 'strap') p += `<path d="M${B.hx - 14} 96 L${B.hx + 8} 150" stroke="#0c0a07" stroke-width="8" stroke-linecap="round" opacity="0.9"/><circle cx="${B.hx - 2}" cy="120" r="3.4" fill="${em.color}" opacity="0.85"/>`;
  else if (em.type === 'armband') p += `<rect x="${B.hx + 12}" y="102" width="22" height="9" rx="2" fill="${em.color}" opacity="0.85" transform="rotate(22 ${B.hx + 22} 106)"/>`;
  else if (em.type === 'mark') p += `<ellipse cx="${B.hx + 22}" cy="100" rx="9" ry="6" fill="${em.color}" opacity="0.45" filter="url(#dRough2)"/>`;
  // suspense eyes (hood)
  if (isHood && r.eyes) p += `<circle cx="${B.hx - 7}" cy="${B.hy + 18}" r="1.7" fill="${r.eyes}" opacity="0.5"/><circle cx="${B.hx + 8}" cy="${B.hy + 18}" r="1.7" fill="${r.eyes}" opacity="0.5"/>`;
  return p;
}

const PORTRAIT_RECIPES = {
  chen:  { id: 'chen', body: 'mid', trait: 'glasses', rim: 'oklch(0.78 0.06 215)', bg: 'oklch(0.5 0.05 225)', emblem: { type: 'cross', color: 'oklch(0.56 0.18 28)' } },
  yu:    { id: 'yu', body: 'small', trait: 'ponytail', rim: 'oklch(0.8 0.1 68)', bg: 'oklch(0.66 0.08 70)', emblem: { type: 'strap', color: 'oklch(0.78 0.1 60)' } },
  qiang: { id: 'qiang', body: 'tall', trait: 'hood', rim: 'oklch(0.6 0.05 210)', bg: 'oklch(0.46 0.04 200)', emblem: { type: 'mark', color: 'oklch(0.6 0.13 150)' }, eyes: 'oklch(0.72 0.06 150)' },
};

function SurvivorPortrait({ k, recipe }) {
  const r = recipe || PORTRAIT_RECIPES[k] || PORTRAIT_RECIPES.chen;
  return (
    <div className={`portrait portrait-${r.id}`}>
      <svg viewBox="0 0 132 150" dangerouslySetInnerHTML={{ __html: portraitSVG(r) }}></svg>
      <div className="portrait-hatch"></div>
    </div>
  );
}

Object.assign(window, { DoomArtDefs, DoomScene, DOOM_SCENES, SurvivorPortrait, portraitSVG, PORTRAIT_RECIPES, PORTRAIT_BODY });
