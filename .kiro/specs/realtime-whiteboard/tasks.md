# Implementation Plan: Realtime Whiteboard (Phase 1)

## Overview

Build a single-user interactive whiteboard in Next.js + TypeScript + Tailwind CSS. Implementation proceeds bottom-up: types and pure logic first, then hooks, then canvas rendering, then UI components, and finally wiring everything together into the root page.

## Tasks

- [x] 1. Scaffold the Next.js project and install dependencies
  - Initialize a new Next.js app with TypeScript and Tailwind CSS (`create-next-app`)
  - Install `fast-check` and `vitest` (or `jest` + `@testing-library/react`) for testing
  - Install `uuid` or confirm `crypto.randomUUID()` is available
  - Configure `vitest.config.ts` (or `jest.config.ts`) with TypeScript support
  - _Requirements: all (project foundation)_

- [x] 2. Define core types
  - [x] 2.1 Create `src/types/stroke.ts` with `ToolType`, `BaseStroke`, `FreehandStroke`, `LineStroke`, `RectStroke`, `CircleStroke`, `TextStroke`, and the `Stroke` discriminated union as specified in the design
    - _Requirements: 2, 3, 5, 6, 7, 8, 9_

- [ ] 3. Implement the `useHistory` hook
  - [x] 3.1 Create `src/hooks/useHistory.ts` implementing `addStroke`, `undo`, `redo`, `clear`, `canUndo`, `canRedo`
    - Follow the stack semantics from the design: `addStroke` clears the redo stack, `undo` pops from strokes to redoStack, `redo` pops from redoStack to strokes
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6, 11.2_

  - [ ]* 3.2 Write property tests for `useHistory`
    - **Property 9: Undo/redo round-trip preserves History** — Validates: Requirements 10.2, 10.3
    - **Property 10: New stroke after undo clears redo stack** — Validates: Requirements 10.4
    - **Property 11: canUndo and canRedo correctly reflect History state** — Validates: Requirements 10.5, 10.6
    - **Property 12: Clear resets all History** — Validates: Requirements 11.2
    - Use `fast-check` with `numRuns: 100`

- [ ] 4. Implement pure drawing helpers
  - [x] 4.1 Create `src/lib/arrowHead.ts` — given a `LineStroke`, return the three points of the arrowhead polygon (tip at x2/y2, two wings offset by angle ± 25°, length ~14px)
    - _Requirements: 6.4_

  - [ ]* 4.2 Write property test for arrowhead geometry
    - **Property 5: Arrowhead geometry lands at the endpoint** — Validates: Requirements 6.4
    - For any LineStroke with tool='arrow', assert the tip point is within 1px of (x2, y2)

  - [x] 4.3 Create `src/lib/drawStroke.ts` — exhaustive switch over `Stroke` discriminated union, dispatching to canvas 2D context drawing calls for each stroke type (freehand path, line, arrow with arrowHead, rect, ellipse, text)
    - Eraser strokes set `ctx.globalCompositeOperation = 'source-over'` and draw in `#ffffff`
    - _Requirements: 2, 3, 5, 6, 7, 8, 9_

  - [ ]* 4.4 Write unit tests for `drawStroke`
    - Mock `CanvasRenderingContext2D` and verify the correct drawing calls are made for each Stroke type
    - Verify no unhandled stroke type throws at compile time (exhaustive check)

- [ ] 5. Checkpoint — Ensure all tests pass
  - Run the test suite; fix any failures before continuing. Ask the user if questions arise.

- [ ] 6. Implement the two-layer `Canvas` component
  - [x] 6.1 Create `src/components/Canvas.tsx` with two stacked `<canvas>` refs (persistent bottom, overlay on top)
    - Overlay captures all mouse events: `onMouseDown`, `onMouseMove`, `onMouseUp`, `onMouseLeave`
    - On `mousedown`: record start point, set `isDrawing = true`
    - On `mousemove` while drawing: for freehand tools accumulate points and draw live on overlay; for shape/line tools clear overlay and redraw preview
    - On `mouseup` or `mouseleave`: build the final `Stroke` object, call `onStrokeComplete`, clear overlay, set `isDrawing = false`
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.3, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 8.1, 8.2, 8.3_

  - [x] 6.2 Add text tool input overlay inside `Canvas.tsx`
    - On click with text tool: render a `<textarea>` or `<input>` positioned at click coordinates (absolute, transparent background)
    - On Enter or blur: if text is non-empty finalize a `TextStroke` and call `onStrokeComplete`; if empty discard silently
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 6.3 Add canvas resize handling in `Canvas.tsx`
    - Add a `ResizeObserver` (or `window` resize listener) that updates canvas width/height to match the container and immediately redraws the persistent canvas from `strokes` prop
    - _Requirements: 1.1, 1.2_

  - [ ]* 6.4 Write property tests for Canvas stroke production
    - **Property 1: Freehand stroke commits to History** — Validates: Requirements 2.3, 3.3
    - **Property 2: Eraser strokes use white color** — Validates: Requirements 3.1, 3.2
    - **Property 3: Active color is applied to new Strokes** — Validates: Requirements 4.2, 4.3
    - **Property 4: Line and arrow strokes record correct endpoints** — Validates: Requirements 5.3, 6.3
    - **Property 6: Shape strokes record correct geometry** — Validates: Requirements 7.3, 8.3
    - **Property 7: Text stroke commits non-empty text to History** — Validates: Requirements 9.3
    - **Property 8: Empty text is discarded** — Validates: Requirements 9.4
    - **Property 13: Active tool state reflects user selection** — Validates: Requirements 12.2
    - **Property 14: Resize preserves History strokes** — Validates: Requirements 1.2
    - Simulate events using `@testing-library/user-event` or direct canvas event dispatch

- [x] 7. Implement `useCanvasRenderer` hook
  - Create `src/hooks/useCanvasRenderer.ts` — accepts a canvas ref and a `strokes` array; on every `strokes` change, clears the canvas and replays all strokes via `drawStroke`
  - Used by `Canvas.tsx` to keep the persistent layer in sync with History
  - _Requirements: 2, 3, 5, 6, 7, 8, 9, 10, 11_

- [x] 8. Implement `useKeyboardShortcuts` hook
  - Create `src/hooks/useKeyboardShortcuts.ts` — listens for `keydown` on `window`; calls `undo` on Ctrl+Z / Cmd+Z and `redo` on Ctrl+Y / Cmd+Shift+Z
  - _Requirements: 10.7_

  - [ ]* 8.1 Write unit tests for keyboard shortcut handling
    - Simulate keydown events and verify `undo`/`redo` callbacks are invoked correctly

- [ ] 9. Checkpoint — Ensure all tests pass
  - Run the full test suite; fix any failures before continuing. Ask the user if questions arise.

- [ ] 10. Implement the `Toolbar` component
  - [x] 10.1 Create `src/components/Toolbar.tsx`
    - Render one button per tool (pencil, eraser, line, arrow, rectangle, circle, text) with icons or labels
    - Highlight the active tool button using Tailwind classes (e.g., `ring-2 ring-blue-500` or `bg-blue-100`)
    - Render undo and redo buttons, disabled when `canUndo`/`canRedo` is `false`
    - Render a clear board button
    - _Requirements: 10.1, 11.1, 12.1, 12.2, 12.3_

  - [x] 10.2 Add `ColorPicker` inside `Toolbar.tsx`
    - Render a row of preset color swatches (at least 8 colors)
    - Render a native `<input type="color">` for custom color selection
    - Show a visual indicator of the currently active color
    - _Requirements: 4.1, 4.4_

  - [ ]* 10.3 Write unit tests for Toolbar
    - Verify all 7 tool buttons are rendered
    - Verify undo/redo buttons are disabled when `canUndo`/`canRedo` is false
    - Verify color picker renders preset swatches and custom input
    - Verify default active tool is pencil

- [ ] 11. Wire everything together in `WhiteboardApp` and root page
  - [x] 11.1 Create `src/components/WhiteboardApp.tsx`
    - Manage `activeTool`, `activeColor` in local state (default: `'pencil'`, `'#000000'`)
    - Use `useHistory` for stroke management
    - Use `useKeyboardShortcuts` wired to `undo`/`redo`
    - Render `<Toolbar>` and `<Canvas>` side by side (Toolbar fixed on left or top, Canvas fills remaining space)
    - Pass all required props down to each component
    - _Requirements: 1.1, 4.2, 10.7, 12.4_

  - [x] 11.2 Update `src/app/page.tsx` to render `<WhiteboardApp />` full-screen
    - Set `html`, `body`, and root container to `h-full w-full overflow-hidden` via Tailwind
    - _Requirements: 1.1, 1.3_

- [ ] 12. Final checkpoint — Ensure all tests pass
  - Run the complete test suite. Fix any failures. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with `numRuns: 100` per property
- Unit tests use Vitest + `@testing-library/react`
- The two-canvas approach (persistent + overlay) avoids flicker on live shape previews
- Phase 2 (collaboration, WebSockets, rooms) is out of scope for this task list
