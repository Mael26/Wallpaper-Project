# Lírica — wallpaper de letras sincronizadas

Wallpaper web para **Wallpaper Engine** que muestra la letra sincronizada de lo que suena en tu PC, con cualquier reproductor que aparezca en los controles multimedia de Windows (Spotify, YouTube Music en app o navegador, YTMDesktop, Apple Music, Tidal…).

```
Reproductor ──► Windows (SMTC) ──► Wallpaper Engine ──► Lírica ──► LRCLIB (letra .lrc)
                                   título · artista ·             caché local
                                   portada · posición
```

## Instalación

1. **Activa la integración multimedia** en Wallpaper Engine: *Ajustes → General → Media integration support*.
2. **Enlaza la carpeta** a los proyectos de Wallpaper Engine (cada cambio se ve al recargar). En `cmd`:
   ```bat
   mklink /J "C:\Program Files (x86)\Steam\steamapps\common\wallpaper_engine\projects\myprojects\lirica" "C:\Wallpaper Project\lyrics-wallpaper"
   ```
   Ajusta la ruta de Steam si la tienes en otro disco. Alternativa: *Abrir wallpaper → Abrir desde archivo* → `index.html`.
3. Elige el monitor (Hagibis) y selecciona «Lírica» en *Instalados*.
4. Recomendado: *Ajustes → Rendimiento → Otra aplicación en pantalla completa → Seguir ejecutando*, para que la letra no se congele mientras juegas en el monitor principal.

## Ajustes (panel de Wallpaper Engine)

Arriba, siempre visibles, están los ajustes que más se cambian: **Tema**, **Estilo de letra**, **Fuente**, **Fondo** (y, según el fondo, la escena, la imagen, el video o la carpeta) e **Idioma**. Debajo vienen los grupos («Opciones de letra», «Opciones de fondo»…): **marca la casilla de un grupo para desplegarlo**. Dentro de cada grupo lo más usado va primero y el ajuste fino al final. Los sliders aceptan escribir el valor exacto.

El panel sale **en el idioma de la interfaz de Wallpaper Engine** (*Ajustes → General → Idioma*): en español si está en español y en inglés en cualquier otro idioma (localización `en-us` / `es-es`; para otros idiomas Wallpaper Engine usa el inglés). Aquí se usan los nombres en español. Los textos del wallpaper (reloj, avisos) siguen *Idioma*: *Automático (sistema)* usa español si Windows está en español e inglés en cualquier otro caso.

Los nombres tienen 2–4 palabras, sin iconos, y dicen a qué afectan («Brillo de escena», «Tamaño del reloj»).

### Temas en un clic

*Tema* aplica un estilo completo (fuente, estilo, fondo, posición, reloj): Karaoke synthwave, Cielo anime, Sakura caligráfico, Vidrio minimalista, Noche lo-fi, Neón pixel, Gótico y Mini barra (para pantallas 1920×480). **Solo rellena lo que dejaste por defecto**: si ya cambiaste la fuente, el tema respeta tu fuente y cambia el resto. *Ninguno (mis ajustes)* lo desactiva. Wallpaper Engine no puede mover los controles del panel, así que los valores del tema no se ven reflejados en ellos; para guardar tu propia combinación usa los *presets* de Wallpaper Engine.

| Grupo | Qué controla |
|---|---|
| **Opciones de letra** | Entrada de la línea en estilo *Una línea* (Subir, Fundido, Desenfoque, Zoom, Por palabras, Tecleo), siguiente línea, alineación, **qué mostrar sin letra** (reloj, fondo o mensaje), pausas instrumentales y su marca, duración de la animación, efecto ola, tamaño de la línea actual, opacidad y desenfoque de las otras líneas |
| **Opciones de texto** | Ver fuentes en pantalla, nombre de una fuente instalada, tamaño, grosor, mayúsculas, interlineado (dentro de un verso largo), separación (entre versos), espaciado, resplandor, sombra y contorno |
| **Opciones de color** | Color de letra (*Fijo*, *Canción*, *Degradado*), intensidad, resaltado automático (karaoke y barra) o fijo, origen del color (portada o fondo) y color de contorno |
| **Opciones de fondo** | Detalles del fondo elegido arriba: colores, velocidad, brillo y calidad de la escena; intervalo de la carpeta; ajuste, brillo, desenfoque, tinte y posición X/Y de imagen/video; saturación, movimiento, viñeta y grano |
| **Opciones de posición** | Zona de letra (Auto, Completa, mitades, Centro o Personalizada con X/Y/ancho/alto), fondo del texto (sombra, vidrio, panel) con intensidad y esquinas, posición vertical de la línea actual, ancho del texto y difuminado de los bordes |
| **Opciones de canción** | Posición (6 opciones u oculto), tamaño, portada, barra de progreso, tiempo y limpiar títulos |
| **Opciones de reloj** | Qué mostrar sin música, estilo/tamaño/posición/color del reloj, fondo del texto, 24 horas, segundos, parpadeo, fecha, saludo, nombre de canción, fondo propio de la pantalla del reloj (escena, imagen, video, carpeta o color) con desenfoque y oscurecido, reloj tras pausa (min, 0 = nunca) y reloj mini mientras suena música |
| **Opciones de sincronía** | Desfase global (ms, + = antes), botones de sincronía por canción y anticipación de la animación |
| **Opciones avanzadas** | Letras en línea (sí/no), duración máxima a partir de la cual no se busca letra (min, 0 = buscar siempre), origen (Windows o demo) y panel de diagnóstico |

## Primera vez: integración multimedia

Si la integración multimedia de Wallpaper Engine está apagada, el wallpaper no puede saber qué suena. En vez de una línea de texto aparece una **tarjeta con los 4 pasos** (en tu idioma, con el otro idioma debajo): *Wallpaper Engine → Ajustes → General → Media integration support*. Desaparece sola en cuanto se activa.

## Videos, podcasts y canciones sin letra

Si lo que suena no tiene letra (un video de YouTube, un podcast, una canción instrumental o no está en LRCLIB), por defecto se muestra **el reloj con «Sonando: título — canal»** sobre el fondo, con el mismo estilo y fondo del reposo. Se puede cambiar en *Opciones de letra → Si no hay letra*. Lo que dura más de 15 minutos se trata como video y ni se busca (*Opciones avanzadas → Omitir si dura más de*). Si LRCLIB no responde, también se muestra el reloj y se reintenta cada 30 s.

Debajo del reloj aparece unos segundos, en pequeño, **el motivo**: no está en LRCLIB, es instrumental, se trató como video por su duración, no hubo conexión o la búsqueda en línea está desactivada.

## Desfase por canción

Si una canción concreta va adelantada o atrasada, **deja el ratón quieto medio segundo sobre el título de la canción** (con el escritorio visible): aparece debajo una barra con `−0.5 −0.1 [valor] +0.1 +0.5 ⟲`. Mover el ratón por el resto del escritorio no la muestra; se oculta 2,5 s después de salir. Si ocultaste la información de la canción, la zona activa es el borde inferior central.

- `+` adelanta la letra y `−` la retrasa.
- El ajuste se guarda **solo para esa canción** (por título y artista) y se aplica sola cada vez que vuelva a sonar. ⟲ lo borra.
- Se suma al *Desfase global* de **Opciones de sincronía**.
- Al dejar el ratón sobre cada botón aparece qué hace («Letra 0,5 s antes», «Letra 0,1 s más tarde»…).
- Si bajo el artista aparece **«Sincronía estimada»**, ese reproductor no está publicando la posición en Windows: Lírica calcula el tiempo desde el cambio de canción, así que si adelantas o retrocedes la canción la letra no se entera. No es un fallo del wallpaper; con la posición real el aviso desaparece solo.

Si la barra no responde, revisa que Wallpaper Engine deje pasar el ratón al wallpaper y que no haya una ventana encima.

## Privacidad

- Para buscar la letra, Lírica envía a **lrclib.net** el título, el artista, el álbum y la duración de lo que suena. Nada más: sin cuentas, sin analíticas, sin cookies de terceros.
- Las letras, los desfases por canción y la última canción se guardan **solo en tu PC** (almacenamiento local del wallpaper).
- *Opciones avanzadas → Buscar letras en línea* = desactivado corta toda conexión: el wallpaper queda como reloj/fondo con la información de la canción.

## Previews para el Workshop

En `C:\Wallpaper Project\workshop\` están las capturas (1920×1080, una barra 1920×480 y una vertical), un collage con etiquetas (`00-overview.jpg`), un video de 31 s (`showcase-1280x720.mp4`), un GIF corto y el texto de descripción en inglés/español. La miniatura animada del wallpaper es `preview.gif` (256×256, < 500 KB, lo que pide Wallpaper Engine).

## Probar sin Wallpaper Engine

Abre `index.html` en Chrome/Edge: arranca en **modo demo** con una letra de relleno. Cualquier ajuste se puede pasar por URL con su clave (ver `js/schema.js`):

- `index.html?mode=focus&font=unifraktur&align=center`
- `index.html?title=NOMBRE&artist=ARTISTA&duration=215` — busca la letra real en LRCLIB y simula la reproducción.
- `index.html?t=40` — empieza la demo en el segundo 40.

## Diagnóstico

- *Opciones avanzadas → Panel de diagnóstico*: fuente, si llega la posición de reproducción, cómo se encontró la letra, desfases y últimos eventos.
- Consola del wallpaper: *Ajustes → General → CEF devtools port* = `8080`, abre `localhost:8080` en Chrome y elige el wallpaper.
- **«timeline: NO»** → ese reproductor no publica la posición en Windows; Lírica estima el tiempo desde el cambio de canción.
- **La canción no aparece** → el reproductor debe salir en el control multimedia de Windows y no estar en la *Media blocklist* de Wallpaper Engine.
- **«Letra no disponible»** → LRCLIB no la tiene (se recuerda 12 h para no saturar la API).
- **El panel sale con textos `ui_lirica_…`** → esa versión de Wallpaper Engine no aplicó la localización; avísame y se vuelve a texto plano en `tools/build-project-json.js`.

## Estructura

```
index.html                 página del wallpaper
project.json               panel de ajustes de Wallpaper Engine (generado)
preview.gif                miniatura animada
css/style.css              estilos (variables controladas por los ajustes)
css/fonts.css              @font-face locales (generado)
fonts/                     47 fuentes woff2 (SIL OFL 1.1)
js/schema.js               fuente única: ajustes, grupos, temas y lista de fuentes
js/config.js               ajustes en vivo (Wallpaper Engine / URL / tema)
js/core.js                 bus de eventos, registro y reloj de reproducción
js/sources/wallpaper-engine.js   integración multimedia de Windows vía WE
js/sources/demo.js         canción de demostración
js/lyrics.js               parser LRC, limpieza de títulos, cliente LRCLIB, caché
js/scenes.js               escenas animadas (canvas, arte procedural)
js/background.js           fondos, fondo del reposo, slideshow y paletas de color
js/renderer.js             modos Scroll / Karaoke / Focus
js/app.js                  orquestador, reloj/reposo, zona de letra, desfase por canción
tools/build-project-json.js   regenera project.json desde schema.js (con localización en/es)
tools/panel-es.json        traducciones al español de los textos del panel
tools/build-fonts-css.js      regenera css/fonts.css desde schema.js
```

Para añadir un ajuste: defínelo en `js/schema.js` (debajo del grupo que corresponda), añade su traducción a `tools/panel-es.json`, úsalo en `app.js`/`renderer.js`/CSS y ejecuta `node tools/build-project-json.js`. Un texto sin traducción se queda en inglés en ambos idiomas. Para añadir una fuente: copia el `.woff2` a `fonts/`, añádela a `FONTS` en `schema.js` y ejecuta los dos scripts de `tools/`.

## Detalles técnicos

- **Reloj de reproducción:** Windows entrega la posición de forma esporádica (a veces en segundos enteros). Entre muestras se extrapola; las correcciones pequeñas nunca hacen retroceder el tiempo, y la línea activa tiene histéresis: solo vuelve atrás si de verdad retrocediste la canción.
- **Scroll sin solapes:** la ola empieza siempre por el lado hacia el que se mueve el texto, y las posiciones se vuelven a medir automáticamente cuando cambia el tamaño de la letra (fuente nueva, interlineado, tamaño…).
- **Búsqueda en LRCLIB en cascada:** exacta con duración → título/artista limpios → búsqueda por campos con ranking por similitud y duración → búsqueda libre → títulos «Artista - Canción». Prefiere letra sincronizada. Caché de 60 días.
- **Rendimiento:** el fondo difuminado se pinta una vez por canción; por frame solo se mueven `transform`. Respeta el límite de FPS y la pausa de Wallpaper Engine.
