/*
 * Fuente demo: simula una canción para diseñar sin música sonando.
 * - En navegador (fuera de Wallpaper Engine) se activa sola.
 * - En Wallpaper Engine: Avanzado → Fuente de música → Demo.
 * - Probar una canción real (busca la letra en LRCLIB):
 *     index.html?title=Nombre&artist=Artista&duration=215
 * La letra de demo es texto original de relleno, no pertenece a ninguna canción.
 */
(function () {
  'use strict';
  const LW = window.LW;
  const qs = new URLSearchParams(location.search);

  const DEMO_LRC = [
    '[00:00.00]',
    '[00:04.20]Esta es la línea de prueba número uno',
    '[00:08.40]El texto se desliza cuando cambia el tiempo',
    '[00:12.60]La línea activa brilla y las demás se apagan',
    '[00:16.80]Cambia la fuente, el tamaño y el color',
    '[00:21.00]Todo se ajusta desde Wallpaper Engine',
    '[00:25.20]',
    '[00:31.50]Después de una pausa vuelven las palabras',
    '[00:35.70]Con acentos y eñes: canción, corazón, mañana',
    '[00:39.90]Una línea bastante más larga que las anteriores para comprobar cómo se parte en dos renglones',
    '[00:46.00]Corta',
    '[00:48.20]Y el fondo respira con la portada del álbum',
    '[00:52.40]Fin de la demostración, vuelve a empezar',
  ].join('\n');
  LW.DEMO_LRC = DEMO_LRC;

  function makeCover() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 256, 256);
    grad.addColorStop(0, '#ff5f6d'); grad.addColorStop(0.5, '#845ef7'); grad.addColorStop(1, '#22b8cf');
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
    g.globalAlpha = 0.35; g.fillStyle = '#fff';
    for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(60 + i * 38, 190 - i * 24, 18 + i * 9, 0, Math.PI * 2); g.fill(); }
    return c.toDataURL('image/png');
  }

  let timer = null;
  function start() {
    if (timer) return;
    const custom = qs.get('title');
    const duration = Number(qs.get('duration')) || (custom ? 240 : 57);
    const track = custom
      ? { title: custom, artist: qs.get('artist') || '', album: qs.get('album') || '', duration }
      : { title: 'Canción de demostración', artist: 'Lírica', album: 'Demo', demoLrc: DEMO_LRC, duration };
    const startAt = performance.now() - (Number(qs.get('t')) || 0) * 1000;
    LW.bus.emit('track', track);
    LW.bus.emit('cover', { src: makeCover() });
    LW.bus.emit('playback', 'playing');
    const tick = () => {
      const pos = ((performance.now() - startAt) / 1000) % duration;
      LW.bus.emit('timeline', { position: pos, duration });
    };
    tick();
    timer = setInterval(tick, 1000);
    LW.log('info', 'Fuente demo activa');
  }
  function stop() { clearInterval(timer); timer = null; }

  LW.demoSource = { start, stop, get running() { return !!timer; } };
})();
