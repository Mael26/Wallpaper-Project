/*
 * Live settings. Sources (lowest to highest priority):
 *   1) schema defaults
 *   2) the selected one-click Theme (only for settings still at their default)
 *   3) URL params (?mode=focus&font=outfit) — browser preview
 *   4) Wallpaper Engine panel (applyUserProperties)
 * Must load early: Wallpaper Engine requires the listener to be registered at startup.
 */
(function () {
  'use strict';
  const LW = window.LW;
  const byKey = Object.fromEntries(LW.SCHEMA.map((p) => [p.key, p]));
  const values = Object.assign({}, LW.DEFAULTS); // what the user set (or the default)
  const listeners = new Set();
  const general = { fps: 0 };
  let paused = false;

  function coerce(def, raw) {
    if (raw == null) return def.value;
    switch (def.type) {
      case 'slider': { const n = Number(raw); return Number.isFinite(n) ? n : def.value; }
      case 'bool': return raw === true || raw === 'true' || raw === '1' || raw === 1;
      case 'file': case 'directory': return raw ? String(raw) : '';
      default: return String(raw);
    }
  }

  /** Effective value: a theme fills in only what the user left at the default. */
  function get(k) {
    const v = values[k];
    const theme = LW.THEMES && LW.THEMES[values.theme];
    if (theme && k in theme.set && v === LW.DEFAULTS[k]) return theme.set[k];
    return v;
  }
  const all = () => Object.fromEntries(Object.keys(values).map((k) => [k, get(k)]));

  function set(patch, origin) {
    const before = all();
    for (const [k, raw] of Object.entries(patch)) {
      const def = byKey[k];
      if (!def || def.type === 'group') continue; // group headers only fold the WE panel
      values[k] = coerce(def, raw);
    }
    const after = all(); const changed = {};
    for (const k of Object.keys(after)) if (after[k] !== before[k]) changed[k] = after[k];
    if (Object.keys(changed).length) listeners.forEach((fn) => fn(changed, origin));
  }

  // URL
  try {
    const qs = new URLSearchParams(location.search);
    const patch = {};
    qs.forEach((v, k) => { if (byKey[k]) patch[k] = v; });
    set(patch, 'url');
  } catch (_) { /* no valid URL */ }

  // Wallpaper Engine
  window.wallpaperPropertyListener = {
    applyUserProperties(props) {
      const patch = {};
      for (const [k, p] of Object.entries(props)) if (p && 'value' in p) patch[k] = p.value;
      set(patch, 'we');
    },
    applyGeneralProperties(props) {
      if (props.fps != null) { general.fps = Number(props.fps) || 0; listeners.forEach((fn) => fn({ __fps: general.fps }, 'we')); }
    },
    setPaused(isPaused) {
      paused = !!isPaused;
      listeners.forEach((fn) => fn({ __paused: paused }, 'we'));
    },
  };

  // Colour helper: "r g b" (0..1) → [r, g, b] 0..255
  function weColorToRgb(str, fallback) {
    const parts = String(str || '').trim().split(/\s+/).map(Number);
    if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return fallback || [255, 255, 255];
    return parts.slice(0, 3).map((n) => Math.round(Math.min(1, Math.max(0, n)) * 255));
  }

  LW.config = {
    get, all,
    set: (patch) => set(patch, 'code'),
    onChange: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    get fps() { return general.fps; },
    get paused() { return paused; },
    weColorToRgb,
  };
})();
