/* ============================================================
   home-sprites.js — detailed, furnished apocalypse-home pixels.
   Base resolution 252 x 448 (9:16). A lived-in studio: warm wood,
   fabric and plants inside; the cold AI world pressing at the window.
   Each fn draws with a Painter `p`; animated parts return anchors.
   ============================================================ */
(function () {
  const { mix, alpha } = window.PX;

  // ---- home palette (warm interior + cold tech) ----
  const C = {
    // walls
    wall0: '#1c2730', wall1: '#243139', wall2: '#2c3b43', wall3: '#36474f',
    wallStain: '#18242a', wallCrack: '#121b20',
    rail: '#3a2e26', wainscot: '#2c2620', wainscotHi: '#3c352c', wainscotLo: '#201c17',
    base: '#171310',
    // warm wood floor
    floor0: '#241a14', floor1: '#34261c', floor2: '#3f2f22', floor3: '#4a3829', floorSeam: '#1a120d', floorGrain: '#2c2017',
    // generic wood
    woodD: '#2a1d15', woodM: '#43301f', woodL: '#5d4329', woodHi: '#7c5a38', woodVHi: '#9a譬',
    // metal
    metal0: '#171c24', metal1: '#2c3540', metal2: '#48535f', metal3: '#6b7787', metal4: '#9aa6b4',
    // glass / sky
    sky0: '#070f18', sky1: '#0c2030', sky2: '#123246', haze: '#163f50', star: '#bfeaf0',
    // accents
    cyan0: '#0c3d47', cyan1: '#1a8595', cyan2: '#33ccdd', cyan3: '#7af2ff', cyan4: '#c9fbff',
    mag0: '#5e1742', mag1: '#b32f7e', mag2: '#ee4ea2', mag3: '#ff8ccb',
    grn1: '#1f9b56', grn2: '#3bee86', grn3: '#a6ffce',
    amber0: '#3a2410', amber1: '#9c6a2c', amber2: '#d99a3e', amber3: '#f2c777', warm: '#ffcf8a',
    // fabrics
    sofa0: '#243b3e', sofa1: '#345155', sofa2: '#446a6f', sofa3: '#58858b',
    duvet0: '#5a3640', duvet1: '#7a4a52', duvet2: '#9a6068', duvetHi: '#b8838a',
    sheet0: '#3a4650', sheet1: '#566571', sheet2: '#76everlater',
    pillow0: '#9a7e5e', pillow1: '#c2a37b', pillow2: '#e0c79b',
    rug0: '#33201e', rug1: '#552c28', rug2: '#763a31', rug3: '#a8854a', rug4: '#2c4f4d', rug5: '#3f706c',
    // plants
    leaf0: '#1f3a26', leaf1: '#315a33', leaf2: '#4a8244', leaf3: '#6fab5c', pot0: '#5e3424', pot1: '#8a4f38', pot2: '#a5634a',
    paper: '#c9c0ad', paperSh: '#9a917f', mug: '#3a6f78',
  };
  // fix a couple of accidental glyphs
  C.woodVHi = '#9a7048'; C.sheet2 = '#8a99a6';

  const HS = { C };

  // helpers -----------------------------------------------------
  function box(p, x, y, w, h, base, hi, lo) {
    p.rect(x, y, w, h, base);
    if (hi) { p.hline(x, y, w, hi); p.vline(x, y, h, hi); }
    if (lo) { p.hline(x, y + h - 1, w, lo); p.vline(x + w - 1, y, h, lo); }
  }

  /* ---------------- room shell ---------------- */
  HS.room = function (p, floorTop) {
    const W = 252, H = 448, rnd = window.PX.mulberry32(99);
    // wall
    p.rect(0, 0, W, floorTop, C.wall1);
    p.vgrad(0, 0, W, 30, C.wall0, C.wall1);
    // wallpaper faint vertical stripe
    for (let x = 0; x < W; x += 8) p.arect(x, 0, 1, floorTop, C.wall2, 0.18);
    for (let x = 4; x < W; x += 8) p.arect(x, 0, 1, floorTop, C.wall0, 0.12);
    // water stains
    for (let i = 0; i < 5; i++) {
      const sx = 10 + rnd() * (W - 30), sy = 6 + rnd() * (floorTop - 70);
      const rw = 14 + rnd() * 26, rh = 18 + rnd() * 30;
      for (let yy = 0; yy < rh; yy++) {
        const ww = Math.round(rw * Math.sin((yy / rh) * Math.PI) * (0.7 + rnd() * 0.3));
        p.arect(sx - ww / 2, sy + yy, ww, 1, C.wallStain, 0.10);
      }
    }
    // a few cracks
    function crack(x, y, len, dir) { let cx = x, cy = y; for (let i = 0; i < len; i++) { p.apx(cx, cy, C.wallCrack, 0.5); cy += 1; cx += (rnd() < 0.5 ? dir : 0); if (rnd() < 0.2) p.apx(cx + 1, cy, C.wallCrack, 0.3); } }
    crack(40, 6, 40, 1); crack(210, 10, 54, -1); crack(150, 4, 24, 1);
    // wainscot (lower wood panelling)
    const wTop = floorTop - 56;
    p.rect(0, wTop, W, 56, C.wainscot);
    p.rect(0, wTop, W, 2, C.rail); p.rect(0, wTop + 2, W, 1, C.wainscotHi); // chair rail
    p.rect(0, wTop + 3, W, 1, C.wainscotLo);
    for (let x = 6; x < W; x += 26) { p.vline(x, wTop + 5, 50, C.wainscotLo); p.vline(x + 1, wTop + 5, 50, C.wainscotHi); }
    // baseboard
    p.rect(0, floorTop - 5, W, 5, C.base); p.rect(0, floorTop - 5, W, 1, C.wainscotHi);

    // floor — warm wood planks, receding
    p.rect(0, floorTop, W, H - floorTop, C.floor1);
    const seams = [floorTop, floorTop + 30, floorTop + 66, floorTop + 110, H];
    for (let s = 0; s < seams.length - 1; s++) {
      const y0 = seams[s], y1 = seams[s + 1];
      p.arect(0, y0, W, y1 - y0, (s & 1) ? C.floor0 : C.floor2, 0.16);
      p.rect(0, y1 - 1, W, 1, C.floorSeam);
      p.rect(0, y0, W, 1, mix(C.floor1, C.floor3, 0.5));
      const step = 40 + s * 12, off = (s % 2) * (step / 2);
      for (let x = off; x < W; x += step) p.rect(x, y0, 1, y1 - y0, C.floorSeam);
      // grain dashes
      for (let g = 0; g < 14; g++) { const gx = rnd() * W, gy = y0 + 2 + rnd() * (y1 - y0 - 4); p.arect(gx, gy, 3 + rnd() * 5, 1, C.floorGrain, 0.4); }
    }
    // soft corner shadows
    p.x.save(); p.x.globalAlpha = 0.4; p.rect(0, 0, 10, floorTop, C.wall0); p.rect(W - 10, 0, 10, floorTop, C.wall0); p.x.restore();
  };

  /* ---------------- window (the cold world outside) ---------------- */
  HS.window = function (p, x, y, w, h, opt) {
    opt = opt || {};
    const rnd = window.PX.mulberry32(opt.seed || 12);
    // frame
    box(p, x - 5, y - 5, w + 10, h + 10, C.woodM, C.woodHi, C.woodD);
    box(p, x - 3, y - 3, w + 6, h + 6, C.woodD, null, null);
    // sky
    p.vgrad(x, y, w, h, C.sky0, C.sky1);
    p.arect(x, y + h - Math.round(h * 0.55), w, Math.round(h * 0.55), C.haze, 0.45);
    // stars
    for (let i = 0; i < 22; i++) p.apx(x + 1 + rnd() * (w - 2), y + 1 + rnd() * (h * 0.6), C.star, 0.4 + rnd() * 0.5);
    // skyline + lit windows
    const baseY = y + h - 1, lit = [];
    let bx = x;
    while (bx < x + w) {
      const bw = 6 + (rnd() * 10 | 0), bh = Math.min(10 + (rnd() * 38 | 0), h - 6);
      p.rect(bx, baseY - bh, Math.min(bw, x + w - bx), bh, C.sky0); p.vline(bx, baseY - bh, bh, '#04090e');
      for (let gy = baseY - bh + 2; gy < baseY - 2; gy += 4) for (let gx = bx + 2; gx < bx + bw - 1; gx += 4)
        if (rnd() < 0.2 && gx < x + w - 1) lit.push({ x: gx, y: gy, c: rnd() < 0.7 ? C.cyan2 : C.mag2 });
      bx += bw + 1;
    }
    // AI data tower with beacon
    const tx = x + Math.round(w * 0.7), th = Math.min(Math.round(h * 0.85), h - 4);
    p.rect(tx, baseY - th, 9, th, C.sky0); box(p, tx, baseY - th, 9, th, C.sky0, null, '#04090e');
    p.vline(tx + 4, baseY - th, th, mix(C.sky0, C.sky1, 0.6));
    p.vline(tx + 4, baseY - th - 8, 8, C.metal1);
    const beacon = { x: tx + 4, y: baseY - th - 9 };
    // muntins: 2x3 panes
    p.rect(x + Math.round(w / 2) - 1, y, 2, h, C.woodM);
    p.rect(x + Math.round(w / 3) - 1, y, 2, h, C.woodD);
    p.rect(x + Math.round(2 * w / 3) - 1, y, 2, h, C.woodD);
    p.rect(x, y + Math.round(h / 2) - 1, w, 2, C.woodM);
    // inner glass highlight
    p.apx(x + 2, y + 2, C.cyan3, 0.4);
    // sill
    p.rect(x - 7, y + h + 5, w + 14, 4, C.woodL); p.rect(x - 7, y + h + 5, w + 14, 1, C.woodHi); p.rect(x - 7, y + h + 8, w + 14, 1, C.woodD);
    return { interior: { x, y, w, h }, lit, beacon, droneArea: { x: x + 1, y: y + 1, w: w - 2, h: Math.round(h * 0.55) } };
  };

  /* ---------------- curtains ---------------- */
  HS.curtains = function (p, x, y, w, h) {
    // rod
    p.rect(x - 8, y - 6, w + 16, 2, C.metal2); p.rect(x - 8, y - 6, w + 16, 1, C.metal3);
    p.rect(x - 9, y - 8, 3, 4, C.metal2); p.rect(x + w + 6, y - 8, 3, 4, C.metal2);
    const drape = (dx, dw, flip) => {
      for (let i = 0; i < dw; i++) {
        const col = (i % 5 < 2) ? C.duvet0 : (i % 5 === 2 ? C.duvet1 : C.duvet0);
        const shade = (i % 5);
        let c = C.duvet0; if (shade === 2) c = C.duvet1; if (shade === 3) c = mix(C.duvet0, C.duvet1, 0.5);
        p.vline(dx + i, y - 4, h, c);
      }
      // top gather + bottom scallop
      p.rect(dx, y - 4, dw, 2, C.duvet1);
      for (let i = 0; i < dw; i += 4) p.rect(dx + i, y + h - 4 + ((i / 4 | 0) % 2), 4, 4, C.duvet0);
    };
    drape(x - 6, 16, false);   // left drape
    drape(x + w - 10, 16, true); // right drape
  };

  /* ---------------- surveillance camera ---------------- */
  HS.camera = function (p, x, y, dir) {
    dir = dir || -1;
    p.rect(x + 8, y - 6, 4, 6, C.metal1); p.rect(x + 8, y - 6, 4, 1, C.metal3); // mount
    box(p, x, y, 20, 11, C.metal2, C.metal3, C.metal0);
    const sx = dir < 0 ? x - 6 : x + 20;
    box(p, sx, y + 3, 6, 6, C.metal1, C.metal3, C.metal0);
    const lx = dir < 0 ? sx : sx + 2;
    p.rect(lx, y + 4, 4, 4, C.cyan0); p.px(lx + (dir < 0 ? 0 : 3), y + 4, C.cyan3);
    return { led: { x: dir < 0 ? x + 16 : x + 3, y: y + 2 } };
  };

  /* ---------------- bookshelf ---------------- */
  HS.bookshelf = function (p, x, y, w, h) {
    box(p, x, y, w, h, C.woodM, C.woodHi, C.woodD);
    box(p, x + 2, y + 2, w - 4, h - 4, C.woodD, null, null);
    const rnd = window.PX.mulberry32(7);
    const shelves = 4, sh = Math.floor((h - 6) / shelves);
    const bookCols = [C.duvet1, C.sofa2, C.amber1, C.grn1, C.cyan1, C.mag1, C.paper, C.woodL, C.rug2];
    for (let s = 0; s < shelves; s++) {
      const sy = y + 3 + s * sh, by = sy + sh - 4;
      p.rect(x + 2, by, w - 4, 2, C.woodL); // shelf board
      // books
      let bx = x + 4;
      while (bx < x + w - 6) {
        const bw = 3 + (rnd() * 4 | 0), bhh = sh - 6 - (rnd() * 4 | 0);
        if (s === 1 && bx > x + w - 22) break; // leave room for prop
        const c = bookCols[(rnd() * bookCols.length) | 0];
        p.rect(bx, by - bhh, bw, bhh, c);
        p.vline(bx, by - bhh, bhh, mix(c, '#fff', 0.25));
        p.vline(bx + bw - 1, by - bhh, bhh, mix(c, '#000', 0.4));
        p.apx(bx + 1, by - bhh + 2, mix(c, '#fff', 0.4), 0.6);
        bx += bw + 1;
        if (rnd() < 0.16) { p.rect(bx, by - 4, 8, 4, C.metal2); bx += 9; } // a lain-flat book/can
      }
    }
    // a potted plant on top
    HS.plant(p, x + w - 16, y - 14, false);
    // a framed photo leaning on shelf 1
    const fy = y + 3 + sh + sh - 4 - 14;
    box(p, x + w - 18, fy, 13, 14, C.woodL, C.woodHi, C.woodD);
    p.rect(x + w - 16, fy + 2, 9, 10, C.sky2); p.px(x + w - 13, fy + 6, C.star); p.px(x + w - 11, fy + 8, C.cyan2);
  };

  /* ---------------- desk + computer + chair ---------------- */
  // returns { screen:{x,y,w,h}, lamp:{x,y} }
  HS.desk = function (p, x, y, w, opt) {
    opt = opt || {};
    const topH = 5, legH = opt.legH || 40;
    // top
    box(p, x, y, w, topH, C.woodL, C.woodHi, C.woodD);
    p.rect(x, y + topH, w, 1, C.woodD);
    // legs + a drawer block on the right
    p.rect(x + 2, y + topH, 4, legH, C.woodM); p.rect(x + w - 6, y + topH, 4, legH, C.woodM);
    box(p, x + w - 26, y + topH, 24, legH - 2, C.woodM, C.woodHi, C.woodD); // drawer cabinet
    p.rect(x + w - 24, y + topH + 6, 20, 6, C.woodD); p.rect(x + w - 14, y + topH + 9, 4, 2, C.metal3);
    p.rect(x + w - 24, y + topH + 18, 20, 6, C.woodD); p.rect(x + w - 14, y + topH + 21, 4, 2, C.metal3);
    // CRT monitor
    const mw = 34, mh = 26, mx = x + 6, my = y - mh - 1;
    box(p, mx, my, mw, mh, C.metal2, C.metal3, C.metal0);
    box(p, mx + mw, my + 6, 4, mh - 12, C.metal1, null, C.metal0); // bulge back
    const screen = { x: mx + 4, y: my + 4, w: mw - 8, h: mh - 9 };
    p.rect(screen.x, screen.y, screen.w, screen.h, '#05080c');
    p.rect(mx + 3, my + mh - 4, mw - 6, 3, C.metal1); // base
    p.rect(mx + mw / 2 - 3, my + mh, 6, 2, C.metal2);
    // keyboard + mug + papers on desk
    box(p, x + 10, y - 4, 26, 4, C.metal1, C.metal3, C.metal0);
    for (let kx = x + 12; kx < x + 34; kx += 3) p.rect(kx, y - 3, 2, 2, C.metal2);
    // mug
    p.rect(x + 42, y - 7, 6, 7, C.mug); p.rect(x + 42, y - 7, 6, 1, mix(C.mug, '#fff', 0.3)); p.rect(x + 48, y - 5, 2, 3, C.metal1);
    // papers
    p.rect(x + 52, y - 3, 10, 3, C.paper); p.rect(x + 54, y - 5, 10, 3, C.paperSh); p.px(x + 56, y - 4, C.cyan1);
    // small desk lamp (clip-on)
    p.rect(x + w - 14, y - 1, 2, 1, C.metal2); p.rect(x + w - 14, y - 9, 1, 8, C.metal2); p.rect(x + w - 16, y - 13, 6, 4, C.metal1); p.rect(x + w - 15, y - 9, 4, 1, C.amber2);
    const lamp = { x: x + w - 13, y: y - 8 };
    return { screen, lamp };
  };

  HS.chair = function (p, x, y) {
    // simple wooden chair, back to viewer-ish
    box(p, x, y, 22, 4, C.woodM, C.woodHi, C.woodD); // seat
    p.rect(x + 1, y + 4, 3, 18, C.woodM); p.rect(x + 18, y + 4, 3, 18, C.woodM); // front legs
    p.rect(x + 2, y - 16, 3, 16, C.woodM); p.rect(x + 17, y - 16, 3, 16, C.woodM); // back posts
    p.rect(x + 2, y - 14, 18, 3, C.woodL); p.rect(x + 2, y - 8, 18, 2, C.woodM); // back slats
    p.rect(x + 4, y + 1, 14, 2, C.woodHi);
  };

  /* ---------------- bed (vertical: head at top, against wall) ---------------- */
  HS.bed = function (p, x, y, w, h) {
    // floor shadow
    p.arect(x - 3, y + h - 2, w + 8, 8, '#000', 0.4);
    // headboard at top
    box(p, x - 3, y - 10, w + 6, 12, C.woodM, C.woodHi, C.woodD);
    p.rect(x - 1, y - 7, w + 2, 5, C.woodL); p.rect(x - 1, y - 7, w + 2, 1, C.woodHi);
    // frame rails (left/right/foot)
    box(p, x - 3, y, w + 6, h + 6, C.woodD, C.woodM, C.woodD);
    p.rect(x - 3, y + h + 2, w + 6, 4, C.woodM); // footboard
    // mattress / sheet
    box(p, x, y, w, h, C.sheet1, C.sheet2, C.sheet0);
    // duvet covers lower ~62%, folded back at top
    const dy = y + Math.round(h * 0.36);
    p.rect(x, dy, w, y + h - dy, C.duvet1);
    p.rect(x, dy, w, 2, C.duvetHi);       // fold highlight (turned-down edge)
    p.rect(x, dy + 2, w, 1, C.duvet0);
    p.rect(x, dy - 3, w, 3, C.duvet2);    // the turned-down flap (lighter)
    p.rect(x, dy - 3, w, 1, C.duvetHi);
    // quilting + vertical folds
    for (let qx = x + 5; qx < x + w - 3; qx += 11)
      for (let qy = dy + 8; qy < y + h - 3; qy += 11) { p.apx(qx, qy, C.duvet0, 0.55); p.apx(qx + 1, qy + 1, C.duvetHi, 0.4); }
    for (let i = 0; i < 3; i++) { const fx = x + 6 + i * Math.round((w - 12) / 3); p.arect(fx, dy + 4, 1, y + h - dy - 5, C.duvet0, 0.5); p.arect(fx + 1, dy + 4, 1, y + h - dy - 5, C.duvet2, 0.35); }
    // two pillows at the head
    box(p, x + 2, y + 3, Math.round(w / 2) - 3, 16, C.pillow1, C.pillow2, C.pillow0);
    box(p, x + Math.round(w / 2) + 1, y + 3, Math.round(w / 2) - 4, 16, C.pillow1, C.pillow2, C.pillow0);
    p.arect(x + 4, y + 6, Math.round(w / 2) - 7, 1, C.pillow2, 0.7);
    p.arect(x + Math.round(w / 2) + 3, y + 6, Math.round(w / 2) - 8, 1, C.pillow2, 0.7);
    // a rumpled dip where the player slept
    p.arect(x + 6, y + 22, w - 12, 6, C.sheet0, 0.4);
    // cold rim-light along the window-side (left) edge
    p.vline(x, y, h, mix(C.sheet2, C.cyan2, 0.4));
    return { x, y, w, h };
  };

  /* ---------------- side table + lamp + clock ---------------- */
  HS.sideTable = function (p, x, y) {
    box(p, x, y, 22, 4, C.woodL, C.woodHi, C.woodD); // top
    p.rect(x + 2, y + 4, 3, 18, C.woodM); p.rect(x + 17, y + 4, 3, 18, C.woodM);
    box(p, x + 2, y + 6, 18, 10, C.woodM, C.woodHi, C.woodD); // small drawer
    p.rect(x + 9, y + 10, 4, 2, C.metal3);
    // lamp
    p.rect(x + 5, y - 2, 2, 1, C.metal2); p.rect(x + 5, y - 9, 2, 7, C.metal2);
    p.rect(x + 1, y - 16, 10, 7, C.amber1); // shade
    p.rect(x + 1, y - 16, 10, 1, C.amber2); p.rect(x + 1, y - 10, 10, 1, C.amber0);
    const lamp = { x: x + 6, y: y - 9 };
    // alarm clock
    box(p, x + 13, y - 7, 8, 7, C.metal1, C.metal3, C.metal0);
    p.rect(x + 14, y - 6, 6, 4, '#0a0f0c');
    const led = { x: x + 15, y: y - 5 };
    return { lamp, led };
  };

  /* ---------------- sofa ---------------- */
  HS.sofa = function (p, x, y, w, h) {
    p.arect(x - 2, y + h - 2, w + 6, 6, '#000', 0.35);
    // back
    box(p, x, y, w, 14, C.sofa1, C.sofa3, C.sofa0);
    // arms
    box(p, x, y + 6, 12, h - 6, C.sofa1, C.sofa3, C.sofa0);
    box(p, x + w - 12, y + 6, 12, h - 6, C.sofa1, C.sofa3, C.sofa0);
    // seat base
    box(p, x + 10, y + h - 12, w - 20, 12, C.sofa0, C.sofa1, '#1a2c2e');
    // seat cushions
    const n = 2, cw = Math.floor((w - 28) / n);
    for (let i = 0; i < n; i++) { const cx = x + 12 + i * cw; box(p, cx, y + 14, cw - 2, h - 24, C.sofa2, C.sofa3, C.sofa0); p.arect(cx + 2, y + 16, cw - 6, 1, C.sofa3, 0.6); }
    // back cushions
    for (let i = 0; i < n; i++) { const cx = x + 12 + i * cw; box(p, cx, y + 2, cw - 2, 13, C.sofa2, C.sofa3, C.sofa0); }
    // throw pillow
    box(p, x + w - 26, y + 14, 13, 13, C.amber1, C.amber2, C.amber0); p.apx(x + w - 22, y + 17, C.amber3, 0.8);
    // a throw blanket draped over the left arm
    p.rect(x + 1, y + 8, 12, 16, C.duvet1); p.rect(x + 1, y + 8, 12, 2, C.duvetHi);
    for (let i = 0; i < 12; i += 3) p.vline(x + 1 + i, y + 8, 18, C.duvet0);
    p.rect(x + 1, y + 22, 12, 4, C.duvet0); // hanging fringe
  };

  /* ---------------- coffee table ---------------- */
  HS.coffeeTable = function (p, x, y, w) {
    p.arect(x, y + 9, w, 4, '#000', 0.3);
    box(p, x, y, w, 4, C.woodL, C.woodHi, C.woodD); // top
    p.rect(x + 2, y + 4, 3, 8, C.woodM); p.rect(x + w - 5, y + 4, 3, 8, C.woodM);
    // stuff on top: book, mug, small radio
    p.rect(x + 4, y - 3, 12, 3, C.duvet1); p.rect(x + 5, y - 4, 12, 3, C.sofa2); p.px(x + 7, y - 3, C.paper);
    p.rect(x + 20, y - 5, 5, 5, C.mug); p.rect(x + 20, y - 5, 5, 1, mix(C.mug, '#fff', 0.3)); p.rect(x + 25, y - 4, 2, 2, C.metal2);
    // radio
    box(p, x + w - 16, y - 7, 13, 7, C.woodM, C.woodHi, C.woodD); p.rect(x + w - 14, y - 5, 5, 3, C.amber1); p.px(x + w - 6, y - 5, C.grn2); p.vline(x + w - 5, y - 11, 4, C.metal2);
  };

  /* ---------------- rug ---------------- */
  HS.rug = function (p, cx, cy, rw, rh) {
    for (let yy = -rh; yy <= rh; yy++) {
      const xw = Math.floor(rw * Math.sqrt(Math.max(0, 1 - (yy / rh) * (yy / rh))));
      const t = Math.abs(yy) / rh;
      let c = C.rug1; if (t > 0.86) c = C.rug3; else if (t > 0.7) c = C.rug2; else if (t < 0.3) c = C.rug4;
      p.rect(cx - xw, cy + yy, xw * 2 + 1, 1, c);
    }
    // center medallion
    for (let yy = -Math.round(rh * 0.42); yy <= Math.round(rh * 0.42); yy++) {
      const xw = Math.floor(rw * 0.55 * Math.sqrt(Math.max(0, 1 - (yy / (rh * 0.42)) * (yy / (rh * 0.42)))));
      p.arect(cx - xw, cy + yy, xw * 2 + 1, 1, C.rug5, 0.5);
    }
    // diamond motif
    for (let i = -2; i <= 2; i++) { const mx = cx + i * Math.round(rw * 0.28); for (let d = -3; d <= 3; d++) { const ww = 3 - Math.abs(d); p.arect(mx - ww, cy + d * 2, ww * 2 + 1, 1, C.rug3, 0.7); } }
    // border ring
    for (let a = 0; a < 360; a += 3) { const r1 = 0.9; p.apx(cx + Math.cos(a * Math.PI / 180) * rw * r1, cy + Math.sin(a * Math.PI / 180) * rh * r1, C.rug3, 0.5); }
  };

  /* ---------------- potted plant ---------------- */
  HS.plant = function (p, x, y, big) {
    const s = big ? 2 : 1;
    // pot
    const pw = big ? 16 : 11, ph = big ? 14 : 10;
    box(p, x, y + (big ? 22 : 12), pw, ph, C.pot1, C.pot2, C.pot0);
    p.rect(x, y + (big ? 22 : 12), pw, 2, C.pot2); p.rect(x, y + (big ? 21 : 11), pw + 1, 2, C.pot0);
    // foliage clusters
    const cx = x + pw / 2, base = y + (big ? 22 : 12);
    const leaves = big ? 22 : 12;
    const rnd = window.PX.mulberry32(big ? 3 : 8);
    for (let i = 0; i < leaves; i++) {
      const ang = -Math.PI / 2 + (rnd() - 0.5) * 2.4;
      const len = (big ? 16 : 10) * (0.5 + rnd() * 0.7);
      const lx = cx + Math.cos(ang) * len * (0.7 + rnd() * 0.6);
      const ly = base + Math.sin(ang) * len;
      const c = [C.leaf0, C.leaf1, C.leaf2, C.leaf3][(rnd() * 4) | 0];
      // a leaf = short fat stroke
      for (let t = 0; t < (big ? 5 : 3); t++) { p.px(cx + (lx - cx) * t / 4, base + (ly - base) * t / 4, c); }
      p.rect(lx - 1, ly - 1, 2, 2, c);
    }
    p.vline(cx, base - 4, 4, C.leaf0);
  };

  HS.floorLamp = function (p, x, y) {
    p.rect(x - 4, y + 40, 9, 3, C.metal1); p.rect(x - 4, y + 40, 9, 1, C.metal3); // base
    p.rect(x, y, 2, 42, C.metal2); p.rect(x, y, 1, 42, C.metal3);
    // shade
    for (let i = 0; i < 8; i++) p.rect(x - 7 + i, y - 10 + i, 16 - i * 2, 1, C.amber1);
    p.rect(x - 7, y - 2, 16, 1, C.amber0);
    return { x: x + 1, y: y - 6 };
  };

  HS.supplies = function (p, x, y) {
    // crate
    box(p, x, y + 14, 26, 18, C.woodM, C.woodHi, C.woodD);
    for (let i = 0; i < 26; i++) { p.px(x + i, y + 14 + Math.round(i * 18 / 26), C.woodHi); p.px(x + i, y + 31 - Math.round(i * 18 / 26), C.woodHi); }
    // cans on top
    const can = (cx, cy, c) => { box(p, cx, cy, 8, 10, C.metal2, C.metal3, C.metal0); p.rect(cx, cy, 8, 2, C.metal3); p.rect(cx, cy + 4, 8, 3, c); p.px(cx + 2, cy + 5, C.metal0); };
    can(x + 2, y + 4, C.cyan1); can(x + 11, y + 4, C.amber1); can(x + 7, y - 6, C.mag1);
    // a water jug
    box(p, x + 20, y - 2, 9, 16, C.cyan0, C.cyan1, C.metal0); p.rect(x + 22, y, 5, 9, alpha(C.cyan2, 0.5)); p.rect(x + 23, y - 4, 3, 3, C.metal2);
  };

  HS.tally = function (p, x, y, count, c) {
    let gx = x; const groups = Math.floor(count / 5), rem = count % 5;
    const grp = (gx, full) => { for (let i = 0; i < Math.min(full, 4); i++) p.rect(gx + i * 2, y, 1, 8, c); if (full >= 5) for (let i = 0; i < 8; i++) p.px(gx - 1 + i, y + i, c); };
    for (let g = 0; g < groups; g++) { grp(gx, 5); gx += 12; }
    if (rem) grp(gx, rem);
  };

  HS.frames = function (p, x, y) {
    const f = (fx, fy, fw, fh, c) => { box(p, fx, fy, fw, fh, C.woodL, C.woodHi, C.woodD); p.rect(fx + 2, fy + 2, fw - 4, fh - 4, c); };
    f(x, y, 16, 20, C.sky2); p.px(x + 6, y + 8, C.star); p.px(x + 9, y + 12, C.cyan2);
    f(x + 20, y + 4, 14, 14, C.duvet0); p.rect(x + 24, y + 8, 6, 6, C.amber1);
    f(x + 6, y + 24, 18, 12, C.wall0); p.rect(x + 9, y + 28, 12, 4, C.grn1);
  };

  HS.cables = function (p, pts) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let s = 0; s <= steps; s++) { const xx = Math.round(x0 + (x1 - x0) * s / steps), yy = Math.round(y0 + (y1 - y0) * s / steps); p.px(xx, yy, C.metal0); p.px(xx, yy + 1, C.metal1); }
    }
  };

  HS.fairyString = function (p, pts) {
    const bulbs = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let s = 0; s <= steps; s++) { const xx = Math.round(x0 + (x1 - x0) * s / steps), yy = Math.round(y0 + (y1 - y0) * s / steps); p.apx(xx, yy, C.metal1, 0.7); }
    }
    // bulbs spaced along
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      for (let t = 0; t <= 1.0001; t += 0.34) { const xx = Math.round(x0 + (x1 - x0) * t), yy = Math.round(y0 + (y1 - y0) * t) + 2; bulbs.push({ x: xx, y: yy, dead: window.PX.mulberry32(xx * 7 + yy)() < 0.22 }); }
    }
    return bulbs;
  };

  window.HS = HS;
})();
