/* ============================================================
   pixel-lib.js — low-level pixel-art toolkit
   Internal resolution is 180 x 320 (9:16). All drawing is done
   at 1 device-pixel = 1 art-pixel; CSS scales it up crisply.
   ============================================================ */
(function () {
  const W = 180, H = 320;

  /* ---------- color utils ---------- */
  function hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToCss(r, g, b, a) {
    r |= 0; g |= 0; b |= 0;
    return a == null ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`;
  }
  function mix(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    return rgbToCss(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  }
  function alpha(hex, a) { const c = hexToRgb(hex); return rgbToCss(c[0], c[1], c[2], a); }

  /* ---------- prng ---------- */
  function mulberry32(seed) {
    return function () {
      let t = (seed += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- palette ---------- */
  const P = {
    black: '#06090f', bg: '#0a0e16',
    wall0: '#10161f', wall1: '#171f2b', wall2: '#202b3a', wall3: '#2b3950', wallHi: '#3a4a64',
    floor0: '#0c1019', floor1: '#141b27', floor2: '#1d2735', floor3: '#27344a',
    seam: '#080b12',
    metal0: '#171c24', metal1: '#2c3540', metal2: '#48535f', metal3: '#6b7787', metal4: '#929fad',
    sky0: '#050d16', sky1: '#0a2230', sky2: '#0f3343', haze: '#163f50',
    star: '#bfeaf0',
    cyan0: '#0c3d47', cyan1: '#1a8595', cyan2: '#33ccdd', cyan3: '#7af2ff', cyan4: '#c9fbff',
    mag0: '#5e1742', mag1: '#b32f7e', mag2: '#ee4ea2', mag3: '#ff8ccb',
    grn0: '#0f3a24', grn1: '#1f9b56', grn2: '#3bee86', grn3: '#a6ffce',
    amber0: '#5a3a1c', amber1: '#b07a32', amber2: '#e6b65a',
    rust: '#6e4334', wood0: '#241a16', wood1: '#3a2a20', wood2: '#52392b',
    cloth0: '#1a2330', cloth1: '#26313f', cloth2: '#364356',
  };

  /* ---------- 3x5 pixel font ---------- */
  const FONT = {
    A: '010/101/111/101/101', B: '110/101/110/101/110', C: '011/100/100/100/011',
    D: '110/101/101/101/110', E: '111/100/110/100/111', F: '111/100/110/100/100',
    G: '011/100/101/101/011', H: '101/101/111/101/101', I: '111/010/010/010/111',
    J: '001/001/001/101/010', K: '101/101/110/101/101', L: '100/100/100/100/111',
    M: '101/111/111/101/101', N: '101/111/111/111/101', O: '010/101/101/101/010',
    P: '110/101/110/100/100', Q: '010/101/101/110/011', R: '110/101/110/101/101',
    S: '011/100/010/001/110', T: '111/010/010/010/010', U: '101/101/101/101/011',
    V: '101/101/101/101/010', W: '101/101/111/111/101', X: '101/101/010/101/101',
    Y: '101/101/010/010/010', Z: '111/001/010/100/111',
    0: '111/101/101/101/111', 1: '010/110/010/010/111', 2: '111/001/111/100/111',
    3: '111/001/111/001/111', 4: '101/101/111/001/001', 5: '111/100/111/001/111',
    6: '111/100/111/101/111', 7: '111/001/010/100/100', 8: '111/101/111/101/111',
    9: '111/101/111/001/111',
    '.': '000/000/000/000/100', ':': '000/100/000/100/000', '-': '000/000/111/000/000',
    '>': '100/010/001/010/100', '/': '001/001/010/100/100', '!': '010/010/010/000/010',
    '?': '110/001/010/000/010', '+': '000/010/111/010/000', '%': '101/001/010/100/101',
  };
  function glyph(ch) { const g = FONT[ch]; return g ? g.split('/') : null; }

  /* ---------- Painter ---------- */
  class Painter {
    constructor(ctx) { this.x = ctx; }
    rect(x, y, w, h, c) { this.x.fillStyle = c; this.x.fillRect(x | 0, y | 0, Math.max(0, w | 0), Math.max(0, h | 0)); }
    px(x, y, c) { this.x.fillStyle = c; this.x.fillRect(x | 0, y | 0, 1, 1); }
    arect(x, y, w, h, c, a) { this.x.globalAlpha = a; this.rect(x, y, w, h, c); this.x.globalAlpha = 1; }
    apx(x, y, c, a) { this.x.globalAlpha = a; this.px(x, y, c); this.x.globalAlpha = 1; }
    hline(x, y, w, c) { this.rect(x, y, w, 1, c); }
    vline(x, y, h, c) { this.rect(x, y, 1, h, c); }
    outline(x, y, w, h, c) { this.hline(x, y, w, c); this.hline(x, y + h - 1, w, c); this.vline(x, y, h, c); this.vline(x + w - 1, y, h, c); }
    // checkerboard dither between two colors
    dither(x, y, w, h, c1, c2) {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, ((i + j) & 1) ? c1 : c2);
    }
    // vertical gradient, one row per step
    vgrad(x, y, w, h, top, bot) { for (let j = 0; j < h; j++) this.rect(x, y + j, w, 1, mix(top, bot, h <= 1 ? 0 : j / (h - 1))); }
    text(x, y, str, c, scale = 1, sp = 1) {
      let cx = x;
      for (const ch of String(str).toUpperCase()) {
        if (ch === ' ') { cx += (3 + sp) * scale; continue; }
        const g = glyph(ch);
        if (g) for (let r = 0; r < 5; r++) for (let col = 0; col < 3; col++)
          if (g[r][col] === '1') this.rect(cx + col * scale, y + r * scale, scale, scale, c);
        cx += (3 + sp) * scale;
      }
      return cx;
    }
    textW(str, scale = 1, sp = 1) { return String(str).length * (3 + sp) * scale; }
    // soft additive radial glow
    glow(x, y, r, c, a) {
      const ctx = this.x;
      const rgb = hexToRgb(c);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgbToCss(rgb[0], rgb[1], rgb[2], a));
      g.addColorStop(1, rgbToCss(rgb[0], rgb[1], rgb[2], 0));
      const prev = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.globalCompositeOperation = prev;
    }
  }

  window.PX = { W, H, P, Painter, mulberry32, mix, alpha, hexToRgb, rgbToCss, glyph };
})();
