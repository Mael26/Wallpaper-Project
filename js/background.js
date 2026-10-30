/*
 * Background layers + colour palette.
 * - Album art blur is pre-rendered once per song into a small canvas (cheap to animate).
 * - Layers cross-fade when the type changes (also when the idle screen uses its own background).
 * - The palette that drives lyrics/accent colours can come from the album art or the background
 *   (custom image, video frame or animated scene).
 */
(function () {
  'use strict';
  const LW = window.LW;
  const $ = (s) => document.querySelector(s);

  // ── Colour utilities ───────────────────────────────────────────────
  const probe = document.createElement('canvas').getContext('2d');
  function parseColor(str) {
    if (!str) return null;
    probe.fillStyle = '#000'; probe.fillStyle = String(str);
    const v = probe.fillStyle;
    if (v.startsWith('#')) return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16));
    const m = v.match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : null;
  }
  function rgbToHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b); const min = Math.min(r, g, b); const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min; const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function hslToRgb([h, s, l]) {
    h = ((h % 360) + 360) % 360;
    const k = (n) => (n + h / 30) % 12; const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [f(0), f(8), f(4)].map((x) => Math.round(x * 255));
  }
  const css = (rgb, a = 1) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

  /** Up to 4 representative colours, vivid ones first. */
  function extractPalette(src) {
    try {
      const c = document.createElement('canvas'); c.width = c.height = 32;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(src, 0, 0, 32, 32);
      const data = g.getImageData(0, 0, 32, 32).data; // throws if the image is cross-origin (tainted)
      const buckets = new Map();
      for (let i = 0; i < data.length; i += 4) {
        const rgb = [data[i], data[i + 1], data[i + 2]];
        const [h, s, l] = rgbToHsl(rgb);
        const key = s < 0.12 ? `n${Math.round(l * 4)}` : `h${Math.round(h / 24)}`;
        const w = s < 0.12 ? 0.15 : (0.4 + s) * (1 - Math.abs(l - 0.5) * 1.3);
        const b = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0, w: 0 };
        b.r += rgb[0]; b.g += rgb[1]; b.b += rgb[2]; b.n++; b.w += Math.max(0.02, w);
        buckets.set(key, b);
      }
      return [...buckets.values()].sort((a, b) => b.w - a.w).slice(0, 4)
        .map((b) => [b.r / b.n, b.g / b.n, b.b / b.n].map(Math.round));
    } catch (_) { return null; }
  }

  /** Readable accent on a dark background: saturated and bright. */
  function accentFrom(rgb) {
    const [h, s, l] = rgbToHsl(rgb);
    return hslToRgb([h, Math.max(0.55, Math.min(1, s * 1.2)), Math.max(0.68, Math.min(0.8, l + 0.25))]);
  }
  /** Lyrics tint from a palette colour; strength 0 = white, 1 = full colour. */
  function lyricFrom(rgb, strength) {
    const [h, s, l] = rgbToHsl(rgb);
    const c = hslToRgb([h, Math.min(1, s * 1.15 + 0.12), Math.max(0.7, Math.min(0.85, l + 0.3))]);
    return mix([255, 255, 255], c, strength);
  }

  // ── State ──────────────────────────────────────────────────────────
  const root = document.documentElement;
  let cover = { img: null, palette: null };    // album art
  let bgPalette = null;                         // custom image / video / scene
  let flip = false;
  let lastEff = null;

  function loadImage(src) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  }

  function paintCover(canvas, img, cfg) {
    const blur = cfg.bgblur / 100;
    const N = blur < 0.08 ? 640 : 220;
    canvas.width = canvas.height = N;
    const g = canvas.getContext('2d');
    g.clearRect(0, 0, N, N);
    const r = Math.round(blur * N * 0.07);
    g.filter = `${r ? `blur(${r}px) ` : ''}saturate(${cfg.bgsaturation}%)`;
    const m = r * 2;
    g.drawImage(img, -m, -m, N + m * 2, N + m * 2);
    g.filter = 'none';
  }

  function paintAmbient(palette, cfg) {
    const cols = (palette && palette.length ? palette : [[90, 70, 200], [200, 60, 120], [40, 140, 200]]);
    const sat = cfg.bgsaturation / 100;
    document.querySelectorAll('#bg-ambient .blob').forEach((el, i) => {
      const [h, s, l] = rgbToHsl(cols[i % cols.length]);
      const rgb = hslToRgb([h, Math.min(1, s * sat), Math.max(0.3, Math.min(0.62, l))]);
      el.style.background = `radial-gradient(circle at center, ${css(rgb, 0.95)} 0%, ${css(rgb, 0.55)} 28%, ${css(rgb, 0)} 66%)`;
    });
  }

  async function setCover(c) {
    let img = null; let palette = null;
    if (c && c.src) {
      try { img = await loadImage(c.src); } catch (_) { img = null; }
      if (img) palette = extractPalette(img);
      if (!palette && c.colors) palette = [c.colors.primary, c.colors.secondary, c.colors.tertiary].map(parseColor).filter(Boolean);
    }
    cover = { img, palette };
    render(true);
    return palette;
  }

  // ── Which background is showing right now (idle can override it) ───
  function effective(cfg) {
    const idle = document.body.classList.contains('idle');
    if (!idle || cfg.idlebg === 'same') return Object.assign({ folderKey: 'bgfolder' }, cfg);
    return Object.assign({}, cfg, {
      bgmode: cfg.idlebg, bgimage: cfg.idleimage, bgvideo: cfg.idlevideo, bgfolder: cfg.idlefolder, folderKey: 'idlefolder',
      bgscene: cfg.idlescene, bgcolor: cfg.idlecolor, mediablur: 0, mediabrightness: 100, mediatint: 0, scenebrightness: 100, bgbrightness: 100,
    });
  }

  /** Palette that drives lyrics/accent colours. */
  function activePalette(cfg, eff) {
    if (cfg.colorsource === 'background') {
      if (eff.bgmode === 'scene' && LW.scenes.palette) return LW.scenes.palette.map((c) => c.map(Math.round));
      if ((eff.bgmode === 'image' || eff.bgmode === 'folder' || eff.bgmode === 'video') && bgPalette) return bgPalette;
      if (eff.bgmode === 'solid') return [LW.config.weColorToRgb(eff.bgcolor, [10, 10, 12])];
    }
    return cover.palette;
  }

  function applyPalette() {
    const cfg = LW.config.all(); const eff = lastEff || effective(cfg);
    const pal = activePalette(cfg, eff);
    const solid = LW.config.weColorToRgb(cfg.textcolor, [255, 255, 255]);
    let accent = LW.config.weColorToRgb(cfg.accentcolor, [140, 217, 255]);
    if (cfg.adaptive && pal && pal.length) accent = accentFrom(pal[0]);
    let text = solid; let text2 = solid;
    if (cfg.lyriccolor !== 'solid' && pal && pal.length) {
      const k = cfg.colorstrength / 100;
      text = lyricFrom(pal[0], k);
      if (cfg.lyriccolor === 'gradient') {
        const second = pal[1] || hslToRgb((([h, s, l]) => [h + 55, s, l])(rgbToHsl(pal[0])));
        text2 = lyricFrom(second, Math.min(1, k + 0.15));
      } else text2 = text;
    }
    root.style.setProperty('--text', text.join(','));
    root.style.setProperty('--text2', text2.join(','));
    root.style.setProperty('--accent', accent.join(','));
    if (pal && pal[0]) root.style.setProperty('--tint', pal[0].join(','));
    document.body.classList.toggle('text-gradient', cfg.lyriccolor === 'gradient' && !!(pal && pal.length));
  }

  // ── Render ─────────────────────────────────────────────────────────
  function render(swapCover) {
    const cfg = LW.config.all();
    const eff = effective(cfg); lastEff = eff;
    const bg = $('#bg');
    bg.dataset.mode = eff.bgmode;
    bg.classList.toggle('motion', !!cfg.bgmotion);
    $('#bg-vignette').style.opacity = String(cfg.vignette / 100);
    $('#bg-grain').style.opacity = String(cfg.grain / 100);
    root.style.setProperty('--idle-blur', `${(cfg.idleblur / 100) * 36}px`);
    root.style.setProperty('--idle-dim', String(cfg.idledim / 100));

    // Album art
    if (eff.bgmode === 'cover') {
      const layers = document.querySelectorAll('#bg-cover canvas');
      const next = swapCover ? (flip = !flip, layers[flip ? 1 : 0]) : layers[flip ? 1 : 0];
      const prev = layers[flip ? 0 : 1];
      if (cover.img) paintCover(next, cover.img, cfg);
      else {
        next.width = next.height = 64; const g = next.getContext('2d');
        const gr = g.createLinearGradient(0, 0, 64, 64);
        gr.addColorStop(0, '#2b2350'); gr.addColorStop(0.55, '#14233d'); gr.addColorStop(1, '#3a1f3a');
        g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      }
      next.classList.add('on'); if (swapCover) prev.classList.remove('on');
    } else if (eff.bgmode === 'ambient') paintAmbient(cover.palette, cfg);
    else if (eff.bgmode === 'solid') bg.style.backgroundColor = css(LW.config.weColorToRgb(eff.bgcolor, [10, 10, 12]));

    // Animated scene
    if (eff.bgmode === 'scene') {
      LW.scenes.start(eff.bgscene, {
        speed: cfg.scenespeed / 100,
        quality: { low: 0.5, medium: 0.75, high: 1 }[cfg.scenequality] || 0.75,
        album: cfg.scenecolors === 'album' ? cover.palette : null,
      });
    } else LW.scenes.stop();

    // Brightness / tint
    const isMedia = eff.bgmode === 'image' || eff.bgmode === 'folder' || eff.bgmode === 'video';
    const brightness = isMedia ? eff.mediabrightness : eff.bgmode === 'scene' ? eff.scenebrightness : eff.bgbrightness;
    $('#bg-dim').style.opacity = String(1 - brightness / 100);
    $('#bg-tint').style.opacity = isMedia ? String(eff.mediatint / 100) : '0';

    // Custom media
    const fit = cfg.bgfit || 'cover';
    const filter = `${eff.mediablur > 0 ? `blur(${(eff.mediablur / 100) * 40}px) ` : ''}saturate(${cfg.bgsaturation}%)`;
    const pos = `${cfg.bgposx}% ${cfg.bgposy}%`;
    document.querySelectorAll('#bg-media img, #bg-video').forEach((el) => {
      el.style.objectFit = fit; el.style.objectPosition = pos; el.style.filter = filter;
      el.classList.toggle('bleed', eff.mediablur > 0 && fit === 'cover');
    });
    if (eff.bgmode === 'image') { stopSlideshow(); if (eff.bgimage) showImage(fileUrl(eff.bgimage)); }
    else if (eff.bgmode === 'folder') startSlideshow(eff);
    else stopSlideshow();

    const vid = $('#bg-video');
    if (eff.bgmode === 'video' && eff.bgvideo) {
      const src = fileUrl(eff.bgvideo);
      if (vid.dataset.src !== src) { vid.src = src; vid.dataset.src = src; }
      if (vid.paused) vid.play().catch(() => {});
      startVideoSampling();
    } else { if (!vid.paused) vid.pause(); stopVideoSampling(); }

    applyPalette();
  }

  // ── Custom media helpers ───────────────────────────────────────────
  function fileUrl(p) {
    if (/^(data|https?|blob):/.test(p)) return p;
    const clean = String(p).replace(/^file:\/+/, '').replace(/\\/g, '/').replace(/#/g, '%23').replace(/\?/g, '%3F');
    return 'file:///' + clean;
  }
  let imgFlip = false; let shownSrc = '';
  function showImage(src) {
    if (!src || src === shownSrc) return;
    shownSrc = src;
    const [a, b] = document.querySelectorAll('#bg-media img');
    const next = imgFlip ? a : b; const prev = imgFlip ? b : a;
    imgFlip = !imgFlip;
    next.onload = () => {
      next.classList.add('on'); prev.classList.remove('on');
      bgPalette = extractPalette(next) || bgPalette; applyPalette();
    };
    next.onerror = () => LW.log('error', 'Could not load background image', src);
    next.src = src;
  }
  let slideTimer = null; let slideKey = '';
  function nextSlide(key) {
    if (typeof window.wallpaperRequestRandomFileForProperty !== 'function') return;
    window.wallpaperRequestRandomFileForProperty(key, (prop, file) => { if (file) showImage(fileUrl(file)); });
  }
  function startSlideshow(eff) {
    const every = Math.max(1, eff.bginterval) * 60000; const id = `${eff.folderKey}|${every}|${eff.bgfolder}`;
    if (slideTimer && id === slideKey) return;
    stopSlideshow(); slideKey = id;
    if (eff.bgfolder) nextSlide(eff.folderKey);
    slideTimer = setInterval(() => nextSlide(eff.folderKey), every);
  }
  function stopSlideshow() { clearInterval(slideTimer); slideTimer = null; slideKey = ''; }

  let vidTimer = null;
  function startVideoSampling() {
    if (vidTimer) return;
    const sample = () => { const v = $('#bg-video'); if (v.readyState >= 2) { const p = extractPalette(v); if (p) { bgPalette = p; applyPalette(); } } };
    sample(); vidTimer = setInterval(sample, 4000);
  }
  function stopVideoSampling() { clearInterval(vidTimer); vidTimer = null; }

  LW.background = {
    setCover,
    refresh: () => render(false),
    /** Called when the idle state flips: re-render only if idle uses its own background. */
    idleChanged: () => { if (LW.config.get('idlebg') !== 'same') render(false); },
    folderChanged: () => { stopSlideshow(); render(false); },
    get palette() { return cover.palette; },
    parseColor, extractPalette,
  };
})();
