# Design Document: Realtime Whiteboard (Phase 1)

## Overview

Phase 1 delivers a single-user interactive whiteboard as a Next.js application with TypeScript and Tailwind CSS. The core abstraction is a **Stroke**-based canvas model: every user action (draw, erase, place text) produces an immutable Stroke that is stored in an ordered History array. The canvas is redrawn by replaying all Strokes in order, which makes undo/redo trivial (pop/push on the History stack) and lays a clean foundation for Phase 2 collaborative sync.

All drawing happens on an HTML5 `<canvas>` element. Shapes with live previews (line, arrow, rectangle, circle) use a two-canvas technique: a persistent bottom canvas holds committed Strokes, and a transparent overlay canvas captures mouse events and renders the in-progress preview. On mouse-up the preview is committed to the bottom canvas and the overlay is cleared.

---

## Architecture

```
src/
  app/
    page.tsx               # Root page — mounts WhiteboardApp
  components/
    WhiteboardApp.tsx      # Top-level state container
    Canvas.tsx             # Two-layer canvas + mouse event routing
    Toolbar.tsx            # Tool buttons, color picker, undo/redo, clear
  hooks/
    useHistory.ts          # Undo/redo stack management
    useCanvasRenderer.ts   # Imperative canvas drawing helpers
    useKeyboardShortcuts.ts# Ctrl+Z / Ctrl+Y / Cmd+Z bindings
  types/
    stroke.ts              # Stroke discriminated union + ToolType
  lib/
    drawStroke.ts          # Pure function: render one Stroke onto a context
    arrowHead.ts           # Arrowhead geometry helper
```

### Data flow

```
User mouse event
      │
      ▼
  Canvas.tsx  ──(active tool, color)──▶  produces Stroke
      │
      ▼
 WhiteboardApp  ──▶  useHistory (add / undo / redo / clear)
      │
      ▼
 useCanvasRenderer  ──▶  redraws persistent canvas from History
```

---

## Components and Interfaces

### `ToolType`

```ts
type ToolType =
  | 'pencil'
  | 'eraser'
  | 'line'
  | 'arrow'
  | 'rectangle'
  | 'circle'
  | 'text';
```

### `Stroke` (discriminated union)

```ts
interface BaseStroke {
  id: string;        // crypto.randomUUID()
  color: string;     // CSS color string
}

interface FreehandStroke extends BaseStroke {
  tool: 'pencil' | 'eraser';
  points: { x: number; y: number }[];
}

interface LineStroke extends BaseStroke {
  tool: 'line' | 'arrow';
  x1: number; y1: number;
  x2: number; y2: number;
}

interface RectStroke extends BaseStroke {
  tool: 'rectangle';
  x: number; y: number;
  width: number; height: number;
}

interface CircleStroke extends BaseStroke {
  tool: 'circle';
  cx: number; cy: number;
  rx: number; ry: number;
}

interface TextStroke extends BaseStroke {
  tool: 'text';
  x: number; y: number;
  text: string;
  fontSize: number;
}

type Stroke =
  | FreehandStroke
  | LineStroke
  | RectStroke
  | CircleStroke
  | TextStroke;
```

### `useHistory`

```ts
interface HistoryState {
  strokes: Stroke[];
  redoStack: Stroke[];
  addStroke: (s: Stroke) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  canUndo: boolean;
  canRedo: boolean;
}
```

### `Canvas`

Props:
- `activeTool: ToolType`
- `activeColor: string`
- `strokes: Stroke[]`
- `onStrokeComplete: (stroke: Stroke) => void`

Internally owns two `<canvas>` refs (persistent + overlay) and manages mouse state.

### `Toolbar`

Props:
- `activeTool: ToolType`
- `onToolChange: (tool: ToolType) => void`
- `activeColor: string`
- `onColorChange: (color: string) => void`
- `canUndo: boolean`
- `canRedo: boolean`
- `onUndo: () => void`
- `onRedo: () => void`
- `onClear: () => void`

---

## Data Models

### History stack

```ts
// useHistory internal state
{
  strokes: Stroke[];      // committed history (index 0 = oldest)
  redoStack: Stroke[];    // strokes popped by undo, cleared on new addStroke
}
```

Undo: `strokes.pop()` → push onto `redoStack`, trigger re-render.  
Redo: `redoStack.pop()` → push onto `strokes`, trigger re-render.  
Add: push onto `strokes`, set `redoStack = []`.  
Clear: set both to `[]`.

### Canvas rendering

The persistent canvas is redrawn from scratch on every History change by iterating `strokes` and calling `drawStroke(ctx, stroke)` for each. This is O(n) per change but keeps the renderer stateless and simple. For typical whiteboard usage (hundreds to low thousands of strokes) this is fast enough; optimization (e.g., dirty-region tracking) is deferred to a later phase.

### Color

Active color is a CSS color string stored in `WhiteboardApp` state. The eraser tool ignores the active color and always draws in `#ffffff`.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Freehand stroke commits to History

*For any* sequence of pointer events using the pencil or eraser tool, when the user releases the mouse button, the History should contain exactly one more FreehandStroke than before the interaction began, with the stroke's `tool` field matching the active tool.

**Validates: Requirements 2.3, 3.3**

---

### Property 2: Eraser strokes use white color

*For any* erase operation, the resulting FreehandStroke committed to History should have `color` equal to `#ffffff`, regardless of the currently active drawing color.

**Validates: Requirements 3.1, 3.2**

---

### Property 3: Active color is applied to new Strokes

*For any* active color value and any non-eraser tool, completing a stroke should produce a Stroke whose `color` field equals the active color at the time of completion.

**Validates: Requirements 4.2, 4.3**

---

### Property 4: Line and arrow strokes record correct endpoints

*For any* start point (x1, y1) and end point (x2, y2) drawn with the line or arrow tool, the resulting LineStroke in History should have `x1`, `y1`, `x2`, `y2` values matching the mousedown and mouseup coordinates.

**Validates: Requirements 5.3, 6.3**

---

### Property 5: Arrowhead geometry lands at the endpoint

*For any* LineStroke with `tool='arrow'`, the arrowhead polygon computed by the `arrowHead` helper should have its tip point at or within 1px of (x2, y2).

**Validates: Requirements 6.4**

---

### Property 6: Shape strokes record correct geometry

*For any* origin and end point drawn with the rectangle tool, the resulting RectStroke should have `x`, `y`, `width`, and `height` correctly derived from the two points (width and height may be negative when dragging left/up). For any origin and end point drawn with the circle tool, the resulting CircleStroke should have `cx`, `cy`, `rx`, `ry` correctly derived from the bounding box.

**Validates: Requirements 7.3, 8.3**

---

### Property 7: Text stroke commits non-empty text to History

*For any* non-empty text string and canvas position, committing the text tool should add exactly one TextStroke to History with the `text` field equal to the entered string and `x`, `y` matching the click position.

**Validates: Requirements 9.3**

---

### Property 8: Empty text is discarded

*For any* canvas position, committing the text tool with an empty or whitespace-only string should leave History unchanged (no new Stroke added).

**Validates: Requirements 9.4**

---

### Property 9: Undo/redo round-trip preserves History

*For any* non-empty History, performing undo followed by redo should return `strokes` to its original contents and length, making the operation a no-op with respect to the canvas state.

**Validates: Requirements 10.2, 10.3**

---

### Property 10: New stroke after undo clears redo stack

*For any* History state where the redo stack is non-empty, calling `addStroke` should result in `redoStack` being empty.

**Validates: Requirements 10.4**

---

### Property 11: canUndo and canRedo correctly reflect History state

*For any* History state, `canUndo` should be `true` if and only if `strokes.length > 0`, and `canRedo` should be `true` if and only if `redoStack.length > 0`.

**Validates: Requirements 10.5, 10.6**

---

### Property 12: Clear resets all History

*For any* non-empty History (strokes or redoStack), calling `clear()` should result in both `strokes` and `redoStack` being empty arrays.

**Validates: Requirements 11.2**

---

### Property 13: Active tool state reflects user selection

*For any* ToolType value, after `onToolChange(tool)` is called, the `activeTool` state should equal that tool.

**Validates: Requirements 12.2**

---

### Property 14: Resize preserves History strokes

*For any* History state, triggering a canvas resize event should leave the `strokes` array unchanged (same length and same stroke objects).

**Validates: Requirements 1.2**

---

## Error Handling

- **Mouse leaves canvas mid-draw**: If the pointer leaves the canvas while the mouse button is held, the in-progress stroke is finalized as if mouseup occurred. This prevents orphaned drawing state.
- **Text commit with empty input**: Handled by Property 8 — no Stroke is added, the overlay input is removed.
- **Undo on empty History**: `undo()` is a no-op when `strokes` is empty; `canUndo` is `false` so the button is disabled.
- **Redo on empty redo stack**: Same pattern — `redo()` is a no-op; `canRedo` is `false`.
- **Canvas resize**: Resizing clears the raw canvas pixel buffer; the persistent canvas is redrawn from History immediately after resize.
- **Unknown tool type**: The `drawStroke` function includes an exhaustive switch; TypeScript's `never` type ensures all cases are handled at compile time.

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are required. Unit tests catch specific examples and edge cases; property tests verify universal correctness across generated inputs.

### Property-Based Testing

Library: **fast-check** (TypeScript, well-maintained, works with Vitest/Jest).

Each correctness property (1–14 above) is implemented as a single property-based test using `fc.assert(fc.property(...))`. Each test runs a minimum of 100 iterations.

Tag format for each test:

```
// Feature: realtime-whiteboard, Property N: <property title>
```

### Unit Tests

Unit tests cover:
- Initial state defaults (activeTool = 'pencil', History empty)
- Toolbar renders all 7 tool buttons
- Color picker renders preset palette and custom input
- Keyboard shortcut handler calls undo/redo correctly
- `drawStroke` correctly dispatches to each stroke type without throwing

### Test File Layout

```
src/
  __tests__/
    useHistory.test.ts        # Properties 9, 10, 11, 12 + unit tests
    strokeModel.test.ts       # Properties 3, 4, 5, 6, 7, 8
    canvasInteraction.test.ts # Properties 1, 2, 13, 14
    Toolbar.test.tsx          # Unit: tool buttons, color picker, undo/redo buttons
    drawStroke.test.ts        # Unit: drawStroke dispatch
```

### Property Test Configuration

```ts
// vitest.config.ts — no special config needed; fast-check works out of the box
// Each property test:
fc.assert(fc.property(arbitraries, (input) => { ... }), { numRuns: 100 });
```
