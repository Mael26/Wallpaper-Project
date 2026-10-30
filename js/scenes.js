/*
 * Built-in animated scenes (canvas 2D, no files needed). All artwork is procedural.
 * Each scene: { key, label, colors:[c1,c2,c3], setup(e), frame(e, t, dt) }
 *   e = { ctx, W, H, pal:[c1,c2,c3], rnd(), ...scene state }
 * Static parts are pre-rendered once into offscreen canvases; per frame only small
 * things move, so a scene costs little GPU/CPU. Honors the Wallpaper Engine FPS cap.
 */
(function () {
  'use strict';
  const LW = window.LW;

  // ── helpers ──────────────────────────────────────────────────────
  const TAU = Math.PI * 2;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; };
  const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const shade = (c, k) => (k < 0 ? mix(c, [0, 0, 0], -k) : mix(c, [255, 255, 255], k));
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function vgrad(g, y0, y1, stops) { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }
  /** Mountain ridge silhouette (midpoint displacement). */
  function ridge(g, rnd, W, base, amp, rough, color, rim) {
    const n = 128; const pts = new Array(n + 1).fill(0);
    let step = n; pts[0] = rnd(); pts[n] = rnd(); let a = 1;
    while (step > 1) { for (let i = step / 2; i < n; i += step) pts[i] = (pts[i - step / 2] + pts[i + step / 2]) / 2 + (rnd() - 0.5) * a; step /= 2; a *= rough; }
    g.beginPath(); g.moveTo(0, g.canvas.height);
    pts.forEach((p, i) => g.lineTo((i / n) * W, base - p * amp));
    g.lineTo(W, g.canvas.height); g.closePath(); g.fillStyle = color; g.fill();
    if (rim) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo : g.moveTo).call(g, (i / n) * W, base - p * amp)); g.strokeStyle = rim; g.lineWidth = Math.max(1, g.canvas.height / 500); g.stroke(); }
  }
  function stars(g, rnd, W, H, n, maxA = 0.9) {
    for (let i = 0; i < n; i++) { const s = rnd() < 0.08 ? 2 : 1; g.fillStyle = `rgba(255,255,255,${0.15 + rnd() * maxA})`; g.fillRect(rnd() * W, rnd() * H, s * (H / 900 + 0.6), s * (H / 900 + 0.6)); }
  }

  // ── scenes ───────────────────────────────────────────────────────
  const SCENES = [];

  // 1) Synthwave — retro sun, mountains and a moving neon grid
  SCENES.push({
    key: 'synthwave', label: 'Synthwave', colors: [[255, 60, 160], [255, 180, 70], [70, 220, 255]],
    setup(e) {
      const { W, H, pal, rnd } = e; const hz = (e.hz = H * 0.6);
      const o = mk(W, H); const g = o.getContext('2d');
      g.fillStyle = vgrad(g, 0, hz, [[0, '#07021a'], [0.55, rgba(shade(pal[0], -0.78))], [1, rgba(shade(pal[0], -0.25))]]);
      g.fillRect(0, 0, W, hz);
      stars(g, rnd, W, hz * 0.65, 170);
      const r = Math.min(W, H) * 0.24; const cx = W / 2; const cy = hz - r * 0.42;
      const glow = g.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 2.4);
      glow.addColorStop(0, rgba(pal[0], 0.5)); glow.addColorStop(1, rgba(pal[0], 0));
      g.fillStyle = glow; g.fillRect(0, 0, W, hz);
      const sc = mk(r * 2, r * 2); const s = sc.getContext('2d');
      s.fillStyle = vgrad(s, 0, r * 2, [[0, rgba(pal[1])], [1, rgba(pal[0])]]);
      s.beginPath(); s.arc(r, r, r, 0, TAU); s.fill();
      s.globalCompositeOperation = 'destination-out';
      for (let k = 0; k < 8; k++) s.fillRect(0, r * 1.02 + k * r * 0.12 + k * k * r * 0.004, r * 2, r * (0.018 + k * 0.011));
      g.drawImage(sc, cx - r, cy - r);
      ridge(g, rnd, W, hz, H * 0.13, 0.55, rgba(shade(pal[2], -0.88)), rgba(pal[2], 0.55));
      ridge(g, rnd, W, hz, H * 0.06, 0.5, rgba(shade(pal[0], -0.9)), rgba(pal[0], 0.4));
      e.off = o;
      e.floor = vgrad(e.ctx, hz, H, [[0, rgba(shade(pal[0], -0.7))], [0.25, '#0a0318'], [1, '#05010d']]);
      e.fade = vgrad(e.ctx, hz, hz + (H - hz) * 0.35, [[0, rgba(shade(pal[0], -0.6), 0.95)], [1, rgba(shade(pal[0], -0.6), 0)]]);
    },
    frame(e, t) {
      const { ctx, W, H, hz, pal } = e;
      ctx.drawImage(e.off, 0, 0);
      ctx.fillStyle = e.floor; ctx.fillRect(0, hz, W, H - hz);
      const ph = (t * 0.45) % 1; const lw = Math.max(1, H / 420);
      ctx.beginPath();
      for (let i = -26; i <= 26; i++) { ctx.moveTo(W / 2 + i * W * 0.012, hz); ctx.lineTo(W / 2 + i * W * 0.075, H); }
      for (let k = 1; k < 30; k++) { const d = k - ph; if (d < 0.35) continue; const y = hz + (H - hz) / d; if (y > H) continue; ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.strokeStyle = rgba(pal[2], 0.18); ctx.lineWidth = lw * 4; ctx.stroke();
      ctx.strokeStyle = rgba(shade(pal[2], 0.25), 0.9); ctx.lineWidth = lw; ctx.stroke();
      ctx.fillStyle = e.fade; ctx.fillRect(0, hz, W, (H - hz) * 0.35);
      ctx.fillStyle = rgba(shade(pal[0], 0.3), 0.85); ctx.fillRect(0, hz - lw, W, lw * 1.6);
    },
  });

  // 2) Night sky — twinkling stars, milky way, shooting stars and a cat on a hill
  SCENES.push({
    key: 'nightsky', label: 'Night sky (cat)', colors: [[70, 90, 200], [170, 140, 255], [255, 200, 140]],
    setup(e) {
      const { W, H, pal, rnd } = e;
      const o = mk(W, H); const g = o.getContext('2d');
      g.fillStyle = vgrad(g, 0, H, [[0, '#02040f'], [0.6, rgba(shade(pal[0], -0.82))], [0.85, rgba(shade(pal[0], -0.55))], [1, rgba(shade(pal[2], -0.5))]]);
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < 40; i++) { // milky way glow
        const u = rnd(); const x = u * W; const y = H * (0.12 + u * 0.38) + (rnd() - 0.5) * H * 0.18; const r = H * (0.05 + rnd() * 0.12);
        const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(pal[1], 0.07)); gr.addColorStop(1, rgba(pal[1], 0));
        g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      for (let i = 0; i < 1600; i++) { const u = rnd(); const x = u * W; const y = H * (0.12 + u * 0.38) + (rnd() + rnd() + rnd() - 1.5) * H * 0.09; g.fillStyle = `rgba(255,255,255,${rnd() * 0.35})`; g.fillRect(x, y, 1, 1); }
      ridge(g, rnd, W, H * 0.8, H * 0.2, 0.55, rgba(shade(pal[0], -0.78)));
      ridge(g, rnd, W, H * 0.9, H * 0.12, 0.5, rgba(shade(pal[0], -0.9)));
      // foreground hill + cat (seen from behind)
      const hx = W * 0.74; const hy = H * 0.86;
      g.fillStyle = '#020309'; g.beginPath(); g.moveTo(W * 0.45, H); g.quadraticCurveTo(hx, hy - H * 0.06, W * 1.05, H * 0.92); g.lineTo(W, H); g.fill();
      const s = H * 0.085; const cx = hx; const cy = hy - H * 0.015;
      g.beginPath(); g.ellipse(cx, cy - s * 0.42, s * 0.36, s * 0.5, 0, 0, TAU); g.fill();
      g.beginPath(); g.arc(cx, cy - s * 1.02, s * 0.25, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(cx - s * 0.24, cy - s * 1.08); g.lineTo(cx - s * 0.2, cy - s * 1.42); g.lineTo(cx - s * 0.04, cy - s * 1.22); g.fill();
      g.beginPath(); g.moveTo(cx + s * 0.24, cy - s * 1.08); g.lineTo(cx + s * 0.2, cy - s * 1.42); g.lineTo(cx + s * 0.04, cy - s * 1.22); g.fill();
      e.cat = { x: cx, y: cy, s };
      e.off = o;
      e.stars = Array.from({ length: 260 }, () => ({ x: rnd() * W, y: rnd() * H * 0.72, r: (rnd() < 0.1 ? 2.2 : 1.2) * (H / 1000 + 0.5), p: rnd() * TAU, f: 0.6 + rnd() * 2.2 }));
      e.next = 3; e.shoot = null;
    },
    frame(e, t) {
      const { ctx, W, H, rnd } = e;
      ctx.drawImage(e.off, 0, 0);
      for (const s of e.stars) { ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.f + s.p)); ctx.fillStyle = '#fff'; ctx.fillRect(s.x, s.y, s.r, s.r); }
      ctx.globalAlpha = 1;
      if (!e.shoot && t > e.next) e.shoot = { x: W * (0.1 + rnd() * 0.6), y: H * (0.05 + rnd() * 0.25), t0: t, vx: W * (0.35 + rnd() * 0.2), vy: H * (0.12 + rnd() * 0.1) };
      if (e.shoot) {
        const k = t - e.shoot.t0; const sh = e.shoot;
        if (k > 1.2) { e.shoot = null; e.next = t + 4 + rnd() * 8; } else {
          const x = sh.x + sh.vx * k; const y = sh.y + sh.vy * k; const a = Math.sin((k / 1.2) * Math.PI);
          const gr = ctx.createLinearGradient(x, y, x - sh.vx * 0.25, y - sh.vy * 0.25);
          gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.strokeStyle = gr; ctx.lineWidth = Math.max(1, H / 600); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - sh.vx * 0.25, y - sh.vy * 0.25); ctx.stroke();
        }
      }
      const { x, y, s } = e.cat; const a = Math.sin(t * 1.1) * 0.35; // tail
      ctx.strokeStyle = '#020309'; ctx.lineWidth = s * 0.09; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + s * 0.25, y - s * 0.08);
      ctx.bezierCurveTo(x + s * (0.7 + a * 0.2), y - s * 0.05, x + s * (0.75 + a * 0.4), y - s * (0.45 + a * 0.3), x + s * (0.55 + a * 0.6), y - s * (0.75 + a * 0.2));
      ctx.stroke();
    },
  });

  // 3) Aurora — northern lights over mountains, reflected in a lake
  SCENES.push({
    key: 'aurora', label: 'Aurora', colors: [[80, 255, 170], [60, 170, 255], [190, 100, 255]], scale: 0.6,
    setup(e) {
      const { W, H, pal, rnd } = e; e.lake = H * 0.74;
      const o = mk(W, H); const g = o.getContext('2d');
      g.fillStyle = vgrad(g, 0, H, [[0, '#01030a'], [0.7, rgba(shade(pal[1], -0.85))], [1, '#02060c']]);
      g.fillRect(0, 0, W, H); stars(g, rnd, W, H * 0.7, 220);
      e.off = o;
      const m = mk(W, H); const mg = m.getContext('2d');
      ridge(mg, rnd, W, e.lake, H * 0.24, 0.55, '#05080f', rgba(shade(pal[0], 0.2), 0.25));
      ridge(mg, rnd, W, e.lake, H * 0.1, 0.5, '#020409');
      mg.clearRect(0, e.lake, W, H);
      e.mount = m;
    },
    frame(e, t) {
      const { ctx, W, H, pal, lake } = e;
      ctx.drawImage(e.off, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      const step = Math.max(3, W / 260);
      for (let j = 0; j < 3; j++) {
        ctx.fillStyle = rgba(pal[j]);
        for (let x = 0; x < W; x += step) {
          const u = x / W;
          const base = H * (0.34 + 0.07 * j) + Math.sin(u * 5 + t * 0.18 * (j + 1) + j) * H * 0.07 + Math.sin(u * 13 - t * 0.33 + j * 2) * H * 0.025;
          const h = H * (0.16 + 0.09 * Math.sin(u * 7 + t * 0.27 + j * 1.7));
          const a = 0.05 * (0.55 + 0.45 * Math.sin(u * 23 + t * 0.9 + j));
          ctx.globalAlpha = a * 0.45; ctx.fillRect(x, base - h, step + 1, h);
          ctx.globalAlpha = a * 0.8; ctx.fillRect(x, base - h * 0.55, step + 1, h * 0.55);
          ctx.globalAlpha = a * 1.6; ctx.fillRect(x, base - h * 0.18, step + 1, h * 0.18 + H * 0.008);
        }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(e.mount, 0, 0);
      const L = H - lake;
      ctx.save(); ctx.globalAlpha = 0.42; ctx.setTransform(1, 0, 0, -1, 0, 2 * lake);
      ctx.drawImage(ctx.canvas, 0, lake - L, W, L, 0, lake - L, W, L); ctx.restore();
      ctx.fillStyle = 'rgba(2,6,12,.45)'; ctx.fillRect(0, lake, W, L);
      ctx.fillStyle = 'rgba(255,255,255,.05)';
      for (let i = 0; i < 18; i++) { const y = lake + ((i * 37 + t * 8) % L); ctx.fillRect(0, y, W, 1); }
    },
  });

  // 4) Sakura — pastel dusk, blossoming tree and falling petals
  SCENES.push({
    key: 'sakura', label: 'Sakura', colors: [[255, 160, 200], [250, 190, 160], [140, 150, 235]],
    setup(e) {
      const { W, H, pal, rnd } = e;
      const o = mk(W, H); const g = o.getContext('2d');
      g.fillStyle = vgrad(g, 0, H, [[0, rgba(pal[2])], [0.55, rgba(mix(pal[0], [255, 255, 255], 0.35))], [0.8, rgba(mix(pal[1], [255, 255, 255], 0.4))], [1, rgba(pal[1])]]);
      g.fillRect(0, 0, W, H);
      const sx = W * 0.72; const sy = H * 0.58; const sun = g.createRadialGradient(sx, sy, 0, sx, sy, H * 0.45);
      sun.addColorStop(0, 'rgba(255,250,235,.95)'); sun.addColorStop(0.12, 'rgba(255,240,220,.6)'); sun.addColorStop(1, 'rgba(255,230,220,0)');
      g.fillStyle = sun; g.fillRect(0, 0, W, H);
      ridge(g, rnd, W, H * 0.8, H * 0.12, 0.5, rgba(mix(pal[2], [255, 255, 255], 0.25), 0.8));
      ridge(g, rnd, W, H * 0.88, H * 0.08, 0.5, rgba(mix(pal[2], pal[0], 0.4), 0.9));
      g.fillStyle = rgba(shade(mix(pal[2], pal[0], 0.3), -0.45)); g.fillRect(0, H * 0.93, W, H);
      const blossoms = [];
      const branch = (x, y, ang, len, w, d) => {
        const x2 = x + Math.cos(ang) * len; const y2 = y + Math.sin(ang) * len;
        g.strokeStyle = '#3a2228'; g.lineWidth = w; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo((x + x2) / 2 + (rnd() - 0.5) * len * 0.2, (y + y2) / 2, x2, y2); g.stroke();
        if (d <= 0) { blossoms.push([x2, y2, len]); return; }
        if (d <= 2) blossoms.push([x2, y2, len * 0.7]);
        const n = 2 + (rnd() < 0.35 ? 1 : 0);
        for (let i = 0; i < n; i++) branch(x2, y2, ang + (rnd() - 0.5) * 1.1 + (i - (n - 1) / 2) * 0.45, len * (0.68 + rnd() * 0.12), w * 0.66, d - 1);
      };
      branch(W * 0.1, H * 1.02, -1.3, H * 0.28, H * 0.035, 6);
      for (const [x, y, l] of blossoms) {
        for (let k = 0; k < 7; k++) {
          const r = l * (0.18 + rnd() * 0.22); const px = x + (rnd() - 0.5) * l * 0.7; const py = y + (rnd() - 0.5) * l * 0.6;
          g.fillStyle = rgba(mix(pal[0], [255, 255, 255], rnd() * 0.45), 0.55 + rnd() * 0.35); g.beginPath(); g.arc(px, py, r, 0, TAU); g.fill();
        }
      }
      e.off = o;
      e.petals = Array.from({ length: 150 }, () => ({ x: rnd() * W, y: rnd() * H, s: H * (0.006 + rnd() * 0.01), vy: H * (0.03 + rnd() * 0.05), vx: W * (0.01 + rnd() * 0.03), p: rnd() * TAU, r: rnd() * TAU, vr: 0.5 + rnd() * 2, c: rgba(mix(pal[0], [255, 255, 255], rnd() * 0.5), 0.85) }));
    },
    frame(e, t, dt) {
      const { ctx, W, H } = e;
      ctx.drawImage(e.off, 0, 0);
      for (const p of e.petals) {
        p.y += p.vy * dt; p.x += (p.vx + Math.sin(t * 1.3 + p.p) * H * 0.03) * dt; p.r += p.vr * dt;
        if (p.y > H + 20) { p.y = -20; p.x = Math.random() * W * 1.2 - W * 0.2; }
        if (p.x > W + 20) p.x = -20;
        const c = Math.cos(p.r); const s = Math.sin(p.r); const fx = Math.cos(t * p.vr + p.p);
        ctx.setTransform(c * fx, s * fx, -s, c, p.x, p.y);
        ctx.fillStyle = p.c; ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.62, 0, 0, TAU); ctx.fill();
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    },
  });

  // 5) Rain — night city bokeh behind a rainy window
  SCENES.push({
    key: 'rain', label: 'Rain', colors: [[255, 170, 90], [90, 160, 255], [255, 90, 140]],
    setup(e) {
      const { W, H, pal, rnd } = e;
      const o = mk(W, H); const g = o.getContext('2d');
      g.fillStyle = vgrad(g, 0, H, [[0, '#06070d'], [1, '#121522']]); g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 90; i++) {
        const x = rnd() * W; const y = H * (0.3 + rnd() * 0.6); const r = H * (0.015 + rnd() * 0.06); const c = pal[i % 3];
        const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(c, 0.18 + rnd() * 0.3)); gr.addColorStop(0.7, rgba(c, 0.08)); gr.addColorStop(1, rgba(c, 0));
        g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      e.off = o;
      const ds = Math.max(6, H * 0.016); const d = mk(ds * 2, ds * 2); const dg = d.getContext('2d');
      const gr = dg.createRadialGradient(ds * 0.8, ds * 0.7, 0, ds, ds, ds);
      gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(0.35, 'rgba(200,215,255,.12)'); gr.addColorStop(0.85, 'rgba(10,12,20,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      dg.fillStyle = gr; dg.beginPath(); dg.arc(ds, ds, ds, 0, TAU); dg.fill();
      e.drop = d;
      e.streaks = Array.from({ length: 280 }, () => ({ x: rnd() * W, y: rnd() * H, l: H * (0.03 + rnd() * 0.05), v: H * (1.1 + rnd() * 0.9) }));
      e.drops = Array.from({ length: 60 }, () => ({ x: rnd() * W, y: rnd() * H, s: 0.4 + rnd() * 0.9, v: rnd() < 0.3 ? H * (0.02 + rnd() * 0.06) : 0 }));
    },
    frame(e, t, dt) {
      const { ctx, W, H } = e;
      ctx.drawImage(e.off, 0, 0);
      ctx.beginPath();
      for (const s of e.streaks) {
        s.y += s.v * dt; s.x += s.v * dt * 0.12; if (s.y > H) { s.y = -s.l; s.x = Math.random() * W; }
        ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.l * 0.12, s.y - s.l);
      }
      ctx.strokeStyle = 'rgba(190,205,255,.22)'; ctx.lineWidth = Math.max(1, H / 900); ctx.stroke();
      for (const d of e.drops) {
        if (d.v) { d.y += d.v * dt; if (d.y > H) { d.y = -10; d.x = Math.random() * W; } }
        const sz = e.drop.width * d.s; ctx.drawImage(e.drop, d.x, d.y, sz, sz * 1.1);
      }
    },
  });

  // 6) Anime sky — cel-shaded clouds drifting over fields and power lines
  SCENES.push({
    key: 'animesky', label: 'Anime sky', colors: [[40, 110, 225], [120, 195, 255], [80, 160, 95]],
    setup(e) {
      const { W, H, pal, rnd } = e; const hz = H * 0.8;
      const o = mk(W, H); const g = o.getContext('2d');
      g.fillStyle = vgrad(g, 0, hz, [[0, rgba(shade(pal[0], -0.15))], [0.6, rgba(pal[1])], [1, rgba(mix(pal[1], [255, 255, 255], 0.75))]]);
      g.fillRect(0, 0, W, hz);
      ridge(g, rnd, W, hz, H * 0.05, 0.5, rgba(mix(pal[2], pal[1], 0.55)));
      g.fillStyle = vgrad(g, hz, H, [[0, rgba(pal[2])], [1, rgba(shade(pal[2], -0.35))]]); g.fillRect(0, hz, W, H - hz);
      e.off = o;
      const f = mk(W, H); const fg = f.getContext('2d'); const ink = '#1c2333';
      const poles = [0.16, 0.58, 1.02].map((u) => [u * W, H * 0.2]);
      fg.fillStyle = ink;
      poles.forEach(([x, y]) => { fg.fillRect(x - H * 0.006, y, H * 0.012, H); fg.fillRect(x - H * 0.06, y + H * 0.04, H * 0.12, H * 0.008); fg.fillRect(x - H * 0.045, y + H * 0.09, H * 0.09, H * 0.007); });
      fg.strokeStyle = ink; fg.lineWidth = Math.max(1, H / 700);
      for (let i = 0; i < poles.length - 1; i++) {
        const [x1, y1] = poles[i]; const [x2, y2] = poles[i + 1];
        [[-0.055, 0.04], [0.055, 0.04], [-0.04, 0.09], [0.04, 0.09]].forEach(([dx, dy]) => {
          fg.beginPath(); fg.moveTo(x1 + dx * H, y1 + dy * H); fg.quadraticCurveTo((x1 + x2) / 2, y1 + dy * H + H * 0.09, x2 + dx * H, y2 + dy * H); fg.stroke();
        });
      }
      for (let x = 0; x < W; x += 3) { const h = H * (0.01 + rnd() * 0.035); fg.fillStyle = rgba(shade(pal[2], -0.55)); fg.fillRect(x, H - h, 2, h); }
      e.fg = f;
      e.clouds = Array.from({ length: 7 }, (_, i) => {
        const cw = W * (0.18 + rnd() * 0.22); const ch = cw * 0.55; const c = mk(cw, ch); const cg = c.getContext('2d');
        const circles = []; const n = 7 + ((rnd() * 5) | 0);
        for (let k = 0; k < n; k++) { const u = (k + 0.5) / n; const r = ch * (0.18 + Math.sin(u * Math.PI) * (0.22 + rnd() * 0.12)); circles.push([cw * (0.12 + u * 0.76), ch * 0.82 - r * 0.6, r]); }
        cg.fillStyle = rgba(mix(pal[1], [255, 255, 255], 0.55)); circles.forEach(([x, y, r]) => { cg.beginPath(); cg.arc(x, y, r, 0, TAU); cg.fill(); });
        cg.fillStyle = '#ffffff'; circles.forEach(([x, y, r]) => { cg.beginPath(); cg.arc(x - r * 0.08, y - r * 0.2, r * 0.9, 0, TAU); cg.fill(); });
        cg.globalCompositeOperation = 'destination-out'; cg.fillRect(0, ch * 0.84, cw, ch);
        return { c, x: rnd() * W * 1.3 - W * 0.15, y: H * (0.05 + (i / 7) * 0.5), v: W * (0.004 + rnd() * 0.006) };
      });
      e.birdsAt = 6; e.birds = null;
    },
    frame(e, t, dt) {
      const { ctx, W, H } = e;
      ctx.drawImage(e.off, 0, 0);
      for (const c of e.clouds) { c.x += c.v * dt; if (c.x > W) c.x = -c.c.width; ctx.drawImage(c.c, c.x, c.y); }
      if (!e.birds && t > e.birdsAt) e.birds = { x: -W * 0.1, y: H * (0.15 + Math.random() * 0.25), t0: t };
      if (e.birds) {
        const b = e.birds; b.x += W * 0.05 * dt;
        ctx.strokeStyle = '#1c2333'; ctx.lineWidth = Math.max(1, H / 600);
        for (let i = 0; i < 5; i++) {
          const x = b.x - i * H * 0.03; const y = b.y + (i % 2) * H * 0.02 + i * H * 0.006; const w = H * 0.012; const f = Math.sin(t * 8 + i) * w * 0.6;
          ctx.beginPath(); ctx.moveTo(x - w, y - f); ctx.lineTo(x, y); ctx.lineTo(x + w, y - f); ctx.stroke();
        }
        if (b.x > W * 1.2) { e.birds = null; e.birdsAt = t + 12 + Math.random() * 10; }
      }
      ctx.drawImage(e.fg, 0, 0);
    },
  });

  // 7) Neon city — skyline with flickering windows, neon signs and traffic
  SCENES.push({
    key: 'neoncity', label: 'Neon city', colors: [[255, 60, 180], [60, 230, 255], [255, 200, 80]],
    setup(e) {
      const { W, H, pal, rnd } = e; const road = (e.road = H * 0.84);
      const o = mk(W, H); const g = o.getContext('2d');
      g.fillStyle = vgrad(g, 0, road, [[0, '#05030f'], [0.6, '#160a2c'], [1, rgba(shade(pal[0], -0.55))]]); g.fillRect(0, 0, W, road);
      stars(g, rnd, W, H * 0.4, 80, 0.5);
      e.wins = [];
      const layer = (hmin, hmax, col, lit, keep) => {
        let x = -10;
        while (x < W) {
          const bw = W * (0.035 + rnd() * 0.05); const bh = H * (hmin + rnd() * (hmax - hmin)); const top = road - bh;
          g.fillStyle = col; g.fillRect(x, top, bw, bh);
          const ww = Math.max(2, bw * 0.08); const wh = Math.max(2, H * 0.008);
          for (let wy = top + wh * 2; wy < road - wh * 2; wy += wh * 2.4) {
            for (let wx = x + ww; wx < x + bw - ww * 1.5; wx += ww * 2) {
              if (rnd() < lit) { const c = rnd() < 0.7 ? [255, 205, 140] : [150, 200, 255]; const a = 0.35 + rnd() * 0.5; g.fillStyle = rgba(c, a); g.fillRect(wx, wy, ww, wh); if (keep && rnd() < 0.15) e.wins.push({ x: wx, y: wy, w: ww, h: wh, c: rgba(c, a), on: true, bg: col }); }
            }
          }
          x += bw + W * 0.004;
        }
      };
      layer(0.25, 0.5, '#120c26', 0.18, false);
      layer(0.3, 0.68, '#07051a', 0.32, true);
      g.fillStyle = '#05040c'; g.fillRect(0, road, W, H - road);
      g.fillStyle = 'rgba(255,255,255,.12)'; for (let x = 0; x < W; x += W * 0.04) g.fillRect(x, road + (H - road) * 0.5, W * 0.02, Math.max(1, H / 500));
      e.off = o;
      e.signs = Array.from({ length: 9 }, (_, i) => {
        const vertical = rnd() < 0.5; const w = vertical ? W * 0.008 : W * (0.03 + rnd() * 0.04); const h = vertical ? H * (0.08 + rnd() * 0.12) : H * 0.02;
        return { x: rnd() * W, y: road - H * (0.15 + rnd() * 0.35), w, h, c: pal[i % 3], p: rnd() * TAU, round: rnd() < 0.3 };
      });
      e.cars = Array.from({ length: 16 }, (_, i) => ({ x: rnd() * W, dir: i % 2 ? 1 : -1, v: W * (0.08 + rnd() * 0.1), lane: i % 2 }));
    },
    frame(e, t, dt) {
      const { ctx, W, H, road } = e;
      ctx.drawImage(e.off, 0, 0);
      for (const w of e.wins) { if (Math.random() < 0.002) w.on = !w.on; ctx.fillStyle = w.on ? w.c : w.bg; ctx.fillRect(w.x, w.y, w.w, w.h); }
      ctx.globalCompositeOperation = 'lighter';
      for (const s of e.signs) {
        const a = Math.random() < 0.01 ? 0.15 : 0.75 + 0.25 * Math.sin(t * 2 + s.p);
        ctx.strokeStyle = rgba(s.c, 0.18 * a); ctx.lineWidth = H * 0.012; ctx.strokeRect(s.x, s.y, s.w, s.h);
        ctx.strokeStyle = rgba(mix(s.c, [255, 255, 255], 0.35), a); ctx.lineWidth = Math.max(1.5, H / 450); ctx.strokeRect(s.x, s.y, s.w, s.h);
        const gr = ctx.createLinearGradient(0, road, 0, road + (H - road) * 0.8); gr.addColorStop(0, rgba(s.c, 0.12 * a)); gr.addColorStop(1, rgba(s.c, 0));
        ctx.fillStyle = gr; ctx.fillRect(s.x - s.w * 0.5, road, s.w * 2, (H - road) * 0.8);
      }
      for (const c of e.cars) {
        c.x += c.v * c.dir * dt; if (c.x > W + 50) c.x = -50; if (c.x < -50) c.x = W + 50;
        const y = road + (H - road) * (c.lane ? 0.68 : 0.3); const col = c.dir > 0 ? [255, 60, 60] : [255, 240, 210];
        const gr = ctx.createLinearGradient(c.x, 0, c.x - c.dir * W * 0.05, 0); gr.addColorStop(0, rgba(col, 0.9)); gr.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = gr; ctx.fillRect(Math.min(c.x, c.x - c.dir * W * 0.05), y, W * 0.05, Math.max(2, H / 300));
      }
      ctx.globalCompositeOperation = 'source-over';
    },
  });

  // 8) Ocean — light rays, drifting particles, a fish school and a passing whale
  SCENES.push({
    key: 'ocean', label: 'Ocean (whale)', colors: [[20, 110, 170], [140, 230, 255], [8, 30, 60]],
    setup(e) {
      const { W, H, pal, rnd } = e;
      const o = mk(W, H); const g = o.getContext('2d');
      g.fillStyle = vgrad(g, 0, H, [[0, rgba(pal[0])], [0.5, rgba(shade(pal[0], -0.6))], [1, '#010812']]); g.fillRect(0, 0, W, H);
      ridge(g, rnd, W, H * 0.97, H * 0.1, 0.6, '#020a14');
      e.off = o;
      e.ray = vgrad(e.ctx, 0, H * 0.9, [[0, rgba(pal[1], 0.22)], [1, rgba(pal[1], 0)]]);
      e.rays = Array.from({ length: 7 }, () => ({ x: rnd() * W, w: W * (0.03 + rnd() * 0.06), p: rnd() * TAU }));
      e.parts = Array.from({ length: 110 }, () => ({ x: rnd() * W, y: rnd() * H, r: Math.max(1, H * rnd() * 0.0025), v: H * (0.005 + rnd() * 0.01) }));
      e.fish = Array.from({ length: 36 }, () => ({ dx: (rnd() - 0.5) * W * 0.12, dy: (rnd() - 0.5) * H * 0.08, p: rnd() * TAU }));
    },
    frame(e, t, dt) {
      const { ctx, W, H, pal } = e;
      ctx.drawImage(e.off, 0, 0);
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = e.ray;
      for (const r of e.rays) {
        const sway = Math.sin(t * 0.25 + r.p) * W * 0.04; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 0.5 + r.p);
        ctx.beginPath(); ctx.moveTo(r.x - r.w / 2, 0); ctx.lineTo(r.x + r.w / 2, 0); ctx.lineTo(r.x + sway + r.w * 2.2, H * 0.9); ctx.lineTo(r.x + sway - r.w * 1.2, H * 0.9); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(200,240,255,.35)';
      for (const p of e.parts) { p.y -= p.v * dt; if (p.y < 0) p.y = H; ctx.fillRect(p.x + Math.sin(t + p.y) * 3, p.y, p.r, p.r); }
      // fish school
      const sx = W * (0.3 + 0.25 * Math.sin(t * 0.07)); const sy = H * (0.62 + 0.06 * Math.sin(t * 0.11));
      ctx.fillStyle = rgba(mix(pal[1], [255, 255, 255], 0.3), 0.55);
      for (const f of e.fish) { const x = sx + f.dx + Math.sin(t * 0.8 + f.p) * W * 0.01; const y = sy + f.dy + Math.cos(t * 0.6 + f.p) * H * 0.01; ctx.beginPath(); ctx.ellipse(x, y, H * 0.008, H * 0.003, 0, 0, TAU); ctx.fill(); }
      // whale (crosses every ~80 s)
      const T = 80; const k = (t % T) / T; const L = W * 0.42;
      const wx = -L * 0.6 + k * (W + L * 1.2); const wy = H * (0.38 + 0.04 * Math.sin(t * 0.2));
      ctx.save(); ctx.translate(wx, wy); ctx.scale(L, L); ctx.rotate(Math.sin(t * 0.3) * 0.03);
      ctx.fillStyle = 'rgba(4,16,30,.92)';
      ctx.beginPath(); ctx.moveTo(0.5, 0.02);
      ctx.bezierCurveTo(0.5, -0.09, 0.3, -0.13, 0.05, -0.11);
      ctx.bezierCurveTo(-0.18, -0.09, -0.36, -0.04, -0.46, -0.01);
      ctx.lineTo(-0.46, 0.02);
      ctx.bezierCurveTo(-0.34, 0.05, -0.15, 0.08, 0.08, 0.08);
      ctx.bezierCurveTo(0.3, 0.08, 0.48, 0.07, 0.5, 0.02); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0.18, 0.06); ctx.quadraticCurveTo(0.05, 0.2, -0.04, 0.22); ctx.quadraticCurveTo(0.06, 0.12, 0.08, 0.07); ctx.fill();
      ctx.translate(-0.46, 0.005); ctx.rotate(Math.sin(t * 1.4) * 0.28);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-0.06, -0.02, -0.12, -0.09); ctx.quadraticCurveTo(-0.08, -0.01, -0.13, 0.02); ctx.quadraticCurveTo(-0.07, 0.04, -0.12, 0.1); ctx.quadraticCurveTo(-0.05, 0.03, 0, 0.01); ctx.fill();
      ctx.restore();
    },
  });

  // 9) Koi pond — koi swimming under lily pads, seen from above
  SCENES.push({
    key: 'koi', label: 'Koi pond', colors: [[255, 120, 40], [245, 240, 230], [40, 120, 80]],
    setup(e) {
      const { W, H, pal, rnd } = e;
      const o = mk(W, H); const g = o.getContext('2d');
      const gr = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
      gr.addColorStop(0, '#1f5a5c'); gr.addColorStop(1, '#06191d'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 700; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,.09)' : 'rgba(180,200,190,.05)'; g.beginPath(); g.ellipse(rnd() * W, rnd() * H, H * (0.004 + rnd() * 0.012), H * (0.003 + rnd() * 0.008), rnd() * 3, 0, TAU); g.fill(); }
      e.off = o;
      const p = mk(W, H); const pg = p.getContext('2d');
      for (let i = 0; i < 8; i++) {
        const x = rnd() * W; const y = rnd() * H; const r = H * (0.045 + rnd() * 0.06); const a0 = rnd() * TAU;
        pg.fillStyle = 'rgba(0,0,0,.25)'; pg.beginPath(); pg.arc(x + r * 0.12, y + r * 0.15, r, a0 + 0.25, a0 + TAU - 0.05); pg.lineTo(x + r * 0.12, y + r * 0.15); pg.fill();
        pg.fillStyle = rgba(mix(pal[2], [0, 0, 0], rnd() * 0.3)); pg.beginPath(); pg.arc(x, y, r, a0 + 0.25, a0 + TAU - 0.05); pg.lineTo(x, y); pg.fill();
        pg.strokeStyle = 'rgba(255,255,255,.12)'; pg.lineWidth = 1;
        for (let k = 0; k < 7; k++) { const a = a0 + 0.5 + k * 0.8; pg.beginPath(); pg.moveTo(x, y); pg.lineTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9); pg.stroke(); }
        if (i % 3 === 0) { for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; pg.fillStyle = 'rgba(255,190,215,.9)'; pg.beginPath(); pg.ellipse(x + Math.cos(a) * r * 0.25, y + Math.sin(a) * r * 0.25, r * 0.22, r * 0.09, a, 0, TAU); pg.fill(); } pg.fillStyle = '#ffe28a'; pg.beginPath(); pg.arc(x, y, r * 0.08, 0, TAU); pg.fill(); }
      }
      e.pads = p;
      e.koi = Array.from({ length: 6 }, (_, i) => ({ cx: W * (0.2 + rnd() * 0.6), cy: H * (0.25 + rnd() * 0.5), ax: W * (0.2 + rnd() * 0.2), ay: H * (0.2 + rnd() * 0.15), fa: 0.7 + rnd() * 0.6, fb: 1 + rnd() * 0.8, p: rnd() * TAU, sp: 0.05 + rnd() * 0.04, size: H * (0.07 + rnd() * 0.04), body: i % 3 === 1 ? pal[1] : pal[0], spot: i % 3 === 1 ? pal[0] : (i % 3 === 2 ? [30, 30, 30] : pal[1]) }));
      e.ripples = [];
    },
    frame(e, t, dt) {
      const { ctx, W, H } = e;
      ctx.drawImage(e.off, 0, 0);
      for (const k of e.koi) {
        const s = t * k.sp + k.p;
        const pos = (q) => [k.cx + Math.sin(q * k.fa) * k.ax, k.cy + Math.sin(q * k.fb + 1) * k.ay];
        const [x, y] = pos(s); const [x2, y2] = pos(s + 0.01); const ang = Math.atan2(y2 - y, x2 - x); const L = k.size;
        ctx.setTransform(Math.cos(ang), Math.sin(ang), -Math.sin(ang), Math.cos(ang), x + L * 0.15, y + L * 0.25);
        ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0, 0, L * 0.5, L * 0.13, 0, 0, TAU); ctx.fill();
        ctx.setTransform(Math.cos(ang), Math.sin(ang), -Math.sin(ang), Math.cos(ang), x, y);
        const wig = Math.sin(t * 5 + k.p) * 0.35;
        ctx.save(); ctx.translate(-L * 0.42, 0); ctx.rotate(wig);
        ctx.fillStyle = rgba(k.body, 0.75); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-L * 0.2, -L * 0.18, -L * 0.3, -L * 0.12); ctx.quadraticCurveTo(-L * 0.2, 0, -L * 0.3, L * 0.12); ctx.quadraticCurveTo(-L * 0.2, L * 0.18, 0, 0); ctx.fill();
        ctx.restore();
        ctx.fillStyle = rgba(k.body, 0.5); ctx.beginPath(); ctx.ellipse(L * 0.12, -L * 0.12, L * 0.1, L * 0.04, -0.6 + wig * 0.3, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(L * 0.12, L * 0.12, L * 0.1, L * 0.04, 0.6 - wig * 0.3, 0, TAU); ctx.fill();
        ctx.fillStyle = rgba(k.body); ctx.beginPath(); ctx.ellipse(0, 0, L * 0.45, L * 0.12, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = rgba(k.spot, 0.9); ctx.beginPath(); ctx.ellipse(L * 0.05, -L * 0.02, L * 0.12, L * 0.07, 0.3, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(-L * 0.2, L * 0.02, L * 0.08, L * 0.05, -0.2, 0, TAU); ctx.fill();
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (Math.random() < dt * 0.4) e.ripples.push({ x: Math.random() * W, y: Math.random() * H, t0: t });
      e.ripples = e.ripples.filter((r) => t - r.t0 < 3);
      for (const r of e.ripples) { const k = (t - r.t0) / 3; ctx.strokeStyle = `rgba(220,240,240,${0.35 * (1 - k)})`; ctx.lineWidth = Math.max(1, H / 700); ctx.beginPath(); ctx.ellipse(r.x, r.y, H * 0.1 * k, H * 0.07 * k, 0, 0, TAU); ctx.stroke(); }
      ctx.drawImage(e.pads, 0, 0);
    },
  });

  // ── engine ───────────────────────────────────────────────────────
  const byKey = Object.fromEntries(SCENES.map((s) => [s.key, s]));
  let canvas = null; let ctx = null; let env = null; let scene = null;
  let running = false; let raf = 0; let last = 0; let tScene = 0; let lastDraw = 0;
  let opts = { speed: 1, quality: 0.75, album: null };

  function boost(c) { // album colour → vivid enough for a scene
    const max = Math.max(...c); const min = Math.min(...c);
    const k = max - min < 40 ? 0.25 : 0; const lift = max < 120 ? 120 / Math.max(1, max) : 1;
    return mix(c.map((v) => Math.min(255, v * lift)), [255, 255, 255], k);
  }

  function build() {
    if (!canvas || !scene) return;
    const q = opts.quality * (scene.scale ? scene.scale / 0.75 : 1);
    const W = Math.round(window.innerWidth * Math.min(1, q)); const H = Math.round(window.innerHeight * Math.min(1, q));
    canvas.width = W; canvas.height = H;
    const pal = opts.album && opts.album.length ? scene.colors.map((c, i) => boost(opts.album[i % opts.album.length])) : scene.colors;
    env = { ctx, W, H, pal, rnd: mulberry32(1234 + scene.key.length * 77) };
    scene.setup(env);
    scene.frame(env, tScene, 0);
  }

  function loop(now) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    const fps = LW.config && LW.config.fps ? LW.config.fps : 60;
    if (now - lastDraw < 1000 / Math.min(60, fps) - 1) return;
    const dt = Math.min(0.1, (now - (last || now)) / 1000) * opts.speed;
    last = now; lastDraw = now; tScene += dt;
    scene.frame(env, tScene, dt);
  }

  let rt = null;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (scene) build(); }, 200); });

  LW.scenes = {
    list: SCENES.map(({ key, label }) => ({ key, label })),
    /** Start (or switch to) a scene. */
    start(key, o = {}) {
      canvas = canvas || document.getElementById('bg-scene'); ctx = ctx || canvas.getContext('2d');
      const next = byKey[key] || SCENES[0];
      const changed = next !== scene || o.quality !== opts.quality || JSON.stringify(o.album || null) !== JSON.stringify(opts.album || null);
      opts = Object.assign(opts, o); scene = next;
      if (changed) build();
      if (!running && !(LW.config && LW.config.paused)) { running = true; last = 0; raf = requestAnimationFrame(loop); }
    },
    stop() { running = false; cancelAnimationFrame(raf); },
    pause(p) { if (p) { running = false; cancelAnimationFrame(raf); } else if (scene && !running) { running = true; last = 0; raf = requestAnimationFrame(loop); } },
    /** Colours actually used by the current scene (for "colour from background"). */
    get palette() { return env ? env.pal : null; },
    get active() { return running ? scene && scene.key : null; },
    /** Jump the scene clock (used to make deterministic previews). */
    seek(sec) { tScene = sec; if (scene && env) scene.frame(env, tScene, 0.016); },
  };
})();
