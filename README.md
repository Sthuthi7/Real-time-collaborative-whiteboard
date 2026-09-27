# Realtime Whiteboard

A collaborative whiteboard built with Next.js, TypeScript, and Tailwind CSS. Phase 1 is a fully functional single-user drawing canvas. Phase 2 adds real-time collaboration via WebSockets.

## Features (Phase 1)

| Tool | Description |
|------|-------------|
| ✏️ Pencil | Freehand drawing |
| 🧹 Eraser | Erase by drawing in white |
| 📏 Line | Straight lines with live preview |
| ↗️ Arrow | Arrows with arrowhead |
| ⬜ Rectangle | Rectangles with live preview |
| ⭕ Circle | Ellipses with live preview |
| 📝 Text | Click to place text anywhere |

- Color picker with 10 preset swatches + custom color input
- Undo / Redo — buttons and keyboard shortcuts (Ctrl+Z / Ctrl+Y)
- Clear board
- Responsive canvas — resizes with the browser window without losing the drawing

## Tech Stack

- [Next.js 15](https://nextjs.org/) (App Router)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- HTML5 Canvas API

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  app/
    page.tsx                 # Root page
    layout.tsx               # Full-screen layout
  components/
    WhiteboardApp.tsx         # Top-level state container
    Canvas.tsx               # Two-layer canvas + mouse events
    Toolbar.tsx              # Tool buttons, colors, undo/redo
  hooks/
    useHistory.ts            # Undo/redo stack
    useCanvasRenderer.ts     # Redraws canvas from stroke history
    useKeyboardShortcuts.ts  # Ctrl+Z / Ctrl+Y bindings
  types/
    stroke.ts                # Stroke discriminated union + ToolType
  lib/
    drawStroke.ts            # Pure canvas drawing function
    arrowHead.ts             # Arrowhead geometry helper
```

## How It Works

Every drawing action produces an immutable **Stroke** object added to a history array. The canvas redraws from scratch by replaying all strokes in order — this keeps the renderer stateless and makes undo/redo trivial (just pop/push on the history stack).

The `Canvas` component uses two stacked `<canvas>` elements:
- **Bottom canvas** — holds committed strokes
- **Overlay canvas** — captures mouse events and renders the in-progress live preview

On mouseup, the preview is committed to history and the overlay is cleared.

## Keyboard Shortcuts

| Action | Windows / Linux | macOS |
|--------|----------------|-------|
| Undo | Ctrl+Z | Cmd+Z |
| Redo | Ctrl+Y | Cmd+Y or Cmd+Shift+Z |

## Roadmap

### Phase 2 — Real-time Collaboration
- WebSocket server with rooms
- Live cursor positions for all connected users
- Presence indicators (online count, user labels)
- Automatic reconnection and board sync on reconnect

