/*
 * Render de la letra. Tres modos:
 *   scroll  — lista que se desplaza con efecto ola; opacidad y desenfoque por distancia
 *   karaoke — igual que scroll + barrido de color palabra por palabra
 *   focus   — una sola línea grande con animación de entrada/salida
 * El DOM sólo se toca cuando cambia la línea activa; por frame únicamente se
 * actualizan variables CSS de la línea activa (barrido, puntos de pausa).
 */
(function () {
  'use strict';
  const LW = window.LW;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const els = { view: null, track: null, focus: null, status: null };
  let lines = [];        // [{time,end,text,isBreak,words}]
  let kind = 'none';     // synced | plain | message | none
  let nodes = [];        // elementos .line
  let layout = [];       // {top,h}
  let active = -2;
  let cfg = LW.config.all();
  let lastProgress = -1;
  let lastT = 0;

  // ── Construcción ───────────────────────────────────────────────────
  function wordsHTML(text) {
    return text.split(/(\s+)/).map((p) => (/^\s+$/.test(p) ? p : p ? `<span class="w">${esc(p)}</span>` : '')).join('');
  }
  /** Instrumental-break indicator. 'font' uses the lyrics font's own period glyph,
   *  so a gothic, pixel or script font gets matching dots. */
  function dotsHTML() {
    switch (cfg.breakstyle) {
      case 'dots': return '<span class="dots"><i></i><i></i><i></i></span>';
      case 'notes': return '<span class="dots g notes"><i>♪</i><i>♫</i><i>♪</i></span>';
      case 'bars': return '<span class="dots bars"><i></i><i></i><i></i><i></i><i></i></span>';
      default: return '<span class="dots g"><i>.</i><i>.</i><i>.</i></span>';
    }
  }

  function build() {
    els.track.innerHTML = '';
    nodes = [];
    if (kind === 'synced' || kind === 'plain') {
      const frag = document.createDocumentFragment();
      lines.forEach((l, i) => {
        const d = document.createElement('div');
        d.className = 'line' + (l.isBreak ? ' break' : '');
        d.dataset.i = i;
        d.innerHTML = l.isBreak ? dotsHTML() : (cfg.mode === 'karaoke' ? wordsHTML(l.text) : esc(l.text));
        frag.appendChild(d); nodes.push(d);
      });
      els.track.appendChild(frag);
    }
    precomputeWords();
    active = -2; lastProgress = -1;
    measure();
    els.focus.innerHTML = '';
  }

  /** Reparte el tiempo de cada línea entre sus palabras (o usa marcas reales). */
  function precomputeWords() {
    lines.forEach((l, i) => {
      if (l.isBreak || !l.text) return;
      const parts = l.text.split(/\s+/).filter(Boolean);
      if (l.words && l.words.length === parts.length) {
        l.wt = l.words.map((w, k) => ({ s: w.time, e: l.words[k + 1] ? l.words[k + 1].time : Math.min(l.end, w.time + 1.2) }));
        return;
      }
      const span = Math.max(0.6, Math.min(l.end - l.time - 0.12, Math.max(1.1, l.text.length * 0.085)));
      const weights = parts.map((p) => p.length + 1.5);
      const total = weights.reduce((a, b) => a + b, 0);
      let acc = l.time;
      l.wt = weights.map((w) => { const s = acc; acc += span * (w / total); return { s, e: acc }; });
    });
  }

  function measure() {
    layout = nodes.map((n) => ({ top: n.offsetTop, h: n.offsetHeight }));
    if (active >= -1) { const a = active; active = -2; place(a, true); }
  }

  // ── Scroll / karaoke ───────────────────────────────────────────────
  function opacityFor(d) {
    const io = cfg.inactiveopacity / 100;
    if (d === 0) return 1;
    const ad = Math.abs(d);
    const f = Math.max(0.18, 1 - (ad - 1) * 0.2) * (d < 0 ? 0.85 : 1);
    return ad > 7 ? 0 : io * f;
  }

  function place(idx, instant) {
    if (!nodes.length) return;
    const prev = active; active = idx;
    const viewH = els.view.clientHeight;
    const anchor = viewH * (cfg.anchor / 100);
    const ref = idx >= 0 ? layout[idx] : layout[0] ? { top: layout[0].top - layout[0].h * 1.2, h: layout[0].h } : { top: 0, h: 0 };
    const y = anchor - (ref.top + ref.h / 2);
    const jump = prev < -1 || Math.abs(idx - prev) > 3 || instant;
    // The wave always starts on the side the text moves towards, so lines never run into each other:
    // moving forward (text goes up) the top leads; seeking back (text goes down) the bottom leads.
    const forward = prev < -1 || idx >= prev;
    const STEP = Math.min(32, cfg.transition / 22);
    const scaleOn = cfg.activescale / 100;
    const blurK = cfg.distanceblur / 10;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]; const d = idx < 0 ? i + 1 : i - idx; const ad = Math.abs(d);
      n.classList.toggle('active', d === 0);
      n.classList.toggle('past', d < 0);
      const visible = ad <= 9;
      let delay = 0;
      if (!jump && cfg.stagger) {
        if (forward && d > 0) delay = Math.min(d, 6) * STEP;
        else if (!forward && d < 0) delay = Math.min(-d, 6) * STEP;
      }
      n.style.transitionDuration = jump ? '0ms' : '';
      n.style.transitionDelay = `${delay}ms`;
      n.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0) scale(${d === 0 ? scaleOn : 1})`;
      n.style.opacity = visible ? opacityFor(d).toFixed(3) : '0';
      n.style.filter = d === 0 ? '' : blurK > 0 && ad <= 5 ? `blur(${(blurK * Math.pow(ad, 0.85) * 0.75).toFixed(2)}px)` : 'none';
      n.style.visibility = visible ? 'visible' : 'hidden';
    }
    if (jump) requestAnimationFrame(() => nodes.forEach((n) => { n.style.transitionDuration = ''; }));
    // limpiar barrido de la línea anterior
    if (prev >= 0 && nodes[prev]) nodes[prev].querySelectorAll('.w').forEach((w) => w.style.removeProperty('--wp'));
  }

  function updateKaraoke(t) {
    const l = lines[active]; const n = nodes[active];
    if (!l || !n || l.isBreak || !l.wt) return;
    const ws = n.querySelectorAll('.w');
    for (let k = 0; k < ws.length && k < l.wt.length; k++) {
      const { s, e } = l.wt[k];
      const p = t <= s ? 0 : t >= e ? 1 : (t - s) / (e - s);
      const prevP = ws[k]._p;
      if (prevP !== p) { ws[k].style.setProperty('--wp', p.toFixed(3)); ws[k]._p = p; }
    }
  }

  function updateBreak(t, node, l) {
    if (!l || !l.isBreak || !node) return;
    const p = Math.max(0, Math.min(1, (t - l.time) / Math.max(0.1, l.end - l.time)));
    if (Math.abs(p - lastProgress) > 0.004) { node.style.setProperty('--p', p.toFixed(3)); lastProgress = p; }
    node.classList.toggle('ending', l.end - t < 0.7);
  }

  // ── Plain (sin sincronizar): desplazamiento proporcional ───────────
  function updatePlain(t, duration) {
    if (!nodes.length) return;
    const viewH = els.view.clientHeight;
    const total = els.track.scrollHeight;
    const p = duration > 0 ? Math.max(0, Math.min(1, (t - 8) / Math.max(1, duration - 20))) : 0;
    const y = viewH * 0.35 - p * Math.max(0, total - viewH * 0.4);
    els.track.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
  }

  // ── Foco ───────────────────────────────────────────────────────────
  function fitFocus(el) {
    const maxH = els.focus.clientHeight * 0.58;
    let scale = 1;
    for (let k = 0; k < 6 && el.scrollHeight > maxH; k++) { scale *= 0.86; el.style.fontSize = `calc(var(--fs) * var(--focus-k) * ${scale.toFixed(3)})`; }
  }

  function focusShow(idx) {
    const prev = active; active = idx;
    const slot = els.focus.querySelector('.fslot') || els.focus.appendChild(Object.assign(document.createElement('div'), { className: 'fslot' }));
    slot.querySelectorAll('.fline:not(.leave)').forEach((o) => {
      o.classList.remove('enter'); o.classList.add('leave');
      setTimeout(() => o.remove(), cfg.transition + 80);
    });
    const old = els.focus.querySelector('.fnext'); if (old) old.remove();
    const l = lines[idx];
    if (l) {
      const d = document.createElement('div');
      d.className = `fline enter fx-${cfg.focusanim}` + (l.isBreak ? ' break' : '');
      if (l.isBreak) d.innerHTML = dotsHTML();
      else if (cfg.focusanim === 'words') {
        let k = 0;
        d.innerHTML = l.text.split(/(\s+)/).map((p) => (/^\s+$/.test(p) ? p : `<span class="w" style="animation-delay:${(k++) * 70}ms">${esc(p)}</span>`)).join('');
      } else if (cfg.focusanim === 'typewriter') {
        const chars = [...l.text];
        const per = Math.max(12, Math.min(45, ((l.end - l.time) * 450) / Math.max(1, chars.length)));
        d.innerHTML = chars.map((c, k) => (c === ' ' ? ' ' : `<span class="ch" style="animation-delay:${Math.round(k * per)}ms">${esc(c)}</span>`)).join('');
      } else d.textContent = l.text;
      slot.appendChild(d);
      fitFocus(d);
      const nx = lines.slice(idx + 1).find((x) => !x.isBreak);
      if (cfg.shownext && nx) {
        const n = document.createElement('div'); n.className = 'fnext'; n.textContent = nx.text;
        els.focus.appendChild(n);
      }
    }
    return prev;
  }

  // ── API pública ────────────────────────────────────────────────────
  const R = {
    init() {
      els.view = $('#lyrics'); els.track = $('#lyrics-track'); els.focus = $('#focus'); els.status = $('#status');
      let rt = null;
      window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => R.relayout(), 120); });
      // Re-measure whenever the lyrics change size: a font finishing loading, a new size, line height…
      // (measuring with stale metrics is what makes lines overlap after changing settings)
      let pend = false;
      const remeasure = () => { if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; R.relayout(); }); };
      if (document.fonts) {
        document.fonts.ready.then(remeasure);
        document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', remeasure);
      }
      if (window.ResizeObserver) {
        let lastH = 0;
        new ResizeObserver(() => { const h = els.track.scrollHeight; if (h !== lastH) { lastH = h; remeasure(); } }).observe(els.track);
        new ResizeObserver(remeasure).observe(els.view);
      }
    },
    setSynced(ls) { lines = ls; kind = 'synced'; R.status(''); build(); },
    setPlain(texts) { lines = texts.map((t) => ({ time: 0, end: 0, text: t, isBreak: !t })); kind = 'plain'; R.status(''); build(); nodes.forEach((n) => { n.style.opacity = String(Math.max(0.55, cfg.inactiveopacity / 100 + 0.3)); }); },
    setMessage(msg, sub) { lines = []; kind = 'message'; build(); R.status(msg, sub); },
    /** Discreet "searching" state: pulsing dots + small caption instead of a big message. */
    setLoading(sub) {
      lines = []; kind = 'message'; build();
      els.status.innerHTML = `<div class="loading-dots">${dotsHTML()}</div><div class="sub">${esc(sub)}</div>`;
      els.status.classList.add('on');
    },
    status(msg, sub) {
      els.status.innerHTML = msg ? `<div class="msg">${esc(msg)}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}` : '';
      els.status.classList.toggle('on', !!msg);
    },
    get kind() { return kind; },
    get activeIndex() { return active; },
    get count() { return lines.length; },

    update(t, duration) {
      document.body.classList.toggle('is-plain', kind === 'plain');
      if (kind === 'plain') { updatePlain(t, duration); return; }
      if (kind !== 'synced' || !lines.length) return;
      let idx = LW.lyrics.activeIndex(lines, t);
      // Hysteresis: tiny backward corrections never re-activate the previous line (no back-and-forth);
      // only a real seek (> 0.6 s before the current line) does.
      if (active >= 0 && idx < active && lines[active] && t > lines[active].time - 0.6) idx = active;
      if (cfg.mode === 'focus') {
        if (idx !== active) { lastProgress = -1; focusShow(idx); }
        const cur = els.focus.querySelector('.fline.break:not(.leave)');
        if (cur) updateBreak(t, cur, lines[active]);
        return;
      }
      if (idx !== active) { lastProgress = -1; place(idx, false); }
      lastT = t;
      if (active >= 0) {
        const l = lines[active];
        if (l.isBreak) updateBreak(t, nodes[active], l);
        else if (cfg.mode === 'karaoke') updateKaraoke(t);
      }
    },

    applyConfig(changed) {
      cfg = LW.config.all();
      const structural = ['mode', 'focusanim', 'shownext', 'breakstyle'].some((k) => k in changed);
      if (structural && (kind === 'synced' || kind === 'plain')) { const k = kind; build(); if (k === 'plain') R.setPlain(lines.map((l) => l.text)); }
      else R.relayout();
    },

    relayout() {
      cfg = LW.config.all();
      if (cfg.mode === 'focus') { const a = active; active = -2; if (a >= -1 && kind === 'synced') focusShow(a); return; }
      measure();
    },
  };
  LW.renderer = R;
})();
