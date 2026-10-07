# Editor de píxel art

Vanilla JS (ES modules), sin dependencias. Canvas 2D. También se puede
ejecutar como app de escritorio con Electron (`npm start`) — ver sección
"App de escritorio" más abajo.

## Arquitectura
- El estado vive en arrays de píxeles (Uint8ClampedArray, RGBA).
- El canvas es solo salida: se re-renderiza componiendo capas.
- imageSmoothingEnabled = false SIEMPRE (si no, los píxeles salen borrosos).
- Las herramientas son módulos con la misma interfaz: onPointerDown/Move/Up.
  Opcional: `getPreview()` (forma en curso) y `getCursor(context, x, y)` →
  `{ cells, color }`, la huella que se dibuja bajo el puntero al pasar por el
  lienzo (`color: null` = solo contorno, p. ej. la goma). Mover el puntero sin
  dibujar solo repinta el lienzo (`renderCanvas` en main.js), no los paneles.
- Toda mutación del documento pasa por el sistema de comandos (undo/redo).
  Nada modifica píxeles directamente desde la UI.
- Contrato de comando (core/history.js): objeto { do(target), undo(target) }.
  execute(history, target, command) lo aplica y limpia la pila de redo. Cada
  entrada del historial guarda su `target` (el doc de un fotograma o el
  proyecto entero), así que undo(history)/redo(history) no necesitan nada más y
  devuelven el target afectado (main.js lo usa para saltar al fotograma que cambió).
- **Un único historial por proyecto** (`project.history`), no uno por fotograma:
  mezcla trazos de distintos fotogramas con cambios de estructura (capas,
  fotogramas, tamaño) y los deshace en orden. Es lo que hace seguro deshacer
  después de redimensionar (los comandos antiguos guardan el ancho de entonces;
  con un solo historial LIFO siempre se deshace antes el redimensionado).
- Un "frame" (core/project.js) es solo { doc }. `main.js` siempre opera sobre
  `getActiveFrame(project)`.
- **Todos los fotogramas comparten la misma estructura de capas** (número,
  nombre, visibilidad, opacidad, capa activa); solo cambian los píxeles. Los
  cambios de capas desde la UI usan los comandos de proyecto
  (`createProjectAddLayerCommand`, `...RemoveLayer...`, etc.), que aplican el
  comando de doc de core/document.js a todos los fotogramas a la vez. Los
  proyectos guardados con el modelo antiguo se igualan al cargar
  (`normalizeLayerStructure`).
- Un trazo de lápiz/goma (pointerdown → pointerup) es UN comando: se registra al
  empezar y va acumulando celdas (`stroke.paint`), interpolando con lineCells
  entre eventos de movimiento para no dejar huecos.
- `getDoc`/`getHistory`/`getZoom` que se pasan a `ui/interaction.js` son siempre
  funciones (no valores), precisamente para poder cambiar de fotograma o de zoom
  sin tener que tocar ni las herramientas ni el binding de eventos de puntero.
- `main.js` es solo el punto de composición: busca elementos del DOM, crea cada
  subsistema de `ui/` (sidebar, zoom, color, herramientas, capas, timeline,
  exportar...) y los conecta con un único `redraw()`. Cada subsistema sigue el
  mismo patrón `createX(elementos, opciones) → API` (normalmente getters) que
  ya usaban `ui/palette.js`/`ui/toolbar.js`. Si `main.js` empieza a crecer otra
  vez, el sitio para meter la lógica nueva es un módulo de `ui/`, no el propio
  `main.js`.
- Orden de inicialización importante: `ui/sidebarDock.js` debe crearse (y
  restaurar su estado) antes que `ui/zoomControls.js`, porque el zoom de ajuste
  depende del hueco que deja la sidebar en pantalla.
- Hay varios proyectos guardados en paralelo (`ui/storage.js`): un índice
  `pixel-editor.projects` + los datos de cada uno bajo `pixel-editor.project.<id>`.
  `main.js` mantiene `project` como una referencia **estable** que nunca se
  reasigna — cambiar de proyecto activo muta ese mismo objeto en el sitio
  (`core/project.js#applyProjectData`) precisamente para no tener que tocar los
  módulos que ya leen `project` por referencia (`zoomControls`, `timeline`,
  `exportControls`, `canvasResizeControls`).

## Estructura
/core     -> document.js (composeLayers/blendOver + comandos de capas de un doc:
             añadir/quitar/mover/ocultar/renombrar/opacidad/fundir hacia abajo),
             layer.js (+ resizeLayerPixels), history.js, color.js, shapes.js
             (geometría pura: línea/rectángulo/elipse, rellenos, ajustes con Shift),
             mirror.js (reflejo de celdas para dibujo con espejo), region.js
             (copiar/pegar/rellenar/borrar/voltear un rectángulo de la selección),
             project.js (fotogramas, capas compartidas y comandos de proyecto
             deshacibles: capas, fotogramas, redimensionar), serialize.js
             (proyecto <-> JSON con píxeles en RLE + base64; también lee el
             formato antiguo sin RLE), gif.js (codificador GIF89a propio: paleta,
             LZW, transparencia, bucle)
/tools    -> pencil.js, eraser.js, bucket.js, paintTool.js (trazo compartido por lápiz y goma),
             shapeTool.js (motor compartido por line.js/rectangle.js/ellipse.js),
             eyedropper.js, selection.js (selección rectangular + mover)
/ui       -> canvas.js, interaction.js, icons.js, tooltip.js, theme.css (tema neumórfico:
             un solo color de superficie --bg + sombras claras/oscuras; claro por
             defecto, oscuro vía data-theme="dark"), themeToggle.js (botón claro/oscuro),
             palette.js, colorPicker.js, colorControls.js (junta las dos anteriores + persistencia),
             toolbar.js, toolSetup.js (herramientas + atajos + botón de borrar),
             paintOptions.js (junta grosor de pincel + espejo), brushSizeSlider.js
             (barra arrastrable de grosor), layersPanel.js (+ renombrar con doble
             clic, opacidad, fundir), timeline.js (+ fotograma vacío, reordenar
             arrastrando), selectionActions.js (barra y atajos de la selección:
             Ctrl+C/X/V/A, Supr, Esc), dialog.js (confirmaciones con el estilo de
             la app, sin window.confirm), toast.js (avisos; p. ej. si el
             autoguardado falla por falta de espacio), keyboard.js
             (isTypingTarget: los atajos no se disparan mientras se escribe),
             viewportPan.js (desplazar con Espacio+arrastrar o botón central),
             fonts/ (woff2 locales, para que funcione sin conexión),
             sidebarDock.js (acople + resize de la barra lateral), zoomControls.js
             (+ zoom hacia el cursor con la rueda y cuadrícula de píxeles),
             canvasResizeControls.js, projectSwitcher.js (crear/cambiar/renombrar/
             eliminar proyectos), importControls.js (importar imagen como capa nueva),
             exportControls.js (PNG/spritesheet/GIF a ×1–×16, con el nombre del
             proyecto), storage.js (todo el localStorage: proyectos/autoguardado,
             colores personalizados, estado de la sidebar)
/tests
/electron  -> main.js (proceso principal de Electron)

## App de escritorio
- `electron/main.js` levanta un servidor HTTP mínimo (solo módulos nativos de
  Node: `http`/`fs`/`path`, nada nuevo) sirviendo la carpeta del proyecto en
  `127.0.0.1` y carga `index.html` desde ahí con `loadURL`. **No** se carga con
  `loadFile` (protocolo `file://`) porque Chromium bloquea por CORS la carga de
  módulos ES entre archivos `file://`, y toda la app está escrita en
  `import`/`export`.
- `index.html`/`main.js`/`core`/`tools`/`ui` no saben que están dentro de
  Electron — es la misma app que corre en el navegador, sin cambios.
- `npm start` la lanza. El icono de la app (`build/icon.ico`, `build/icon.png`)
  está generado a mano en `core` puro de Node (`zlib` + un encoder PNG mínimo
  propio) — sin librerías de imagen, para no meter otra dependencia.
- `electron-builder` (`npm run dist`) ya está configurado (`build` en
  `package.json`: NSIS, `asar: false`, icono) para generar un instalador `.exe`
  de verdad, pero **el build falla en esta máquina**: `EBUSY` al borrar
  `app.asar`/`default_app.asar` justo tras extraer Electron. Se investigó a
  fondo (descartado: Git Bash vs PowerShell, `asar:false`, carpetas residuales,
  actualizar `electron-builder` a la última versión) — la causa es Tamper
  Protection de Windows Defender revirtiendo la protección en tiempo real en
  cuanto se desactiva, así que sigue bloqueando el archivo recién extraído. El
  usuario decidió no bajar más la seguridad del sistema para solucionarlo — la
  vía en uso ahora es un acceso directo de Escritorio a `electron.exe .`
  (creado a mano, no versionado, ver PowerShell del historial). Si se retoma el
  instalador: hay que desactivar Tamper Protection Y protección en tiempo real
  (por ese orden) antes de `npm run dist`.

## Convenciones
- Funciones puras siempre que se pueda. Sin estado global.
- Tests con node:test para core y tools. Nada de tests de UI.
- Las acciones que no se pueden deshacer (eliminar proyecto) o que sorprenden
  (borrar capa, reducir lienzo) piden confirmación con `ui/dialog.js#confirmAction`.