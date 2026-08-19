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

## Estructura
/core     -> document.js (+ comandos de capas: añadir/quitar/mover/ocultar), layer.js, history.js,
             color.js, shapes.js (geometría pura: línea/rectángulo/elipse),
             project.js (fotogramas de animación), serialize.js (proyecto <-> JSON para autoguardado)
/tools    -> pencil.js, eraser.js, bucket.js, paintTool.js (trazo compartido por lápiz y goma),
             shapeTool.js (motor compartido por line.js/rectangle.js/ellipse.js),
             eyedropper.js, selection.js (selección rectangular + mover)
/ui       -> canvas.js, interaction.js, palette.js, toolbar.js, icons.js, colorPicker.js,
             tooltip.js, layersPanel.js, timeline.js, theme.css
/tests

## Convenciones
- Funciones puras siempre que se pueda. Sin estado global.
- Tests con node:test para core y tools. Nada de tests de UI.