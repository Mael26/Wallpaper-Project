/*
 * Orchestrator: music source → playback clock → lyrics → renderer,
 * plus clock/idle screen, lyrics area, per-song sync offsets and i18n.
 */
(function () {
  'use strict';
  const LW = window.LW;
  const $ = (s) => document.querySelector(s);
  const cfgGet = LW.config.get;

  const clock = new LW.PlaybackClock();
  const S = {
    track: null, key: '', duration: 0, playback: 'stopped', pausedAt: 0,
    lyrics: null, lyricsState: 'none', how: '', mediaEnabled: true,
    fetchTimer: null, retryTimer: null, abort: null, gotTimelineFor: '',
    songOffset: 0, lastTrack: null,
  };

  // ── Texts shown on the wallpaper ───────────────────────────────────
  const I18N = {
    es: {
      searching: 'Buscando letra…', notfound: 'Letra no disponible', instrumental: 'Instrumental',
      offline: 'Sin conexión con LRCLIB', retry: 'Reintentando en 30 s', plain: 'Letra sin sincronizar', paused: 'En pausa',
      mediaoff: 'Activa la integración multimedia en Wallpaper Engine',
      sync: 'Sincronía', songoffset: 'Esta canción', reset: 'Sincronía restablecida', earlier: 'antes', later: 'más tarde', lyricsShift: 'letra {s} {d}',
      tips: { '-500': 'Letra 0,5 s más tarde', '-100': 'Letra 0,1 s más tarde', '100': 'Letra 0,1 s antes', '500': 'Letra 0,5 s antes', reset: 'Restablecer esta canción' }, last: 'Última canción', now: 'Sonando',
      why: { notfound: 'Sin letra en LRCLIB', instrumental: 'Instrumental', skipped: 'Más de {m} min: no se busca letra',
        error: 'Sin conexión · reintentando', disabled: 'Letras en línea apagadas' },
      estimated: 'Sincronía estimada', setup: 'Activa la integración multimedia',
      steps: ['Wallpaper Engine', 'Ajustes', 'General', 'Media integration support'],
      greet: ['Buenas noches', 'Buenos días', 'Buenas tardes', 'Buenas noches'], am: 'a. m.', pm: 'p. m.', locale: 'es-ES',
    },
    en: {
      searching: 'Searching lyrics…', notfound: 'Lyrics not available', instrumental: 'Instrumental',
      offline: 'Can’t reach LRCLIB', retry: 'Retrying in 30 s', plain: 'Unsynced lyrics', paused: 'Paused',
      mediaoff: 'Turn on media integration in Wallpaper Engine',
      sync: 'Sync', songoffset: 'This song', reset: 'Sync reset', earlier: 'earlier', later: 'later', lyricsShift: 'lyrics {s} {d}',
      tips: { '-500': 'Lyrics 0.5 s later', '-100': 'Lyrics 0.1 s later', '100': 'Lyrics 0.1 s earlier', '500': 'Lyrics 0.5 s earlier', reset: 'Reset this song' }, last: 'Last played', now: 'Now playing',
      why: { notfound: 'No lyrics on LRCLIB', instrumental: 'Instrumental', skipped: 'Over {m} min: lyrics skipped',
        error: 'Offline · retrying', disabled: 'Online lyrics off' },
      estimated: 'Estimated sync', setup: 'Turn on media integration',
      steps: ['Wallpaper Engine', 'Settings', 'General', 'Media integration support'],
      greet: ['Good night', 'Good morning', 'Good afternoon', 'Good evening'], am: 'AM', pm: 'PM', locale: 'en-US',
    },
  };
  /** On-screen language: 'auto' follows the system (Spanish if it is Spanish, otherwise English). */
  const lang = () => { const l = cfgGet('language'); return l === 'auto' ? (/^es\b/i.test(navigator.language || '') ? 'es' : 'en') : l; };
  const T = () => I18N[lang()] || I18N.en;

  // ── Song info ──────────────────────────────────────────────────────
  function setHeader(track) {
    const clean = cfgGet('cleantitles');
    const title = track ? (clean ? LW.lyrics.cleanTitle(track.title) || track.title : track.title) : '';
    const artist = track ? (clean ? (track.artist || '').replace(/\s*-\s*Topic$/i, '').replace(/VEVO$/i, '').trim() : track.artist) : '';
    $('#title').textContent = title;
    $('#artist').textContent = track ? [artist, track.album].filter(Boolean).join(' · ') : '';
  }

  // ── Lyrics ─────────────────────────────────────────────────────────
  function showLyrics(res) {
    S.lyrics = res; S.how = res.how || '';
    if (res.synced) {
      const lines = LW.lyrics.buildTimeline(LW.lyrics.parseLRC(res.synced), S.duration || (res.matched && res.matched.duration));
      if (lines.some((l) => !l.isBreak)) { S.lyricsState = 'synced'; LW.renderer.setSynced(lines); return; }
    }
    if (res.plain) { S.lyricsState = 'plain'; LW.renderer.setPlain(res.plain.split(/\r?\n/).map((s) => s.trim())); return; }
    if (res.instrumental) { noLyrics('instrumental'); return; }
    noLyrics('notfound');
  }

  /** No lyrics to show (not found, instrumental, video, offline): clock / background / message. */
  const NOLYRICS = ['notfound', 'instrumental', 'skipped', 'error', 'disabled'];
  let whyTimer = null;
  function noLyrics(state) {
    S.lyricsState = state;
    const L = T();
    // Short, discreet reason under "Now playing" so it never looks broken; fades after 8 s.
    const why = $('#nolyr-why'); why.textContent = L.why[state].replace('{m}', cfgGet('videominutes'));
    why.classList.add('on'); clearTimeout(whyTimer); whyTimer = setTimeout(() => why.classList.remove('on'), 8000);
    const msg = { notfound: L.notfound, instrumental: L.instrumental, skipped: L.notfound, error: L.offline, disabled: L.why.disabled }[state];
    if (cfgGet('nolyrics') === 'message') LW.renderer.setMessage(msg, state === 'error' ? L.retry : (S.track ? `${S.track.title} — ${S.track.artist}` : ''));
    else LW.renderer.setMessage('');
    updateIdle();
  }
  /** Long media (video essays, streams, podcasts) are not songs: don't search, go straight to the clock. */
  function isLongMedia() { const m = cfgGet('videominutes'); return m > 0 && S.duration > m * 60; }

  async function loadLyrics() {
    const track = S.track; const key = S.key;
    if (!track) return;
    if (track.demoLrc) { showLyrics({ synced: track.demoLrc, how: 'demo' }); return; }
    S.abort && S.abort.abort();
    if (!cfgGet('onlinelookup')) { noLyrics('disabled'); return; }
    if (isLongMedia()) { noLyrics('skipped'); return; }
    const ctl = new AbortController(); S.abort = ctl;
    S.lyricsState = 'loading';
    LW.renderer.setLoading(T().searching);
    updateIdle();
    document.body.classList.add('loading');
    try {
      const res = await LW.lyrics.find(Object.assign({}, track, { duration: S.duration || track.duration }), ctl.signal);
      if (key !== S.key) return;
      LW.log('info', 'lyrics:', res.found ? `${res.how}${res.cached ? ' (cache)' : ''} #${res.id}` : 'not found');
      showLyrics(res);
    } catch (e) {
      if (ctl.signal.aborted || key !== S.key) return;
      LW.log('error', 'LRCLIB', e);
      noLyrics('error');
      clearTimeout(S.retryTimer);
      S.retryTimer = setTimeout(() => { if (key === S.key) loadLyrics(); }, 30000);
    } finally { document.body.classList.remove('loading'); }
  }

  // ── Per-song sync offset (saved in this PC, keyed by title+artist) ─
  const offKey = () => (S.track ? 'lirica.v1.off.' + LW.lyrics.cache.key(S.track) : null);
  function loadSongOffset() {
    S.songOffset = 0;
    try { const k = offKey(); if (k) S.songOffset = Number(localStorage.getItem(k)) || 0; } catch (_) { /* storage blocked */ }
    renderSyncValue();
  }
  function saveSongOffset(ms) {
    S.songOffset = Math.max(-10000, Math.min(10000, Math.round(ms)));
    try { const k = offKey(); if (k) { if (S.songOffset) localStorage.setItem(k, String(S.songOffset)); else localStorage.removeItem(k); } } catch (_) { /* ignore */ }
    renderSyncValue();
  }
  const fmtOff = (ms) => `${ms > 0 ? '+' : ms < 0 ? '−' : ''}${(Math.abs(ms) / 1000).toFixed(2)} s`;
  function renderSyncValue() {
    $('#sync-val').textContent = fmtOff(S.songOffset);
    $('#syncbar').classList.toggle('changed', !!S.songOffset);
  }
  let toastTimer = null;
  function toast(msg) {
    const el = $('#toast'); el.textContent = msg; el.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 1600);
  }
  function initSyncBar() {
    $('#syncbar').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b || !S.track) return;
      if (b.dataset.d === 'reset') { saveSongOffset(0); toast(T().reset); return; }
      saveSongOffset(S.songOffset + Number(b.dataset.d));
      const L = T(); const sec = (Math.abs(S.songOffset) / 1000).toFixed(2).replace('.', lang() === 'es' ? ',' : '.') + ' s';
      toast(S.songOffset ? `${L.songoffset}: ${L.lyricsShift.replace('{s}', sec).replace('{d}', S.songOffset > 0 ? L.earlier : L.later)}` : L.reset);
    });
    // Shows only after resting the pointer ~0.6 s on the song info (or on the bottom edge when the
    // info is hidden), so moving the mouse across the desktop never pops it up by accident.
    let hideTimer = null; let dwell = null; let shown = false;
    const bar = $('#syncbar');
    function inside(r, x, y, m) { return x >= r.left - m && x <= r.right + m && y >= r.top - m && y <= r.bottom + m; }
    function hotZone(x, y) {
      const info = $('#info'); const r = info.getBoundingClientRect();
      if (cfgGet('header') !== 'hidden' && r.width > 0) return inside(r, x, y, 14);
      return y > innerHeight * 0.85 && Math.abs(x - innerWidth / 2) < innerWidth * 0.25;
    }
    function place() {
      const r = $('#info').getBoundingClientRect(); const b = bar.getBoundingClientRect();
      if (cfgGet('header') === 'hidden' || !r.width) { bar.style.left = `${(innerWidth - b.width) / 2}px`; bar.style.top = `${innerHeight - b.height - 24}px`; return; }
      const below = r.bottom + 10 + b.height < innerHeight;
      bar.style.left = `${Math.max(8, Math.min(innerWidth - b.width - 8, r.left))}px`;
      bar.style.top = `${below ? r.bottom + 10 : r.top - b.height - 10}px`;
    }
    function show() { shown = true; place(); document.body.classList.add('mouse'); }
    function hideSoon() { clearTimeout(hideTimer); hideTimer = setTimeout(() => { shown = false; document.body.classList.remove('mouse'); }, 1000); }
    function pokeMouse(e) {
      if (cfgGet('songsync') !== 'hover' || !S.track) return;
      const overBar = shown && inside(bar.getBoundingClientRect(), e.clientX, e.clientY, 8);
      if (overBar || (shown && hotZone(e.clientX, e.clientY))) { clearTimeout(hideTimer); return; }
      if (hotZone(e.clientX, e.clientY)) { if (!dwell) dwell = setTimeout(() => { dwell = null; show(); }, 600); }
      else { clearTimeout(dwell); dwell = null; if (shown) hideSoon(); }
    }
    window.addEventListener('mousemove', pokeMouse, { passive: true });
  }

  // ── Source events ──────────────────────────────────────────────────
  function onTrack(track) {
    if (!track || !track.title) { S.track = null; S.key = ''; setHeader(null); updateIdle(); return; }
    const key = `${track.title}\u0001${track.artist}`;
    setHeader(track);
    if (key === S.key) { S.track = Object.assign(S.track || {}, track); return; }
    S.track = track; S.key = key; S.lyrics = null; S.trackAt = Date.now();
    S.duration = track.duration || 0;
    clock.reset(0);
    loadSongOffset();
    if (!track.demoLrc) {
      S.lastTrack = { title: $('#title').textContent, artist: (track.artist || '').replace(/\s*-\s*Topic$/i, '') };
      try { localStorage.setItem('lirica.v1.last', JSON.stringify(S.lastTrack)); } catch (_) { /* ignore */ }
    }
    clearTimeout(S.fetchTimer); clearTimeout(S.retryTimer);
    LW.renderer.setMessage('');
    // Windows sometimes sends the title first and the artist a moment later; waiting also lets
    // the duration arrive, which improves LRCLIB matching.
    S.fetchTimer = setTimeout(loadLyrics, track.demoLrc ? 0 : 700);
    updateIdle();
  }

  function onTimeline({ position, duration }) {
    if (duration > 0 && Math.abs(duration - S.duration) > 0.5) {
      S.duration = duration;
      if (S.lyricsState === 'loading' && isLongMedia()) { S.abort && S.abort.abort(); document.body.classList.remove('loading'); noLyrics('skipped'); }
    }
    clock.sync(position);
    S.gotTimelineFor = S.key;
  }

  function onPlayback(state) {
    S.playback = state;
    clock.setPlaying(state === 'playing');
    if (state === 'paused') S.pausedAt = Date.now();
    document.body.classList.toggle('paused', state === 'paused');
    updateIdle();
  }

  function onStatus({ enabled }) { S.mediaEnabled = enabled; updateIdle(); }

  // ── Idle screen & clock ────────────────────────────────────────────
  function isIdle() {
    if (!S.track || S.playback === 'stopped') return true;
    const after = cfgGet('idleafter');
    return S.playback === 'paused' && after > 0 && Date.now() - S.pausedAt > after * 60000;
  }
  let wasIdle = null;
  function updateIdle() {
    const realIdle = isIdle();
    const noLyr = !realIdle && NOLYRICS.includes(S.lyricsState) && cfgGet('nolyrics') !== 'message';
    const idle = realIdle || noLyr; // the "clock screen" look
    const b = document.body;
    b.classList.toggle('idle', idle);
    b.classList.toggle('nolyrics', noLyr);
    b.classList.toggle('noclock', (realIdle && cfgGet('idle') === 'blank') || (noLyr && cfgGet('nolyrics') === 'background'));
    if (idle !== wasIdle) { wasIdle = idle; LW.background.idleChanged(); }
    const L = T();
    // Media integration off: show a visual, bilingual 4-step card instead of a single line of text.
    b.classList.toggle('media-off', !S.mediaEnabled);
    if (!S.mediaEnabled) renderSetupCard();
    const hint = S.mediaEnabled && realIdle && S.track && S.playback === 'paused' ? L.paused : '';
    setText('#idle-hint', hint);
    let line = '';
    if (cfgGet('lastplayed')) {
      if (noLyr && S.track) line = `${L.now}: ${$('#title').textContent}${S.track.artist ? ` — ${$('#artist').textContent}` : ''}`;
      else if (realIdle && S.lastTrack && !(S.track && S.playback === 'paused')) line = `${L.last}: ${S.lastTrack.title}${S.lastTrack.artist ? ` — ${S.lastTrack.artist}` : ''}`;
    }
    setText('#last-played', line);
  }
  function setText(sel, txt) { const el = $(sel); if (el.textContent !== txt) el.textContent = txt; el.classList.toggle('empty', !txt); }
  function setHTML(el, html) { if (el._h !== html) { el.innerHTML = html; el._h = html; } }

  const pad = (n) => String(n).padStart(2, '0');
  function renderSetupCard() {
    const main = T(); const other = lang() === 'es' ? I18N.en : I18N.es;
    setHTML($('#setup-card'), `<div class="sc-title">${main.setup}</div><div class="sc-sub">${other.setup}</div>`
      + `<ol class="sc-steps">${main.steps.map((st, i) => `<li><b>${i + 1}</b><span>${st}</span></li>`).join('')}</ol>`);
  }

  function tickClock() {
    // "Estimated sync" chip: the player isn't reporting the playback position to Windows.
    const est = !!S.track && S.playback === 'playing' && S.gotTimelineFor !== S.key && Date.now() - (S.trackAt || 0) > 3000 && S.lyricsState === 'synced';
    document.body.classList.toggle('estimated', est);
    if (est) setText('#sync-chip', T().estimated);
    const c = LW.config.all(); const L = T(); const d = new Date();
    let h = d.getHours(); const m = pad(d.getMinutes()); const s = pad(d.getSeconds());
    let suf = '';
    if (!c.clock24) { suf = h >= 12 ? L.pm : L.am; h = h % 12 || 12; }
    const hh = c.clock24 ? pad(h) : String(h);
    const sec = c.clockseconds ? `<span class="ss">${s}</span>` : '';
    const html = c.clockstyle === 'stacked'
      ? `<span class="hh">${hh}</span><span class="mm">${m}</span>${sec}${suf ? `<small>${suf}</small>` : ''}`
      : `${hh}<span class="colon">:</span>${m}${c.clockseconds ? `<span class="colon s">:</span>${sec}` : ''}${suf ? `<small>${suf}</small>` : ''}`;
    setHTML($('#clock-time'), html);
    setHTML($('#miniclock'), `${hh}<span class="colon">:</span>${m}${suf ? `<small>${suf}</small>` : ''}`);

    let date = '';
    if (c.dateformat !== 'none') {
      const o = c.dateformat === 'short' ? { weekday: 'short', day: 'numeric', month: 'short' }
        : c.dateformat === 'numeric' ? { day: '2-digit', month: '2-digit', year: 'numeric' }
          : { weekday: 'long', day: 'numeric', month: 'long' };
      date = d.toLocaleDateString(L.locale, o);
      date = date.charAt(0).toUpperCase() + date.slice(1);
    }
    setText('#clock-date', date);
    const hr = d.getHours();
    const greet = c.greeting === 'auto' ? L.greet[hr < 5 ? 0 : hr < 12 ? 1 : hr < 19 ? 2 : 3] : c.greeting === 'custom' ? c.greetingtext : '';
    setText('#greeting', greet);
    updateIdle();
  }

  // ── Animation loop (honours Wallpaper Engine FPS limit) ────────────
  let lastFrame = 0; let wePaused = false; let rafId = 0;
  function frame(now) {
    rafId = requestAnimationFrame(frame);
    const fps = LW.config.fps;
    if (fps > 0 && now - lastFrame < 1000 / fps - 1) return;
    lastFrame = now;
    const pos = clock.now();
    const t = pos + (cfgGet('syncoffset') + S.songOffset + cfgGet('leadtime')) / 1000;
    LW.renderer.update(t, S.duration);
    if (S.duration > 0) {
      const p = Math.max(0, Math.min(1, pos / S.duration));
      $('#progress-fill').style.transform = `scaleX(${p.toFixed(4)})`;
      if (cfgGet('showtime')) { $('#t-cur').textContent = LW.fmtTime(pos); $('#t-dur').textContent = LW.fmtTime(S.duration); }
    }
    if (cfgGet('debug')) debug(pos);
  }

  function debug(pos) {
    const box = $('#debug');
    if (box._t && performance.now() - box._t < 250) return; box._t = performance.now();
    const c = clock;
    box.textContent = [
      `source     ${cfgGet('source') === 'demo' || !LW.weSource.available ? 'demo' : 'Wallpaper Engine'}${S.mediaEnabled ? '' : ' (media integration OFF)'}`,
      `state      ${S.playback}  ·  pos ${pos.toFixed(2)} / ${S.duration.toFixed(1)} s`,
      `timeline   ${S.gotTimelineFor === S.key ? (c.samples.length >= 4 && c.samples.every((p) => p % 1 === 0) ? 'yes (whole seconds)' : 'yes') : 'NO — estimated from track change'}`,
      `track      ${S.track ? `${S.track.title} — ${S.track.artist}` : '—'}`,
      `lyrics     ${S.lyricsState}${S.how ? ` · ${S.how}` : ''}${S.lyrics && S.lyrics.cached ? ' · cache' : ''}${S.lyrics && S.lyrics.matched ? ` · «${S.lyrics.matched.title} — ${S.lyrics.matched.artist}»` : ''}`,
      `line       ${LW.renderer.activeIndex + 1} / ${LW.renderer.count}  ·  offset global ${cfgGet('syncoffset')} ms + song ${S.songOffset} ms`,
      `fps limit  ${LW.config.fps || '—'}`,
      '', ...LW.logLines(),
    ].join('\n');
  }

  // ── Visual settings → CSS variables and classes ────────────────────
  const FONT_BY_KEY = Object.fromEntries(LW.FONTS.map((f) => [f.key, f]));
  const FALLBACK = "'Segoe UI', 'Yu Gothic UI', 'Malgun Gothic', 'Microsoft YaHei UI', system-ui, sans-serif";
  const AREAS = { full: [0, 0, 100, 100], left: [0, 0, 52, 100], right: [48, 0, 52, 100], center: [12, 14, 76, 72], top: [0, 0, 100, 52], bottom: [0, 48, 100, 52] };

  function applyVisual() {
    const c = LW.config.all();
    const r = document.documentElement.style;
    const f = FONT_BY_KEY[c.font];
    let fam; let k = 1;
    if (c.font === 'custom' && c.customfont.trim()) fam = `'${c.customfont.trim().replace(/'/g, '')}'`;
    else if (c.font === 'system') fam = "'Segoe UI Variable Display', 'Segoe UI'";
    else { const ff = f || FONT_BY_KEY.inter; fam = `'L ${ff.family}'`; k = ff.scale; }
    r.setProperty('--font', `${fam}, ${FALLBACK}`);
    r.setProperty('--font-k', String(k));
    r.setProperty('--fs-scale', String(c.fontsize / 100));
    r.setProperty('--fw', String(c.fontweight));
    r.setProperty('--lh', String(c.lineheight / 100));
    r.setProperty('--gap', `${c.linegap / 100}em`);
    r.setProperty('--ls', `${c.letterspacing / 100}em`);
    r.setProperty('--glow', String(c.glow / 100));
    r.setProperty('--shadow', String(c.shadow / 100));
    r.setProperty('--ol', String(c.outline));
    r.setProperty('--outline-c', LW.config.weColorToRgb(c.outlinecolor, [0, 0, 0]).join(','));
    r.setProperty('--dur', `${c.transition}ms`);
    r.setProperty('--maxw', `${c.maxwidth}%`);
    r.setProperty('--hs', String(c.headersize / 100));
    r.setProperty('--fade', `${c.edgefade}%`);
    r.setProperty('--bd-a', String(c.backdropstrength / 100));
    r.setProperty('--bd-r', `${c.backdropradius}px`);
    r.setProperty('--clock-k', String(c.clocksize / 100));
    r.setProperty('--clock-c', c.clockcolor === 'accent' ? 'rgb(var(--accent))'
      : c.clockcolor === 'custom' ? `rgb(${LW.config.weColorToRgb(c.clockcustomcolor, [255, 255, 255]).join(',')})` : 'rgb(var(--text))');

    const b = document.body;
    Object.assign(b.dataset, {
      mode: c.mode, align: c.align, header: c.header, area: c.area, backdrop: c.backdrop,
      clockstyle: c.clockstyle, clockpos: c.clockpos, miniclock: c.miniclock, clockcard: c.clockcard, breakstyle: c.breakstyle,
    });
    b.classList.toggle('fontpreview', c.fontpreview);
    if (c.fontpreview) renderFontSheet(c);
    b.classList.toggle('upper', c.uppercase);
    b.classList.toggle('no-cover', !c.showcover);
    b.classList.toggle('no-progress', !c.showprogress);
    b.classList.toggle('show-time', c.showtime);
    b.classList.toggle('no-breaks', !c.showbreaks);
    b.classList.toggle('debug', c.debug);
    b.classList.toggle('blink', c.clockblink);
    b.classList.toggle('outline', c.outline > 0);
    if (c.songsync === 'off') b.classList.remove('mouse');
    $('#plain-badge').textContent = T().plain;
    $('#sync-label').textContent = T().sync;
    document.querySelectorAll('#syncbar button').forEach((btn) => { btn.title = T().tips[btn.dataset.d] || ''; });

    // Lyrics area
    const st = $('#stage').style;
    if (c.area === 'auto') { st.left = st.top = st.width = st.height = st.right = st.bottom = ''; }
    else {
      let [x, y, w, h] = c.area === 'custom' ? [c.areax, c.areay, c.areaw, c.areah] : AREAS[c.area] || AREAS.full;
      w = Math.min(w, 100 - x); h = Math.min(h, 100 - y);
      Object.assign(st, { left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%`, right: 'auto', bottom: 'auto' });
    }
  }

  // ── Font preview: on-screen specimen sheet + toast in the new font ─
  let sheetBuilt = false;
  function renderFontSheet(c) {
    const el = $('#fontsheet');
    if (!sheetBuilt) {
      const items = LW.FONTS.map((f, i) => `<div class="fs-item" data-k="${f.key}"><span class="fs-n">${i + 1}</span>`
        + `<span class="fs-s" style="font-family:'L ${f.family}';font-size:calc(var(--fs-size) * ${f.scale})">${f.label.split(' · ')[1].replace(/\s*\(.*\)/, '')} · Ññ 123</span>`
        + `<span class="fs-c">${f.label.split(' · ')[0]}</span></div>`).join('');
      el.innerHTML = items; sheetBuilt = true;
    }
    const n = LW.FONTS.length; const ar = innerWidth / innerHeight;
    const cols = ar > 3 ? 7 : ar > 1.6 ? 4 : ar > 1.1 ? 3 : 2; const rows = Math.ceil(n / cols);
    el.style.setProperty('--fs-cols', cols); el.style.setProperty('--fs-rows', rows);
    el.style.setProperty('--fs-size', `${Math.min(innerHeight * 0.86 / rows * 0.5, innerWidth / cols * 0.07)}px`);
    el.querySelectorAll('.fs-item').forEach((it) => it.classList.toggle('sel', it.dataset.k === c.font));
  }
  function fontToast(c) {
    const f = FONT_BY_KEY[c.font]; const el = $('#toast');
    el.style.fontFamily = f ? `'L ${f.family}', sans-serif` : '';
    toast(f ? f.label : c.font === 'custom' ? c.customfont || 'Custom' : 'Segoe UI');
    setTimeout(() => { el.style.fontFamily = ''; }, 1900);
  }

  // ── Startup ────────────────────────────────────────────────────────
  const BG_KEYS = ['bgmode', 'bgcolor', 'bgimage', 'bgfolder', 'bginterval', 'bgvideo', 'bgfit', 'bgposx', 'bgposy', 'mediablur',
    'mediabrightness', 'mediatint', 'bgblur', 'bgbrightness', 'bgsaturation', 'bgmotion', 'vignette', 'grain', 'adaptive', 'textcolor', 'accentcolor',
    'bgscene', 'scenecolors', 'scenespeed', 'scenequality', 'scenebrightness', 'idlebg', 'idleimage', 'idlevideo', 'idlescene', 'idlecolor',
    'idleblur', 'idledim', 'lyriccolor', 'colorstrength', 'colorsource'];

  function start() {
    try { S.lastTrack = JSON.parse(localStorage.getItem('lirica.v1.last') || 'null'); } catch (_) { S.lastTrack = null; }
    LW.renderer.init();
    applyVisual();
    LW.background.refresh();
    initSyncBar();

    LW.config.onChange((changed, origin) => {
      if ('__paused' in changed) {
        wePaused = changed.__paused;
        LW.scenes.pause(wePaused);
        cancelAnimationFrame(rafId);
        if (!wePaused) rafId = requestAnimationFrame(frame);
        return;
      }
      if ('__fps' in changed) return;
      applyVisual();
      if ('font' in changed && origin !== 'url') fontToast(LW.config.all());
      if ('bgfolder' in changed || 'idlefolder' in changed) LW.background.folderChanged();
      else if (BG_KEYS.some((k) => k in changed)) LW.background.refresh();
      LW.renderer.applyConfig(changed);
      if ('source' in changed) switchSource();
      if ('cleantitles' in changed) setHeader(S.track);
      tickClock();
    });

    LW.bus.on('track', onTrack);
    LW.bus.on('timeline', onTimeline);
    LW.bus.on('playback', onPlayback);
    LW.bus.on('source-status', onStatus);
    LW.bus.on('cover', (cover) => {
      $('#cover').src = cover && cover.src ? cover.src : '';
      document.body.classList.toggle('has-cover', !!(cover && cover.src));
      LW.background.setCover(cover);
    });

    switchSource();
    tickClock(); setInterval(tickClock, 1000);
    rafId = requestAnimationFrame(frame);
    document.body.classList.add('ready');
  }

  function switchSource() {
    const wantDemo = cfgGet('source') === 'demo' || !LW.weSource.available;
    if (wantDemo) LW.demoSource.start();
    else if (LW.demoSource.running) { LW.demoSource.stop(); S.key = ''; onTrack(null); LW.weSource.replay(); }
    updateIdle();
  }

  // Expose state for DevTools (Wallpaper Engine CEF devtools)
  LW.state = S; LW.clock = clock;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
