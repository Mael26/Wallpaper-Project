/*
 * Núcleo: bus de eventos con "último valor" y reloj de reproducción interpolado.
 */
(function () {
  'use strict';
  const LW = window.LW;

  // ── Bus: los eventos de las fuentes pueden llegar antes de que la app arranque;
  //    se guarda el último valor de cada tipo y se re-emite al suscribirse.
  const subs = new Map();
  const last = new Map();
  LW.bus = {
    emit(type, payload) {
      last.set(type, payload);
      (subs.get(type) || []).forEach((fn) => { try { fn(payload); } catch (e) { LW.log && LW.log('error', type, e); } });
    },
    on(type, fn, replay = true) {
      if (!subs.has(type)) subs.set(type, []);
      subs.get(type).push(fn);
      if (replay && last.has(type)) fn(last.get(type));
    },
  };

  // ── Registro para el panel de diagnóstico
  const logBuf = [];
  LW.log = function (level, ...args) {
    const msg = args.map((a) => (a instanceof Error ? a.message : typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    logBuf.push(`${new Date().toLocaleTimeString()} ${level.toUpperCase()} ${msg}`);
    if (logBuf.length > 40) logBuf.shift();
    if (level === 'error') console.error('[Lírica]', ...args); else console.log('[Lírica]', ...args);
  };
  LW.logLines = () => logBuf.slice(-12);

  /*
   * Reloj de reproducción.
   * Windows (SMTC) entrega la posición de forma esporádica: a veces cada segundo,
   * a veces sólo al buscar o pausar, y algunas apps la redondean a segundos enteros.
   * Entre muestras se extrapola con performance.now() y las correcciones pequeñas
   * se absorben suavemente para que la letra no "salte".
   */
  class PlaybackClock {
    constructor() { this.reset(0); this.playing = false; this.rate = 1; }

    reset(pos = 0) {
      this.basePos = pos; this.baseTime = performance.now();
      this.samples = []; this.hasTimeline = false; this.lastSample = 0;
      this.floor = -Infinity;
    }

    /** Never goes backwards for small corrections (avoids lyrics bouncing back and forth);
     *  only a real seek/track change (snap) can move time back. */
    now() {
      let v = this.playing ? this.basePos + ((performance.now() - this.baseTime) / 1000) * this.rate : this.basePos;
      if (this.playing && v < this.floor) v = this.floor;
      this.floor = v;
      return v;
    }

    setPlaying(playing) {
      if (playing === this.playing) return;
      const pos = this.now();
      this.playing = playing; this.basePos = pos; this.baseTime = performance.now(); this.floor = -Infinity;
    }

    /** Muestra de posición proveniente de la fuente. */
    sync(pos, { hard = false } = {}) {
      const t = performance.now();
      this.samples.push(pos); if (this.samples.length > 6) this.samples.shift();
      const quantized = this.samples.length >= 4 && this.samples.every((p) => Math.abs(p - Math.round(p)) < 1e-3);
      const predicted = this.now();
      const diff = pos - predicted;
      this.lastSample = t;

      if (hard || !this.hasTimeline || Math.abs(diff) > 1.5) {
        this.basePos = pos; this.baseTime = t; this.floor = -Infinity;
      } else if (quantized) {
        // Posición truncada a segundos: el valor real está en [pos, pos+1).
        if (diff > 0) { this.basePos = pos; this.baseTime = t; }          // vamos atrasados
        else if (diff < -1.05) { this.basePos = pos + 0.5; this.baseTime = t; this.floor = -Infinity; } // muy adelantados
      } else if (Math.abs(diff) > 0.04) {
        this.basePos = predicted + diff * 0.4; this.baseTime = t;          // corrección suave
      }
      this.hasTimeline = true;
    }
  }
  LW.PlaybackClock = PlaybackClock;

  LW.fmtTime = (s) => {
    if (!Number.isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60); const r = Math.floor(s % 60);
    return `${m}:${String(r).padStart(2, '0')}`;
  };
})();
