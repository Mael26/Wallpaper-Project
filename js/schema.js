/*
 * Lírica — single source of truth for settings and fonts.
 * Used for: defaults, Wallpaper Engine project.json (tools/build-project-json.js),
 * URL params for browser preview, and css/fonts.css (tools/build-fonts-css.js).
 *
 * Groups: an entry with type 'group' becomes a checkbox header in Wallpaper Engine.
 * Every following setting is only shown while that header is ticked (collapsible).
 * Sliders are integers on purpose (fraction sliders misbehave in Wallpaper Engine).
 */
(function (root) {
  'use strict';

  // ── Fonts (all SIL OFL 1.1, bundled in /fonts) ──────────────────────────
  // kind: V = variable (wght range), S = single weight. ext: also has latin-ext file.
  const FONTS = [
    // key            label                         family                  file                   kind  weights     ext    scale
    ['inter',         'Sans · Inter',                'Inter',                'inter',               'V', '100 900',   true,  1],
    ['outfit',        'Sans · Outfit',               'Outfit',               'outfit',              'V', '100 900',   true,  1],
    ['spacegrotesk',  'Sans · Space Grotesk',        'Space Grotesk',        'space-grotesk',       'V', '300 700',   true,  1],
    ['syne',          'Sans · Syne',                 'Syne',                 'syne',                'V', '400 800',   false, 0.95],
    ['unbounded',     'Sans · Unbounded',            'Unbounded',            'unbounded',           'V', '200 900',   false, 0.86],
    ['bebas',         'Display · Bebas Neue',        'Bebas Neue',           'bebas-neue',          'S', '400',       true,  1.12],
    ['anton',         'Display · Anton',             'Anton',                'anton',               'S', '400',       false, 1.04],
    ['archivoblack',  'Display · Archivo Black',     'Archivo Black',        'archivo-black',       'S', '400',       false, 0.92],
    ['playfair',      'Serif · Playfair Display',    'Playfair Display',     'playfair-display',    'V', '400 900',   true,  1],
    ['fraunces',      'Serif · Fraunces',            'Fraunces',             'fraunces',            'V', '100 900',   true,  1],
    ['cinzel',        'Serif · Cinzel',              'Cinzel',               'cinzel',              'V', '400 900',   false, 0.95],
    ['cormorant',     'Serif · Cormorant Garamond',  'Cormorant Garamond',   'cormorant-garamond',  'V', '300 700',   false, 1.14],
    ['dmserif',       'Serif · DM Serif Display',    'DM Serif Display',     'dm-serif-display',    'S', '400',       false, 1.04],
    ['abrilfatface',  'Serif · Abril Fatface',       'Abril Fatface',        'abril-fatface',       'S', '400',       false, 1],
    ['imfell',        'Serif · IM Fell (old print)', 'IM Fell English',      'im-fell-english',     'S', '400',       false, 1.08],
    ['righteous',     'Retro · Righteous',           'Righteous',            'righteous',           'S', '400',       false, 1],
    ['shrikhand',     'Retro · Shrikhand (70s)',     'Shrikhand',            'shrikhand',           'S', '400',       false, 0.92],
    ['monoton',       'Retro · Monoton (neon)',      'Monoton',              'monoton',             'S', '400',       false, 0.85],
    ['bungee',        'Retro · Bungee',              'Bungee',               'bungee',              'S', '400',       false, 0.85],
    ['audiowide',     'Retro · Audiowide',           'Audiowide',            'audiowide',           'S', '400',       false, 0.9],
    ['orbitron',      'Retro · Orbitron (sci-fi)',   'Orbitron',             'orbitron',            'V', '400 900',   false, 0.86],
    ['lobster',       'Retro · Lobster',             'Lobster',              'lobster',             'S', '400',       false, 1.05],
    ['pacifico',      'Retro · Pacifico',            'Pacifico',             'pacifico',            'S', '400',       false, 0.92],
    ['pressstart',    'Pixel · Press Start 2P',      'Press Start 2P',       'press-start-2p',      'S', '400',       false, 0.6],
    ['vt323',         'Pixel · VT323 (terminal)',    'VT323',                'vt323',               'S', '400',       false, 1.3],
    ['silkscreen',    'Pixel · Silkscreen',          'Silkscreen',           'silkscreen',          'S', '400',       false, 0.8],
    ['pixelify',      'Pixel · Pixelify Sans',       'Pixelify Sans',        'pixelify-sans',       'V', '400 700',   false, 1.04],
    ['majormono',     'Pixel · Major Mono',          'Major Mono Display',   'major-mono-display',  'S', '400',       false, 0.8],
    ['rubikglitch',   'Pixel · Rubik Glitch',        'Rubik Glitch',         'rubik-glitch',        'S', '400',       false, 0.95],
    ['unifraktur',    'Gothic · UnifrakturMaguntia', 'UnifrakturMaguntia',   'unifrakturmaguntia',  'S', '400',       false, 1.08],
    ['unifrakturcook','Gothic · UnifrakturCook',     'UnifrakturCook',       'unifrakturcook',      'S7', '700',      false, 1.08],
    ['pirataone',     'Gothic · Pirata One',         'Pirata One',           'pirata-one',          'S', '400',       false, 1.12],
    ['grenze',        'Gothic · Grenze Gotisch',     'Grenze Gotisch',       'grenze-gotisch',      'V', '100 900',   false, 1.05],
    ['jacquard',      'Gothic · Jacquard 24 (pixel)','Jacquard 24',          'jacquard-24',         'S', '400',       false, 1.3],
    ['newrocker',     'Gothic · New Rocker',         'New Rocker',           'new-rocker',          'S', '400',       false, 1.05],
    ['metalmania',    'Gothic · Metal Mania',        'Metal Mania',          'metal-mania',         'S', '400',       false, 1.05],
    ['creepster',     'Horror · Creepster',          'Creepster',            'creepster',           'S', '400',       false, 1.1],
    ['nosifer',       'Horror · Nosifer',            'Nosifer',              'nosifer',             'S', '400',       false, 0.72],
    ['butcherman',    'Horror · Butcherman',         'Butcherman',           'butcherman',          'S', '400',       false, 0.9],
    ['eater',         'Horror · Eater',              'Eater',                'eater',               'S', '400',       false, 0.9],
    ['caveat',        'Hand · Caveat',               'Caveat',               'caveat',              'V', '400 700',   false, 1.18],
    ['permanentmarker','Hand · Permanent Marker',    'Permanent Marker',     'permanent-marker',    'S', '400',       false, 0.95],
    ['rocksalt',      'Hand · Rock Salt',            'Rock Salt',            'rock-salt',           'S', '400',       false, 0.75],
    ['dancingscript', 'Script · Dancing Script',     'Dancing Script',       'dancing-script',      'V', '400 700',   false, 1.12],
    ['greatvibes',    'Script · Great Vibes',        'Great Vibes',          'great-vibes',         'S', '400',       false, 1.25],
    ['jetbrains',     'Mono · JetBrains Mono',       'JetBrains Mono',       'jetbrains-mono',      'V', '100 800',   true,  0.95],
    ['spacemono',     'Mono · Space Mono',           'Space Mono',           'space-mono',          'S', '400',       false, 0.9],
  ].map(([key, label, family, file, kind, weights, ext, scale]) => ({ key, label, family, file, kind, weights, ext, scale }));

  const opt = (pairs) => pairs.map(([value, label]) => ({ value, label }));
  // Built-in animated scenes (js/scenes.js)
  const SCENES = [['synthwave', 'Synthwave'], ['nightsky', 'Night sky'], ['aurora', 'Aurora'], ['sakura', 'Sakura'], ['rain', 'Rain'],
    ['animesky', 'Anime sky'], ['neoncity', 'Neon city'], ['ocean', 'Ocean'], ['koi', 'Koi pond']];
  /*
   * One-click themes. A theme only fills settings the user left at their default value:
   * anything changed in the panel always wins over the theme.
   */
  const THEMES = {
    synthwave: { label: 'Synthwave karaoke', set: { mode: 'karaoke', font: 'audiowide', bgmode: 'scene', bgscene: 'synthwave', align: 'center', header: 'bc', area: 'top', anchor: 46, glow: 60, shadow: 60, clockstyle: 'retro' } },
    animefocus: { label: 'Anime sky', set: { mode: 'focus', focusanim: 'words', font: 'outfit', bgmode: 'scene', bgscene: 'animesky', area: 'left', backdrop: 'shadow', backdropstrength: 75, header: 'tr', clockstyle: 'bold', clockcard: 'glass' } },
    sakura: { label: 'Sakura script', set: { mode: 'focus', focusanim: 'words', font: 'dancingscript', fontweight: 700, fontsize: 130, bgmode: 'scene', bgscene: 'sakura', area: 'right', align: 'right', lyriccolor: 'song', colorsource: 'background', colorstrength: 90, shadow: 45, clockstyle: 'serif' } },
    minimalglass: { label: 'Minimal glass', set: { mode: 'scroll', font: 'inter', bgmode: 'cover', backdrop: 'glass', area: 'center', align: 'center', header: 'tc', clockstyle: 'thin', clockcard: 'glass' } },
    lofinight: { label: 'Lo-fi night', set: { mode: 'focus', focusanim: 'blur', font: 'cormorant', fontsize: 125, fontweight: 500, bgmode: 'scene', bgscene: 'nightsky', align: 'center', lyriccolor: 'song', colorsource: 'background', colorstrength: 55, clockstyle: 'stacked', clockpos: 'bl', greeting: 'auto' } },
    neonpixel: { label: 'Neon pixel', set: { mode: 'karaoke', font: 'pressstart', fontsize: 92, bgmode: 'scene', bgscene: 'neoncity', scenebrightness: 70, align: 'center', backdrop: 'shadow', backdropstrength: 90, shadow: 80, glow: 70, miniclock: 'tr', clockstyle: 'digital' } },
    gothic: { label: 'Gothic', set: { mode: 'karaoke', font: 'unifraktur', fontsize: 118, outline: 3, glow: 75, bgmode: 'ambient', align: 'center', header: 'bc', vignette: 70, clockstyle: 'gothic' } },
    minibar: { label: 'Mini bar', set: { mode: 'focus', focusanim: 'zoom', font: 'bebas', fontsize: 125, uppercase: true, align: 'center', bgmode: 'scene', bgscene: 'neoncity' } },
  };
  const MEDIA = "bgmode.value != 'cover' && bgmode.value != 'ambient' && bgmode.value != 'solid' && bgmode.value != 'scene'";
  const CORNERS = [['c', 'Center'], ['tl', 'Top left'], ['tc', 'Top center'], ['tr', 'Top right'], ['ml', 'Middle left'], ['mr', 'Middle right'], ['bl', 'Bottom left'], ['bc', 'Bottom center'], ['br', 'Bottom right']];

  /*
   * Panel layout (Wallpaper Engine shows settings in this order):
   *   1) Quick setup — always visible: the 4 things people change first.
   *   2) Groups — a checkbox header unfolds each one, ordered from most to least used.
   *      Inside each group: common settings first, fine-tuning last.
   */
  const SCHEMA = [
    // ── Quick setup (always visible) ─────────────────────────────────────
    { key: 'theme', label: 'Theme', type: 'combo', value: 'custom',
      options: [{ value: 'custom', label: 'None (my settings)' }].concat(Object.entries(THEMES).map(([value, t]) => ({ value, label: t.label }))) },
    { key: 'mode', label: 'Lyrics style', type: 'combo', value: 'scroll',
      options: opt([['scroll', 'Scroll'], ['karaoke', 'Karaoke'], ['focus', 'One line']]) },
    { key: 'font', label: 'Font', type: 'combo', value: 'inter',
      options: FONTS.map((f) => ({ value: f.key, label: f.label })).concat(opt([['system', 'System · Segoe UI'], ['custom', 'Installed font']])) },
    { key: 'bgmode', label: 'Background', type: 'combo', value: 'cover',
      options: opt([['cover', 'Album art (blurred)'], ['scene', 'Animated scene'], ['ambient', 'Gradient'], ['image', 'My image'], ['video', 'My video'], ['folder', 'Image folder'], ['solid', 'Solid color']]) },
    { key: 'bgscene', label: 'Scene', type: 'combo', value: 'synthwave', condition: "bgmode.value == 'scene'", options: opt(SCENES) },
    { key: 'bgimage', label: 'Image', type: 'file', fileType: 'image', value: '', condition: "bgmode.value == 'image'" },
    { key: 'bgvideo', label: 'Video', type: 'file', fileType: 'video', value: '', condition: "bgmode.value == 'video'" },
    { key: 'bgfolder', label: 'Image folder', type: 'directory', mode: 'ondemand', value: '', condition: "bgmode.value == 'folder'" },
    { key: 'bgcolor', label: 'Background color', type: 'color', value: '0.04 0.04 0.05', condition: "bgmode.value == 'solid'" },
    { key: 'language', label: 'Language', type: 'combo', value: 'auto', options: opt([['auto', 'Auto (system)'], ['en', 'English'], ['es', 'Español']]) },

    // ── Lyrics ─────────────────────────────────────────────────────────────
    { key: 'grplyrics', type: 'group', label: 'Lyrics options' },
    { key: 'focusanim', label: 'Line entrance', type: 'combo', value: 'rise', condition: "mode.value == 'focus'",
      options: opt([['rise', 'Rise'], ['fade', 'Fade'], ['blur', 'Blur'], ['zoom', 'Zoom'], ['words', 'Word by word'], ['typewriter', 'Typewriter']]) },
    { key: 'shownext', label: 'Show next line', type: 'bool', value: true, condition: "mode.value == 'focus'" },
    { key: 'align', label: 'Text alignment', type: 'combo', value: 'left',
      options: opt([['left', 'Left'], ['center', 'Center'], ['right', 'Right']]) },
    { key: 'nolyrics', label: 'When no lyrics', type: 'combo', value: 'clock',
      options: opt([['clock', 'Show clock'], ['background', 'Background only'], ['message', 'Show message']]) },
    { key: 'showbreaks', label: 'Instrumental breaks', type: 'bool', value: true },
    { key: 'breakstyle', label: 'Break marker', type: 'combo', value: 'font', condition: 'showbreaks.value == true',
      options: opt([['font', 'Font dots'], ['dots', 'Circles'], ['notes', 'Music notes'], ['bars', 'Equalizer']]) },
    { key: 'transition', label: 'Animation duration (ms)', type: 'slider', value: 600, min: 150, max: 1600 },
    { key: 'stagger', label: 'Wave effect', type: 'bool', value: true, condition: "mode.value != 'focus'" },
    { key: 'activescale', label: 'Current line size (%)', type: 'slider', value: 104, min: 100, max: 125 },
    { key: 'inactiveopacity', label: 'Other lines opacity (%)', type: 'slider', value: 32, min: 0, max: 90 },
    { key: 'distanceblur', label: 'Other lines blur', type: 'slider', value: 15, min: 0, max: 60 },

    // ── Text ───────────────────────────────────────────────────────────────
    { key: 'grptype', type: 'group', label: 'Text options' },
    { key: 'fontpreview', label: 'Preview all fonts', type: 'bool', value: false },
    { key: 'customfont', label: 'Installed font name', type: 'textinput', value: '', condition: "font.value == 'custom'" },
    { key: 'fontsize', label: 'Text size (%)', type: 'slider', value: 100, min: 40, max: 260 },
    { key: 'fontweight', label: 'Font weight', type: 'slider', value: 750, min: 100, max: 900 },
    { key: 'uppercase', label: 'Uppercase', type: 'bool', value: false },
    { key: 'lineheight', label: 'Line height (%)', type: 'slider', value: 122, min: 80, max: 200 },
    { key: 'linegap', label: 'Space between lines (%)', type: 'slider', value: 55, min: 0, max: 200 },
    { key: 'letterspacing', label: 'Letter spacing', type: 'slider', value: -1, min: -8, max: 30 },
    { key: 'glow', label: 'Glow', type: 'slider', value: 35, min: 0, max: 100 },
    { key: 'shadow', label: 'Shadow', type: 'slider', value: 25, min: 0, max: 100 },
    { key: 'outline', label: 'Outline width', type: 'slider', value: 0, min: 0, max: 10 },

    // ── Colors ─────────────────────────────────────────────────────────────
    { key: 'grpcolor', type: 'group', label: 'Color options' },
    { key: 'lyriccolor', label: 'Lyrics color', type: 'combo', value: 'solid',
      options: opt([['solid', 'Solid color'], ['song', 'Song colors'], ['gradient', 'Song gradient']]) },
    { key: 'textcolor', label: 'Text color', type: 'color', value: '1 1 1', condition: "lyriccolor.value == 'solid'" },
    { key: 'colorstrength', label: 'Color strength (%)', type: 'slider', value: 70, min: 0, max: 100, condition: "lyriccolor.value != 'solid'" },
    { key: 'adaptive', label: 'Auto highlight color', type: 'bool', value: true },
    { key: 'accentcolor', label: 'Highlight color', type: 'color', value: '0.55 0.85 1', condition: 'adaptive.value == false' },
    { key: 'colorsource', label: 'Take colors from', type: 'combo', value: 'album',
      options: opt([['album', 'Album art'], ['background', 'Background']]) },
    { key: 'outlinecolor', label: 'Outline color', type: 'color', value: '0 0 0' },

    // ── Background ─────────────────────────────────────────────────────────
    { key: 'grpbg', type: 'group', label: 'Background options' },
    { key: 'scenecolors', label: 'Scene colors', type: 'combo', value: 'scene', condition: "bgmode.value == 'scene'",
      options: opt([['scene', 'Original'], ['album', 'Album art']]) },
    { key: 'scenespeed', label: 'Scene speed (%)', type: 'slider', value: 100, min: 0, max: 300, condition: "bgmode.value == 'scene'" },
    { key: 'scenebrightness', label: 'Scene brightness (%)', type: 'slider', value: 90, min: 5, max: 100, condition: "bgmode.value == 'scene'" },
    { key: 'scenequality', label: 'Scene quality', type: 'combo', value: 'medium', condition: "bgmode.value == 'scene'",
      options: opt([['low', 'Low'], ['medium', 'Medium'], ['high', 'High']]) },
    { key: 'bginterval', label: 'Change every (min)', type: 'slider', value: 10, min: 1, max: 120, condition: "bgmode.value == 'folder'" },
    { key: 'bgfit', label: 'Image fit', type: 'combo', value: 'cover', condition: MEDIA,
      options: opt([['cover', 'Fill'], ['contain', 'Fit'], ['fill', 'Stretch'], ['none', 'Original size']]) },
    { key: 'mediabrightness', label: 'Image brightness (%)', type: 'slider', value: 80, min: 5, max: 100, condition: MEDIA },
    { key: 'mediablur', label: 'Image blur', type: 'slider', value: 0, min: 0, max: 100, condition: MEDIA },
    { key: 'mediatint', label: 'Album color tint (%)', type: 'slider', value: 0, min: 0, max: 100, condition: MEDIA },
    { key: 'bgposx', label: 'Image position X (%)', type: 'slider', value: 50, min: 0, max: 100, condition: MEDIA },
    { key: 'bgposy', label: 'Image position Y (%)', type: 'slider', value: 50, min: 0, max: 100, condition: MEDIA },
    { key: 'bgbrightness', label: 'Background brightness (%)', type: 'slider', value: 42, min: 5, max: 100, condition: "bgmode.value != 'image' && bgmode.value != 'folder' && bgmode.value != 'video' && bgmode.value != 'scene'" },
    { key: 'bgblur', label: 'Album art blur', type: 'slider', value: 55, min: 0, max: 100, condition: "bgmode.value == 'cover'" },
    { key: 'bgsaturation', label: 'Saturation (%)', type: 'slider', value: 140, min: 0, max: 250 },
    { key: 'bgmotion', label: 'Slow movement', type: 'bool', value: true },
    { key: 'vignette', label: 'Vignette', type: 'slider', value: 45, min: 0, max: 100 },
    { key: 'grain', label: 'Film grain', type: 'slider', value: 6, min: 0, max: 30 },

    // ── Layout ─────────────────────────────────────────────────────────────
    { key: 'grparea', type: 'group', label: 'Layout options' },
    { key: 'area', label: 'Lyrics area', type: 'combo', value: 'auto',
      options: opt([['auto', 'Auto'], ['full', 'Full screen'], ['left', 'Left half'], ['right', 'Right half'], ['center', 'Center'], ['top', 'Top half'], ['bottom', 'Bottom half'], ['custom', 'Custom']]) },
    { key: 'areax', label: 'Area X (%)', type: 'slider', value: 10, min: 0, max: 95, condition: "area.value == 'custom'" },
    { key: 'areay', label: 'Area Y (%)', type: 'slider', value: 15, min: 0, max: 95, condition: "area.value == 'custom'" },
    { key: 'areaw', label: 'Area width (%)', type: 'slider', value: 80, min: 10, max: 100, condition: "area.value == 'custom'" },
    { key: 'areah', label: 'Area height (%)', type: 'slider', value: 70, min: 10, max: 100, condition: "area.value == 'custom'" },
    { key: 'backdrop', label: 'Lyrics backdrop', type: 'combo', value: 'none',
      options: opt([['none', 'None'], ['shadow', 'Soft shadow'], ['glass', 'Frosted glass'], ['panel', 'Dark panel']]) },
    { key: 'backdropstrength', label: 'Backdrop strength (%)', type: 'slider', value: 60, min: 5, max: 100, condition: "backdrop.value != 'none'" },
    { key: 'backdropradius', label: 'Backdrop corners', type: 'slider', value: 24, min: 0, max: 80, condition: "backdrop.value != 'none' && backdrop.value != 'shadow'" },
    { key: 'anchor', label: 'Current line position (%)', type: 'slider', value: 42, min: 15, max: 80, condition: "mode.value != 'focus'" },
    { key: 'maxwidth', label: 'Text width (%)', type: 'slider', value: 90, min: 30, max: 100 },
    { key: 'edgefade', label: 'Edge fade (%)', type: 'slider', value: 14, min: 0, max: 35 },

    // ── Song info ──────────────────────────────────────────────────────────
    { key: 'grpinfo', type: 'group', label: 'Song info options' },
    { key: 'header', label: 'Info position', type: 'combo', value: 'tl',
      options: opt([['tl', 'Top left'], ['tc', 'Top center'], ['tr', 'Top right'], ['bl', 'Bottom left'], ['bc', 'Bottom center'], ['br', 'Bottom right'], ['hidden', 'Hidden']]) },
    { key: 'headersize', label: 'Info size (%)', type: 'slider', value: 100, min: 50, max: 220, condition: "header.value != 'hidden'" },
    { key: 'showcover', label: 'Show album art', type: 'bool', value: true, condition: "header.value != 'hidden'" },
    { key: 'showprogress', label: 'Show progress bar', type: 'bool', value: true, condition: "header.value != 'hidden'" },
    { key: 'showtime', label: 'Show time', type: 'bool', value: false, condition: "header.value != 'hidden'" },
    { key: 'cleantitles', label: 'Clean up titles', type: 'bool', value: true },

    // ── Clock & idle ───────────────────────────────────────────────────────
    { key: 'grpclock', type: 'group', label: 'Clock options' },
    { key: 'idle', label: 'When nothing plays', type: 'combo', value: 'clock',
      options: opt([['clock', 'Show clock'], ['blank', 'Background only']]) },
    { key: 'clockstyle', label: 'Clock style', type: 'combo', value: 'thin',
      options: opt([['thin', 'Thin'], ['bold', 'Bold'], ['outline', 'Outline'], ['stacked', 'Stacked'], ['serif', 'Serif'], ['digital', 'Digital (LCD)'], ['retro', 'Retro pixel'], ['gothic', 'Gothic'], ['lyricfont', 'Lyrics font']]) },
    { key: 'clocksize', label: 'Clock size (%)', type: 'slider', value: 100, min: 30, max: 300 },
    { key: 'clockpos', label: 'Clock position', type: 'combo', value: 'c', options: opt(CORNERS) },
    { key: 'clockcolor', label: 'Clock color', type: 'combo', value: 'text',
      options: opt([['text', 'Text color'], ['accent', 'Song color'], ['custom', 'Custom color']]) },
    { key: 'clockcustomcolor', label: 'Pick clock color', type: 'color', value: '1 0.85 0.6', condition: "clockcolor.value == 'custom'" },
    { key: 'clockcard', label: 'Clock backdrop', type: 'combo', value: 'none',
      options: opt([['none', 'None'], ['shadow', 'Soft shadow'], ['glass', 'Frosted glass'], ['panel', 'Dark panel']]) },
    { key: 'clock24', label: '24-hour clock', type: 'bool', value: true },
    { key: 'clockseconds', label: 'Show seconds', type: 'bool', value: false },
    { key: 'clockblink', label: 'Blinking colon', type: 'bool', value: true },
    { key: 'dateformat', label: 'Date format', type: 'combo', value: 'long',
      options: opt([['long', 'Long'], ['short', 'Short'], ['numeric', 'Numeric'], ['none', 'Hidden']]) },
    { key: 'greeting', label: 'Greeting', type: 'combo', value: 'none',
      options: opt([['none', 'None'], ['auto', 'By time of day'], ['custom', 'Custom text']]) },
    { key: 'greetingtext', label: 'Greeting text', type: 'textinput', value: '', condition: "greeting.value == 'custom'" },
    { key: 'lastplayed', label: 'Show song name', type: 'bool', value: true },
    { key: 'idlebg', label: 'Clock background', type: 'combo', value: 'same',
      options: opt([['same', 'Same as playing'], ['scene', 'Animated scene'], ['image', 'My image'], ['video', 'My video'], ['folder', 'Image folder'], ['solid', 'Solid color']]) },
    { key: 'idlescene', label: 'Clock scene', type: 'combo', value: 'nightsky', condition: "idlebg.value == 'scene'", options: opt(SCENES) },
    { key: 'idleimage', label: 'Clock image', type: 'file', fileType: 'image', value: '', condition: "idlebg.value == 'image'" },
    { key: 'idlevideo', label: 'Clock video', type: 'file', fileType: 'video', value: '', condition: "idlebg.value == 'video'" },
    { key: 'idlefolder', label: 'Clock image folder', type: 'directory', mode: 'ondemand', value: '', condition: "idlebg.value == 'folder'" },
    { key: 'idlecolor', label: 'Clock background color', type: 'color', value: '0.03 0.03 0.05', condition: "idlebg.value == 'solid'" },
    { key: 'idleblur', label: 'Background blur', type: 'slider', value: 0, min: 0, max: 100 },
    { key: 'idledim', label: 'Background dim (%)', type: 'slider', value: 20, min: 0, max: 90 },
    { key: 'idleafter', label: 'Clock after pause (min)', type: 'slider', value: 3, min: 0, max: 60 },
    { key: 'miniclock', label: 'Mini clock', type: 'combo', value: 'off',
      options: opt([['off', 'Off'], ['tl', 'Top left'], ['tr', 'Top right'], ['bl', 'Bottom left'], ['br', 'Bottom right']]) },

    // ── Sync ───────────────────────────────────────────────────────────────
    { key: 'grpsync', type: 'group', label: 'Sync options' },
    { key: 'syncoffset', label: 'Global offset (ms)', type: 'slider', value: 0, min: -3000, max: 3000 },
    { key: 'songsync', label: 'Per-song sync', type: 'combo', value: 'hover',
      options: opt([['hover', 'On hover'], ['off', 'Off']]) },
    { key: 'leadtime', label: 'Animation lead (ms)', type: 'slider', value: 200, min: 0, max: 800 },

    // ── Advanced ───────────────────────────────────────────────────────────
    { key: 'grpadv', type: 'group', label: 'Advanced options' },
    { key: 'onlinelookup', label: 'Search lyrics online', type: 'bool', value: true },
    { key: 'videominutes', label: 'Skip if longer than (min)', type: 'slider', value: 15, min: 0, max: 120 },
    { key: 'source', label: 'Music source', type: 'combo', value: 'auto',
      options: opt([['auto', 'Windows'], ['demo', 'Demo']]) },
    { key: 'debug', label: 'Debug panel', type: 'bool', value: false },
  ];

  // Assign each setting to the group header above it
  let current = null;
  SCHEMA.forEach((p) => { if (p.type === 'group') current = p.key; else p.group = current; });

  const DEFAULTS = Object.fromEntries(SCHEMA.filter((p) => p.type !== 'group').map((p) => [p.key, p.value]));

  const api = { SCHEMA, DEFAULTS, FONTS, SCENES, THEMES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LW = Object.assign(root.LW || {}, api);
})(typeof window !== 'undefined' ? window : globalThis);
