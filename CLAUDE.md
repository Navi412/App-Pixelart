# Editor de píxel art

Vanilla JS (ES modules), sin dependencias. Canvas 2D.

## Arquitectura
- El estado vive en arrays de píxeles (Uint8ClampedArray, RGBA).
- El canvas es solo salida: se re-renderiza componiendo capas.
- imageSmoothingEnabled = false SIEMPRE (si no, los píxeles salen borrosos).
- Las herramientas son módulos con la misma interfaz: onPointerDown/Move/Up.
- Toda mutación del documento pasa por el sistema de comandos (undo/redo).
  Nada modifica píxeles directamente desde la UI.
- Contrato de comando (core/history.js): objeto { do(doc), undo(doc) }.
  execute(history, doc, command) lo aplica y limpia la pila de redo.
- Un "frame" (core/project.js) es un { doc, history } — cada fotograma de la
  animación tiene su propio documento y su propia pila de undo/redo, independiente
  de los demás. `main.js` siempre opera sobre `getActiveFrame(project)`.
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

## Estructura
/core     -> document.js (+ comandos de capas: añadir/quitar/mover/ocultar), layer.js
             (+ resizeLayerPixels), history.js, color.js, shapes.js (geometría pura:
             línea/rectángulo/elipse), mirror.js (reflejo de celdas para dibujo con espejo),
             project.js (fotogramas de animación + resizeProject),
             serialize.js (proyecto <-> JSON para autoguardado)
/tools    -> pencil.js, eraser.js, bucket.js, paintTool.js (trazo compartido por lápiz y goma),
             shapeTool.js (motor compartido por line.js/rectangle.js/ellipse.js),
             eyedropper.js, selection.js (selección rectangular + mover)
/ui       -> canvas.js, interaction.js, icons.js, tooltip.js, theme.css (base del tema),
             palette.js, colorPicker.js, colorControls.js (junta las dos anteriores + persistencia),
             toolbar.js, toolSetup.js (herramientas + atajos + botón de borrar),
             paintOptions.js (grosor de pincel + espejo), layersPanel.js, timeline.js,
             sidebarDock.js (acople + resize de la barra lateral), zoomControls.js,
             canvasResizeControls.js, exportControls.js, storage.js (todo el localStorage:
             proyecto/autoguardado, colores personalizados, estado de la sidebar)
/tests

## Convenciones
- Funciones puras siempre que se pueda. Sin estado global.
- Tests con node:test para core y tools. Nada de tests de UI.