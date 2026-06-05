/* ============================================================
   room.js — composes the furnished apocalypse-home (252x448) and
   animates: drones at the window, glitchy CRT, breathing warm
   lamps, blinking camera/clock LEDs, flickering fairy lights,
   floating dust in the cold window-light, periodic signal-glitch.
   ============================================================ */
(function () {
  const { Painter, mulberry32, mix, alpha, hexToRgb, rgbToCss } = window.PX;
  const HS = window.HS, C = HS.C;
  const RW = 252, RH = 448, FLOOR = 255;

  function mk() { const c = document.createElement('canvas'); c.width = RW; c.height = RH; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return { c, x }; }

  class Room {
    constructor(canvas) {
      canvas.width = RW; canvas.height = RH;
      this.cv = canvas; this.ctx = canvas.getContext('2d'); this.ctx.imageSmoothingEnabled = false;
      this.p = new Painter(this.ctx);
      const s = mk(); this.sc = s.c; this.sp = new Painter(s.x);
      const t = mk(); this.tc = t.c; this.tx = t.x;
      this.rnd = mulberry32(2026);
      this.A = {};
      this.glitchUntil = 0; this.nextGlitch = 2 + this.rnd() * 3;
      this.t0 = performance.now() / 1000;
      this.build();
      this.buildOverlay();
      this.initDust();
    }

    /* ===================== static build ===================== */
    build() {
      const p = this.sp;
      HS.room(p, FLOOR);

      // --- wall layer ---
      const win = HS.window(p, 84, 46, 92, 100, { seed: 14 });
      this.A.win = win;
      this.A.drones = this.makeDrones(win.droneArea, 2);
      HS.curtains(p, 84, 46, 92, 100);
      this.A.fairy = HS.fairyString(p, [[4, 20], [58, 34], [120, 16], [182, 32], [248, 14]]);
      const cam = HS.camera(p, 222, 16, -1);
      this.A.camLed = { ...cam.led, c: C.mag2, period: 1.2, on: 0.18 };
      HS.frames(p, 196, 60);
      // countdown scratched into wall, right of window
      /* 墙上只留无数字刻痕——具体天数由游戏 HUD 显示，写死会和 Day 1/7 冲突 */
      HS.tally(p, 198, 160, 53, alpha(C.grn1, 0.9));
      p.text(198, 178, 'STILL', C.grn1, 1, 1);
      p.text(198, 186, 'HERE', C.grn1, 1, 1);
      HS.bookshelf(p, 6, 66, 46, 189);

      // --- floor layer (back to front) ---
      // supplies tucked between shelf and desk
      HS.supplies(p, 54, 222);
      // desk under the window + chair + CRT
      const desk = HS.desk(p, 80, 210, 92, { legH: 44 });
      this.A.screen = desk.screen;
      this.A.deskLamp = { ...desk.lamp, c: C.amber2, r: 16, base: 0.8 };
      HS.cables(p, [[92, desk.screen.y + desk.screen.h + 8], [92, 250], [110, 254], [70, FLOOR + 8]]);
      HS.chair(p, 112, 230);
      // nightstand between desk and bed
      const nt = HS.sideTable(p, 172, 248);
      this.A.ntLamp = { ...nt.lamp, c: C.amber2, r: 15, base: 0.85 };
      this.A.clockLed = { ...nt.led, c: C.grn2, period: 2.0, on: 0.5 };
      // bed (vertical), right side
      HS.bed(p, 194, 252, 54, 150);
      // rug
      HS.rug(p, 104, 372, 84, 54);
      // floor lamp behind sofa
      this.A.floorLamp = { ...HS.floorLamp(p, 20, 318), c: C.amber2, r: 20, base: 0.8 };
      // tall plant front-left corner
      HS.plant(p, 2, 296, true);
      // sofa front-left + throw
      HS.sofa(p, 14, 356, 104, 64);
      // coffee table on the rug
      HS.coffeeTable(p, 124, 392, 46);

      // cold light shaft from the window onto the floor
      this.A.shaft = { from: [88, 146, 172, 146], to: [56, FLOOR + 120, 210, FLOOR + 90], c: C.cyan2, a: 0.05 };
    }

    makeDrones(area, n) {
      const cols = [C.cyan2, C.mag2]; const out = [];
      for (let i = 0; i < n; i++) out.push({
        x: area.x + this.rnd() * area.w, y: area.y + 4 + this.rnd() * (area.h - 8),
        spd: 6 + this.rnd() * 8, dir: this.rnd() < 0.5 ? 1 : -1, c: cols[i % 2], phase: this.rnd() * 6, bob: 1 + this.rnd() * 1.5,
      });
      return out;
    }

    buildOverlay() {
      const o = mk(); this.ov = o.c; const op = new Painter(o.x), ox = o.x;
      for (let y = 0; y < RH; y += 2) op.arect(0, y, RW, 1, '#000', 0.13);
      const g = ox.createRadialGradient(RW / 2, RH * 0.46, 70, RW / 2, RH * 0.52, 230);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(3,6,10,0.5)');
      ox.fillStyle = g; ox.fillRect(0, 0, RW, RH);
    }

    initDust() {
      this.dust = [];
      for (let i = 0; i < 34; i++) this.dust.push({ x: this.rnd() * RW, y: this.rnd() * RH, vy: 1.4 + this.rnd() * 3, sway: this.rnd() * 7, ph: this.rnd() * 6, a: 0.1 + this.rnd() * 0.38, c: this.rnd() < 0.7 ? C.cyan3 : C.star });
    }

    /* ===================== frame ===================== */
    render(now) {
      const t = now / 1000 - this.t0;
      const ctx = this.ctx;
      ctx.clearRect(0, 0, RW, RH);
      ctx.drawImage(this.sc, 0, 0);
      this.drawShaft(t);
      this.drawWindow(t);
      this.drawScreen(t);
      this.drawWarmLamps(t);
      this.drawFairy(t);
      this.drawLEDs(t);
      this.drawDust(t);
      ctx.drawImage(this.ov, 0, 0);
      this.maybeGlitch(t);
    }

    drawShaft(t) {
      const s = this.A.shaft, ctx = this.ctx; const c = hexToRgb(s.c);
      const fl = 0.6 + 0.4 * Math.sin(t * 1.2);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rgbToCss(c[0], c[1], c[2], s.a * fl);
      ctx.beginPath(); ctx.moveTo(s.from[0], s.from[1]); ctx.lineTo(s.from[2], s.from[3]); ctx.lineTo(s.to[2], s.to[3]); ctx.lineTo(s.to[0], s.to[1]); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    drawWindow(t) {
      const win = this.A.win, a = win.interior, ctx = this.ctx, p = this.p;
      ctx.save(); ctx.beginPath(); ctx.rect(a.x, a.y, a.w, a.h); ctx.clip();
      for (let i = 0; i < win.lit.length; i++) { const L = win.lit[i]; const on = Math.sin(t * 1.6 + i * 1.3) > 0.2 ? 1 : 0.15; p.apx(L.x, L.y, L.c, 0.55 * on + 0.1); }
      if (win.beacon) { const b = win.beacon; const on = (t % 1.6) < 0.25; p.apx(b.x, b.y, on ? C.mag3 : C.mag0, on ? 1 : 0.4); if (on) p.glow(b.x, b.y, 5, C.mag2, 0.5); }
      for (const d of this.A.drones) {
        d.x += d.spd * d.dir / 60;
        if (d.x < a.x - 8) d.x = a.x + a.w + 6; if (d.x > a.x + a.w + 8) d.x = a.x - 6;
        this.drone(Math.round(d.x), Math.round(d.y + Math.sin(t * 1.4 + d.phase) * d.bob), d.dir, d.c, t);
      }
      ctx.restore();
    }
    drone(x, y, dir, c, t) {
      const p = this.p;
      p.rect(x - 3, y, 6, 2, C.metal1); p.rect(x - 1, y - 1, 2, 1, C.metal2);
      p.px(x - 4, y, C.metal0); p.px(x + 3, y, C.metal0);
      p.apx(x - 5, y - 1, C.metal3, 0.4); p.apx(x + 4, y - 1, C.metal3, 0.4);
      if (Math.sin(t * 7 + x) > 0) { p.px(x, y + 2, c); p.glow(x, y + 2, 4, c, 0.6); } else p.apx(x, y + 2, c, 0.3);
    }

    drawScreen(t) {
      const r = this.A.screen, ctx = this.ctx, p = this.p;
      ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
      const fl = this.rnd() < 0.04 ? 0.55 : 1;
      // alternate eye / terminal every ~6s
      const mode = (Math.floor(t / 6) % 2);
      if (mode === 0) this.screenEye(r, t, fl); else this.screenTerm(r, t, fl);
      for (let y = r.y; y < r.y + r.h; y += 2) p.arect(r.x, y, r.w, 1, '#000', 0.22);
      ctx.restore();
      p.glow(r.x + r.w / 2, r.y + r.h / 2, r.w * 0.9, mode === 0 ? C.cyan2 : C.grn2, 0.07 * fl);
    }
    screenEye(r, t, fl) {
      const p = this.p, cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      p.rect(r.x, r.y, r.w, r.h, mix('#05080c', C.cyan0, 0.4 * fl));
      const ew = r.w * 0.4, eh = r.h * 0.3, blink = (t % 4.4) > 4.15 ? 0.15 : 1;
      for (let yy = -eh; yy <= eh; yy++) { const xw = Math.round(ew * Math.sqrt(Math.max(0, 1 - (yy / eh) ** 2))); p.apx(cx - xw, cy + yy, C.cyan3, 0.9 * fl); p.apx(cx + xw, cy + yy, C.cyan3, 0.9 * fl); }
      if (blink > 0.5) {
        const ox = Math.sin(t * 0.7) * ew * 0.4, ir = Math.max(2, eh * 0.7);
        for (let yy = -ir; yy <= ir; yy++) { const xw = Math.round(Math.sqrt(Math.max(0, ir * ir - yy * yy))); p.arect(cx + ox - xw, cy + yy, xw * 2 + 1, 1, C.mag1, 0.85 * fl); }
        p.arect(cx + ox - 1, cy - 1, 2, 2, '#05080c', 1); p.apx(cx + ox + 1, cy - 1, C.cyan4, fl);
      } else p.rect(cx - ew, cy - 1, ew * 2, 2, C.cyan1);
    }
    screenTerm(r, t, fl) {
      const p = this.p; p.rect(r.x, r.y, r.w, r.h, mix('#05080c', '#0f3a24', 0.3 * fl));
      const rows = Math.floor((r.h - 3) / 6), scroll = Math.floor(t * 3);
      for (let i = 0; i < rows; i++) {
        const rr = mulberry32(((i + scroll) * 2654435761) % 9973);
        let s = ''; const len = 3 + (rr() * 6 | 0), chars = '01ABCDEF#>/.';
        for (let k = 0; k < len; k++) s += chars[(rr() * chars.length) | 0];
        p.text(r.x + 2, r.y + 2 + i * 6, s, alpha(rr() < 0.18 ? C.mag2 : C.grn2, 0.85 * fl), 1, 1);
      }
      if ((t % 1) < 0.5) p.rect(r.x + 2, r.y + 2 + (rows - 1) * 6, 3, 5, C.grn3);
    }

    drawWarmLamps(t) {
      const lamps = [this.A.deskLamp, this.A.ntLamp, this.A.floorLamp];
      for (let i = 0; i < lamps.length; i++) {
        const l = lamps[i]; if (!l) continue;
        let lvl = (l.base || 0.8) * (0.8 + 0.2 * Math.sin(t * 1.0 + i * 1.7));
        if (this.rnd() < 0.02) lvl *= 0.55;
        const r = l.r || 16;
        this.p.glow(l.x, l.y + 8, r * 2.4, l.c, 0.09 * lvl);  // soft ambient pool
        this.p.glow(l.x, l.y, r * 1.4, l.c, 0.26 * lvl);      // core glow
        this.p.glow(l.x, l.y, r * 0.5, '#fff', 0.10 * lvl);   // hot center
        this.p.apx(l.x, l.y, mix(l.c, '#fff', 0.5), Math.min(1, lvl));
      }
    }

    drawFairy(t) {
      for (let i = 0; i < this.A.fairy.length; i++) {
        const b = this.A.fairy[i];
        if (b.dead) { if (this.rnd() < 0.006) { this.p.apx(b.x, b.y, C.warm, 0.5); } continue; }
        const lvl = 0.6 + 0.4 * Math.sin(t * 2 + i * 1.1);
        this.p.apx(b.x, b.y, C.warm, Math.min(1, lvl + 0.2));
        this.p.glow(b.x, b.y, 4, C.amber2, 0.35 * lvl);
      }
    }

    drawLEDs(t) {
      [this.A.camLed, this.A.clockLed].forEach(l => {
        if (!l) return; const ph = (t % l.period) / l.period, on = ph < l.on;
        if (on) { this.p.px(l.x, l.y, l.c); this.p.glow(l.x, l.y, 3.5, l.c, 0.5); } else this.p.apx(l.x, l.y, l.c, 0.25);
      });
    }

    drawDust(t) {
      for (const d of this.dust) {
        d.y -= d.vy / 60; if (d.y < -2) { d.y = RH + 2; d.x = this.rnd() * RW; }
        const x = d.x + Math.sin(t * 0.6 + d.ph) * d.sway, tw = 0.6 + 0.4 * Math.sin(t * 2 + d.ph);
        this.p.apx(Math.round(x), Math.round(d.y), d.c, d.a * tw);
      }
    }

    maybeGlitch(t) {
      if (t > this.nextGlitch) { this.glitchUntil = t + 0.08 + this.rnd() * 0.14; this.nextGlitch = t + 3 + this.rnd() * 5; }
      if (t >= this.glitchUntil) return;
      const ctx = this.ctx; this.tx.clearRect(0, 0, RW, RH); this.tx.drawImage(this.cv, 0, 0);
      const bands = 2 + (this.rnd() * 3 | 0);
      for (let i = 0; i < bands; i++) {
        const by = this.rnd() * RH | 0, bh = 2 + (this.rnd() * 12 | 0), dx = (this.rnd() * 10 - 5) | 0;
        ctx.save(); ctx.beginPath(); ctx.rect(0, by, RW, bh); ctx.clip(); ctx.clearRect(0, by, RW, bh); ctx.drawImage(this.tc, dx, 0); ctx.restore();
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 2; i++) { const ly = this.rnd() * RH | 0; ctx.fillStyle = alpha(this.rnd() < 0.5 ? C.cyan2 : C.mag2, 0.35); ctx.fillRect(0, ly, RW, 1); }
      ctx.restore();
    }
  }

  window.Room = Room;
})();
