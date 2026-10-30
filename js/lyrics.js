/*
 * Letras: parser LRC + cliente LRCLIB (https://lrclib.net) con limpieza de títulos,
 * varias estrategias de búsqueda y caché local.
 */
(function () {
  'use strict';
  const LW = window.LW;

  // ════════════════════════════════════════════════════════════════════
  //  Parser LRC
  //  Soporta: varias marcas por línea, [mm:ss], [mm:ss.xx], [mm:ss:xx],
  //  [offset:±ms], marcas por palabra <mm:ss.xx> (LRC mejorado) y líneas vacías
  //  como pausas instrumentales.
  // ════════════════════════════════════════════════════════════════════
  const TAG = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
  const WORD = /<(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?>/g;
  const toSec = (m, s, f) => Number(m) * 60 + Number(s) + (f ? Number(f.padEnd(3, '0').slice(0, 3)) / 1000 : 0);

  function parseLRC(text) {
    if (!text) return [];
    let offset = 0;
    const out = [];
    for (const rawLine of String(text).split(/\r?\n/)) {
      const raw = rawLine.trim();
      const off = raw.match(/^\s*\[offset:\s*([+-]?\d+)\s*\]/i);
      if (off) { offset = Number(off[1]) / 1000; continue; }
      TAG.lastIndex = 0;
      const times = [];
      let m; let end = 0;
      while ((m = TAG.exec(raw)) && m.index === end) { times.push(toSec(m[1], m[2], m[3])); end = TAG.lastIndex; }
      if (!times.length) continue;
      let body = raw.slice(end);
      let words = null;
      if (WORD.test(body)) {
        WORD.lastIndex = 0;
        words = [];
        const parts = body.split(WORD); // [texto, m, s, f, texto, m, s, f, texto…]
        for (let i = 1; i < parts.length; i += 4) {
          const w = (parts[i + 3] || '');
          if (w.trim()) words.push({ time: toSec(parts[i], parts[i + 1], parts[i + 2]), text: w });
        }
        body = body.replace(WORD, '');
      }
      const txt = body.replace(/\s+/g, ' ').trim();
      for (const t of times) out.push({ time: Math.max(0, t), text: txt, words });
    }
    out.sort((a, b) => a.time - b.time);
    if (offset) out.forEach((l) => { l.time = Math.max(0, l.time - offset); if (l.words) l.words.forEach((w) => { w.time -= offset; }); });
    return out;
  }

  /** Convierte a líneas de presentación con fin, pausas e intro. */
  function buildTimeline(parsed, duration) {
    const MIN_BREAK = 4.5;
    const lines = [];
    for (let i = 0; i < parsed.length; i++) {
      const cur = parsed[i];
      const nextTime = i + 1 < parsed.length ? parsed[i + 1].time : (duration || cur.time + 6);
      if (!cur.text) {
        if (nextTime - cur.time >= MIN_BREAK) lines.push({ time: cur.time, end: nextTime, text: '', isBreak: true });
        continue;
      }
      lines.push({ time: cur.time, end: nextTime, text: cur.text, words: cur.words });
    }
    // Pausas largas sin línea vacía explícita: se cierra la línea y se añade pausa.
    const result = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const natural = Math.min(l.end - l.time, Math.max(2.5, l.text.length * 0.12 + 1.8));
      if (!l.isBreak && l.end - (l.time + natural) >= 6) {
        result.push(Object.assign({}, l, { end: l.time + natural }));
        result.push({ time: l.time + natural, end: l.end, text: '', isBreak: true });
      } else result.push(l);
    }
    if (result.length && result[0].time >= MIN_BREAK) result.unshift({ time: 0, end: result[0].time, text: '', isBreak: true, intro: true });
    // fusionar pausas consecutivas
    const merged = [];
    for (const l of result) {
      const prev = merged[merged.length - 1];
      if (l.isBreak && prev && prev.isBreak) prev.end = l.end; else merged.push(l);
    }
    return merged;
  }

  /** Índice de la línea activa (búsqueda binaria). */
  function activeIndex(lines, t) {
    let lo = 0; let hi = lines.length - 1; let ans = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (lines[mid].time <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
    return ans;
  }

  // ════════════════════════════════════════════════════════════════════
  //  Normalización de metadatos (YouTube, Spotify, navegadores…)
  // ════════════════════════════════════════════════════════════════════
  const JUNK_BRACKETS = /\s*[([【]\s*(?:official|oficial|video|vídeo|audio|lyrics?|letra|lyric video|visuali[sz]er|hd|hq|4k|mv|m\/v|explicit|clean|color coded|sub(?:titulado|bed)?|remaster(?:ed)?|\d{4}\s*remaster(?:ed)?|remaster(?:ed)?\s*\d{4}|from\b|tema oficial|en vivo|live)[^)\]】]*[)\]】]/gi;
  const FEAT = /\s*[([]?\s*(?:feat\.?|ft\.?|featuring|con)\s+[^)\]]*[)\]]?/gi;
  const DASH_SUFFIX = /\s+-\s+(?:remaster(?:ed)?(?:\s+\d{4})?|\d{4}\s+remaster(?:ed)?|single version|radio edit|mono|stereo|live.*|en vivo.*)$/i;

  function cleanTitle(t) {
    return (t || '').replace(JUNK_BRACKETS, '').replace(FEAT, '').replace(DASH_SUFFIX, '')
      .replace(/\s*\|.*$/, '').replace(/["“”]/g, '').replace(/\s+/g, ' ').trim();
  }
  function cleanArtist(a) {
    return (a || '').replace(/\s*-\s*Topic$/i, '').replace(/VEVO$/i, '').replace(/\s*(?:Official|Oficial)$/i, '').trim();
  }
  function primaryArtist(a) {
    return cleanArtist(a).split(/\s*(?:,|&|;|\/|\s+x\s+|\s+(?:feat|ft|Feat|Ft|FEAT|FT)\.?\s+|\s+featuring\s+)\s*/)[0].trim();
  }
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9À-￿]+/g, ' ').trim();
  function similarity(a, b) {
    const A = new Set(norm(a).split(' ').filter(Boolean)); const B = new Set(norm(b).split(' ').filter(Boolean));
    if (!A.size || !B.size) return 0;
    let inter = 0; A.forEach((x) => { if (B.has(x)) inter++; });
    return inter / Math.min(A.size, B.size) * 0.7 + inter / Math.max(A.size, B.size) * 0.3;
  }

  // ════════════════════════════════════════════════════════════════════
  //  Caché (localStorage) — positivos 60 días, negativos 12 h, máx. 400
  // ════════════════════════════════════════════════════════════════════
  const NS = 'lirica.v1.';
  const mem = new Map();
  const cache = {
    key: (t) => `${norm(cleanTitle(t.title))}|${norm(primaryArtist(t.artist))}`,
    get(k) {
      if (mem.has(k)) return mem.get(k);
      try {
        const v = JSON.parse(localStorage.getItem(NS + k) || 'null');
        if (!v) return null;
        const ttl = v.d && v.d.found ? 60 * 864e5 : 12 * 36e5;
        if (Date.now() - v.t > ttl) return null;
        mem.set(k, v.d); return v.d;
      } catch (_) { return null; }
    },
    put(k, d) {
      mem.set(k, d);
      try {
        localStorage.setItem(NS + k, JSON.stringify({ t: Date.now(), d }));
        const idx = JSON.parse(localStorage.getItem(NS + '__idx') || '[]').filter((x) => x !== k);
        idx.push(k);
        while (idx.length > 400) localStorage.removeItem(NS + idx.shift());
        localStorage.setItem(NS + '__idx', JSON.stringify(idx));
      } catch (_) { /* almacenamiento lleno o bloqueado: seguimos sólo en memoria */ }
    },
    clear() { try { Object.keys(localStorage).filter((k) => k.startsWith(NS)).forEach((k) => localStorage.removeItem(k)); } catch (_) {} mem.clear(); },
  };

  // ════════════════════════════════════════════════════════════════════
  //  Cliente LRCLIB
  // ════════════════════════════════════════════════════════════════════
  const API = 'https://lrclib.net/api';

  /**
   * GET to LRCLIB. Returns parsed JSON or null ("nothing here").
   * Only a request that never got an answer (offline, DNS, CORS, timeout) counts as a
   * network failure; 4xx such as 400/404 simply mean "not found" for that strategy.
   */
  async function http(path, params, signal, stats) {
    const url = `${API}${path}?${new URLSearchParams(params)}`;
    for (let attempt = 0; attempt < 2; attempt++) {
      const ctl = new AbortController();
      const kill = setTimeout(() => ctl.abort(), 9000);
      const onAbort = () => ctl.abort();
      signal && signal.addEventListener('abort', onAbort, { once: true });
      try {
        const res = await fetch(url, { signal: ctl.signal });
        if (stats) stats.answered++;
        if (res.status === 429 || res.status === 503) { await new Promise((r) => setTimeout(r, 1500)); continue; }
        if (res.status >= 500 && attempt === 0) { await new Promise((r) => setTimeout(r, 800)); continue; }
        if (!res.ok) return null;
        return await res.json();
      } catch (e) {
        if (signal && signal.aborted) throw e;
        if (attempt === 1) { if (stats) stats.failed++; return null; }
        await new Promise((r) => setTimeout(r, 900));
      } finally { clearTimeout(kill); signal && signal.removeEventListener('abort', onAbort); }
    }
    return null;
  }

  class OfflineError extends Error { constructor() { super('LRCLIB unreachable'); this.name = 'OfflineError'; } }

  function score(c, want) {
    let s = similarity(c.trackName, want.title) * 4 + similarity(c.artistName, want.artist) * 2.5;
    if (c.syncedLyrics) s += 2; else if (c.instrumental) s += 0.5;
    if (want.duration && c.duration) {
      const d = Math.abs(c.duration - want.duration);
      s += d <= 2 ? 2 : d <= 5 ? 1 : d <= 10 ? 0 : -3;
    }
    return s;
  }

  function pickBest(list, want) {
    if (!Array.isArray(list) || !list.length) return null;
    const ranked = list.map((c) => ({ c, s: score(c, want) })).sort((a, b) => b.s - a.s);
    const best = ranked[0];
    return best && best.s >= 4 && similarity(best.c.trackName, want.title) >= 0.5 ? best.c : null;
  }

  function shape(c, how) {
    return {
      found: true, how, id: c.id,
      matched: { title: c.trackName, artist: c.artistName, album: c.albumName, duration: c.duration },
      instrumental: !!c.instrumental, synced: c.syncedLyrics || null, plain: c.plainLyrics || null,
    };
  }

  /**
   * Busca la letra de una pista. Estrategias en orden:
   * 1) get exacto (título/artista/álbum/duración)  2) get con metadatos limpios
   * 3) search por campos  4) search libre  5) "Artista - Título" en el título (vídeos)
   */
  async function find(track, signal) {
    const key = cache.key(track);
    const hit = cache.get(key);
    if (hit) return Object.assign({ cached: true }, hit);

    const dur = track.duration > 1 && track.duration <= 3600 ? Math.round(track.duration) : null; // LRCLIB accepts 1–3600 s
    const stats = { answered: 0, failed: 0 };
    const tTitle = cleanTitle(track.title); const tArtist = primaryArtist(track.artist);
    const want = { title: tTitle, artist: tArtist, duration: dur };
    const tried = new Set();
    const tryGet = async (p, how) => {
      const sig = JSON.stringify(p); if (tried.has(sig) || !p.track_name || !p.artist_name) return null;
      tried.add(sig);
      const r = await http('/get', p, signal, stats);
      return r && (r.syncedLyrics || r.plainLyrics || r.instrumental) ? shape(r, how) : null;
    };
    const trySearch = async (p, how, w = want) => {
      const sig = 's' + JSON.stringify(p); if (tried.has(sig)) return null; tried.add(sig);
      const best = pickBest(await http('/search', p, signal, stats), w);
      return best ? shape(best, how) : null;
    };

    const base = { track_name: track.title, artist_name: cleanArtist(track.artist) };
    let r =
      (dur && await tryGet(Object.assign({}, base, track.album ? { album_name: track.album } : {}, { duration: dur }), 'get-exact')) ||
      (dur && await tryGet({ track_name: tTitle, artist_name: tArtist, duration: dur }, 'get-clean')) ||
      await tryGet({ track_name: tTitle, artist_name: tArtist }, 'get-clean-nodur') ||
      await trySearch({ track_name: tTitle, artist_name: tArtist }, 'search-fields') ||
      await trySearch({ q: `${tArtist} ${tTitle}`.trim() }, 'search-q');

    // Vídeos con título "Artista - Canción" y artista = nombre del canal
    if (!r && / [-–—] /.test(track.title)) {
      const [a, ...rest] = track.title.split(/ [-–—] /);
      const t2 = cleanTitle(rest.join(' - ')); const a2 = primaryArtist(a);
      r = await tryGet({ track_name: t2, artist_name: a2 }, 'split-get') ||
          await trySearch({ track_name: t2, artist_name: a2 }, 'split-search', { title: t2, artist: a2, duration: dur });
    }

    // Prefiere sincronizada: si encontró sólo texto plano, intenta una búsqueda más
    if (r && !r.synced && !r.instrumental) {
      const alt = await trySearch({ q: `${tArtist} ${tTitle}`.trim() }, 'search-q-synced');
      if (alt && alt.synced) r = alt;
    }

    if (!r && stats.answered === 0 && stats.failed > 0) throw new OfflineError(); // never reached LRCLIB
    const result = r || { found: false };
    if (r || stats.failed === 0) cache.put(key, result); // don't remember "not found" if some requests failed
    return result;
  }

  LW.lyrics = { OfflineError, parseLRC, buildTimeline, activeIndex, find, cache, cleanTitle, primaryArtist, similarity };
})();
