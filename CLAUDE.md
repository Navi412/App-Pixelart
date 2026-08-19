# Editor de píxel art

Vanilla JS (ES modules), sin dependencias. Canvas 2D.

## Arquitectura
- El estado vive en arrays de píxeles (Uint8ClampedArray, RGBA).
- El canvas es solo salida: se re-renderiza componiendo capas.
- imageSmoothingEnabled = false SIEMPRE (si no, los píxeles salen borrosos).
- Las herramientas son módulos con la misma interfaz: onPointerDown/Move/Up.
- Toda mutación del documento pasa por el sistema de comandos (undo/redo).
  Nada modifica píxeles directamente desde la UI.

## Estructura
/core     -> document.js, layer.js, history.js
/tools    -> pencil.js, eraser.js, bucket.js
/ui       -> canvas.js, palette.js, layerPanel.js
/tests

## Convenciones
- Funciones puras siempre que se pueda. Sin estado global.
- Tests con node:test para core y tools. Nada de tests de UI.