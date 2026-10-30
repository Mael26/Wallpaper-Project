/*
 * Fuente: integración de medios de Wallpaper Engine.
 * Lee lo que Windows publica en sus controles multimedia (SMTC), así que sirve
 * con Spotify, YouTube Music (app o navegador), Apple Music, Tidal, foobar…
 * Wallpaper Engine pide registrar estos listeners de inmediato, no en onload.
 */
(function () {
  'use strict';
  const LW = window.LW;
  const W = window;
  const available = typeof W.wallpaperRegisterMediaPropertiesListener === 'function';
  const lastState = new Map();

  const MI = W.wallpaperMediaIntegration || {};
  const PB = MI.playback || {};
  const PLAYING = MI.PLAYBACK_PLAYING ?? PB.PLAYING ?? 1;
  const PAUSED = MI.PLAYBACK_PAUSED ?? PB.PAUSED ?? 2;
  const STOPPED = MI.PLAYBACK_STOPPED ?? PB.STOPPED ?? 0;

  const active = () => LW.config.get('source') !== 'demo';
  const emit = (type, payload) => { lastState.set(type, payload); if (active()) LW.bus.emit(type, payload); };

  LW.weSource = {
    available,
    /** Re-emite el último estado conocido (al volver del modo demo). */
    replay() { ['track', 'cover', 'playback', 'timeline'].forEach((t) => { if (lastState.has(t)) LW.bus.emit(t, lastState.get(t)); }); },
    get hasData() { return lastState.has('track'); },
  };
  if (!available) return;

  try {
    W.wallpaperRegisterMediaStatusListener && W.wallpaperRegisterMediaStatusListener((e) => {
      LW.log('info', 'integración de medios', e && e.enabled ? 'activa' : 'desactivada');
      LW.bus.emit('source-status', { name: 'Wallpaper Engine', enabled: !!(e && e.enabled) });
    });

    W.wallpaperRegisterMediaPropertiesListener((e) => {
      if (!e) return;
      if (e.contentType && e.contentType !== 'music' && e.contentType !== 'video') return;
      const title = (e.title || '').trim();
      const artist = (e.artist || e.albumArtist || '').trim();
      LW.log('info', 'pista:', title, '—', artist);
      emit('track', title ? { title, artist, album: (e.albumTitle || '').trim() } : null);
    });

    W.wallpaperRegisterMediaThumbnailListener((e) => {
      if (!e) return;
      emit('cover', e.thumbnail ? {
        src: e.thumbnail,
        colors: { primary: e.primaryColor, secondary: e.secondaryColor, tertiary: e.tertiaryColor, text: e.textColor },
      } : null);
    });

    W.wallpaperRegisterMediaPlaybackListener((e) => {
      const s = e && e.state;
      emit('playback', s === PLAYING ? 'playing' : s === PAUSED ? 'paused' : s === STOPPED ? 'stopped' : 'paused');
    });

    W.wallpaperRegisterMediaTimelineListener && W.wallpaperRegisterMediaTimelineListener((e) => {
      if (!e || !Number.isFinite(e.position)) return;
      emit('timeline', { position: e.position, duration: Number.isFinite(e.duration) ? e.duration : 0 });
    });
  } catch (err) {
    LW.log('error', 'No se pudo registrar la integración de medios', err);
  }
})();
