# Implementation Plan: Realtime Whiteboard Collaboration

## Overview

Incrementally layer WebSocket collaboration onto the existing Phase 1 whiteboard. Each task produces runnable, integrated code. Server-side logic is built first (room management, message relay), then the client hook, then UI components, finishing with full wiring.

## Tasks

- [x] 1. Set up server dependencies and project structure
  - Add `ws`, `uuid` to `dependencies` in `package.json`
  - Add `@types/ws`, `@types/uuid` to `devDependencies`
  - Add `"dev:server": "node server/server.js"` script to `package.json`
  - Create `server/` directory with empty `server.js` and `roomManager.js`
  - _Requirements: 8.1, 8.5_

- [x] 2. Implement `roomManager.js` — pure room state
  - [x] 2.1 Implement core room state module
    - Export `createRoom(roomId)`, `getOrCreateRoom(roomId)`, `addClient(roomId, clientEntry)`, `removeClient(roomId, sessionId)`, `getClients(roomId)`, `appendStroke(roomId, stroke)`, `getBoardState(roomId)`, `broadcastToRoom(roomId, message, excludeSessionId)`
    - Each function operates on an in-memory `Map<string, RoomState>` (no persistence)
    - _Requirements: 3.3, 8.3, 1.2_

  - [ ]* 2.2 Write property test for room isolation (Property 12)
    - **Property 12: Room isolation**
    - **Validates: Requirements 1.2, 8.3**
    - Use fast-check to generate two arbitrary roomIds; verify same id → same room object, different ids → different room objects; add strokes to one room and verify they don't appear in the other

  - [ ]* 2.3 Write property test for participant count accuracy (Property 5)
    - **Property 5: Participant count accuracy**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
    - Generate arbitrary sequences of addClient/removeClient calls; after each step verify `getClients(roomId).length` equals the expected connected count

  - [ ]* 2.4 Write property test for board state sync (Property 4)
    - **Property 4: Board state sync round-trip**
    - **Validates: Requirements 3.1, 3.2, 3.5**
    - Generate arbitrary stroke sequences; append all via `appendStroke`; verify `getBoardState` returns equal-length array with same ids in same order

- [x] 3. Implement `server/server.js` — WebSocket server
  - [x] 3.1 Implement connection handling and identity assignment
    - Start `ws.Server` on `process.env.WS_PORT ?? 8080`
    - Parse `roomId` from URL path (`/board/<roomId>`) on connection
    - Assign UUID sessionId, random Display_Name from 20-name list, Display_Color from 8-color palette (prefer unique per room)
    - Send `ack` message to connecting client; add client to roomManager; send `sync` with current board state; broadcast updated `participants` list to room
    - _Requirements: 8.1, 8.2, 8.6, 6.1, 6.2, 6.3, 6.4, 6.5, 3.1, 1.3_

  - [x] 3.2 Implement message handling (stroke and cursor relay)
    - On `message` event: `JSON.parse` inside `try/catch`; dispatch on `type`
    - `stroke`: add server timestamp, append to board state, broadcast to room excluding sender
    - `cursor`: relay to all room peers excluding sender
    - Unknown/malformed: log and continue
    - _Requirements: 2.1, 2.2, 2.4, 5.2, 8.4_

  - [x] 3.3 Implement disconnect handling
    - On `close`/`error`: remove client from roomManager; broadcast `participants` update; broadcast `cursor_remove` with sessionId
    - _Requirements: 1.4, 4.2, 5.5_

  - [ ]* 3.4 Write property test for stroke broadcast no-echo (Property 1)
    - **Property 1: Stroke broadcast — all peers receive, sender does not**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
    - Use fast-check to generate N clients (2–5) and arbitrary strokes; call `broadcastToRoom` with excludeSessionId; verify all N-1 others receive the stroke with a timestamp field; sender receives nothing

  - [ ]* 3.5 Write property test for cursor relay no-echo (Property 6)
    - **Property 6: Cursor relay — no echo, correct recipients**
    - **Validates: Requirements 5.1, 5.2**
    - Generate rooms with 3 clients; send cursor update from client A; verify B and C receive exactly one event each with A's sessionId; A receives none

  - [ ]* 3.6 Write property test for malformed message resilience (Property 13)
    - **Property 13: Malformed message server resilience**
    - **Validates: Requirements 8.4**
    - Generate arbitrary malformed strings (random bytes, truncated JSON, unknown type fields); pass directly to the message handler; verify no exception thrown and other clients are unaffected

  - [ ]* 3.7 Write property test for roomId URL extraction (Property 14)
    - **Property 14: roomId extraction from URL path**
    - **Validates: Requirements 8.6**
    - Generate arbitrary alphanumeric roomId strings; construct URL `ws://host:8080/board/<roomId>`; verify extracted roomId equals the input string

  - [ ]* 3.8 Write property test for identity fields validity (Property 8)
    - **Property 8: Identity fields within predefined sets**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
    - Generate N arbitrary connections; verify each assigned Display_Name ∈ name list, Display_Color ∈ palette, sessionId matches UUID v4 regex

  - [ ]* 3.9 Write property test for unique color assignment (Property 7)
    - **Property 7: Unique color assignment when room ≤ palette size**
    - **Validates: Requirements 6.3, 6.5**
    - Generate rooms with 2–8 participants; verify all assigned Display_Colors are pairwise distinct

- [ ] 4. Checkpoint — server passes all tests
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement `src/hooks/useCollaboration.ts`
  - [x] 5.1 Implement core hook with WebSocket lifecycle
    - Create `useCollaboration(roomId: string): CollaborationState`
    - Manage WebSocket open/message/close/error events in a `useEffect`
    - On open: set `connectionStatus = 'connected'`, reset retry counter
    - On close/error: set `connectionStatus = 'reconnecting'`, schedule retry
    - Expose `sendStroke(stroke)` and `sendCursor(x, y)` (cursor throttled to 50 ms via `useRef` timestamp)
    - _Requirements: 7.1, 7.3, 7.5, 5.1_

  - [x] 5.2 Handle incoming messages and state updates
    - `ack`: store `self` (sessionId, displayName, displayColor)
    - `sync`: replace `remoteStrokes` with payload; set initial strokes
    - `stroke`: dedup check (seen-ids Set), then append to `remoteStrokes`
    - `participants`: update `participants` array
    - `cursor`: update `remoteCursors` map
    - `cursor_remove`: delete from `remoteCursors` map
    - _Requirements: 2.3, 2.5, 3.2, 4.3, 5.3_

  - [x] 5.3 Implement exponential backoff reconnection
    - On close: compute delay `min(1000 × 2^attempt, 30000)`, schedule `setTimeout`
    - On successful open: reset `attempt = 0`
    - After 10 consecutive failures: set `connectionStatus = 'failed'`, stop retrying
    - On reconnect success: send `{ type: 'sync_request' }` or rely on server-side `sync` on join
    - _Requirements: 7.2, 7.4, 7.6_

  - [ ]* 5.4 Write property test for stroke deduplication (Property 2)
    - **Property 2: Remote stroke deduplication**
    - **Validates: Requirements 2.5**
    - Generate arbitrary strokes; deliver each twice to the dedup logic; verify resulting list length equals once-delivered length and each id appears exactly once

  - [ ]* 5.5 Write property test for exponential backoff sequence (Property 9)
    - **Property 9: Exponential backoff delay sequence**
    - **Validates: Requirements 7.2**
    - For attempt numbers 0–10, verify `computeDelay(n) === Math.min(1000 * Math.pow(2, n), 30000)`

  - [ ]* 5.6 Write property test for post-reconnect sync completeness (Property 10)
    - **Property 10: Post-reconnect sync completeness**
    - **Validates: Requirements 7.4, 3.5**
    - Generate a board state (arbitrary stroke array) as a sync payload; feed it to the hook's sync handler after a simulated reconnect; verify every stroke in the payload is present in local strokes

  - [ ]* 5.7 Write property test for max retries → failed status (Property 11)
    - **Property 11: Max retries leads to failed status**
    - **Validates: Requirements 7.6**
    - Simulate 10 consecutive close events on the backoff logic; verify final connectionStatus is `'failed'` and no additional timers are scheduled

- [x] 6. Implement UI components
  - [x] 6.1 Implement `ConnectionBanner.tsx`
    - Render nothing when `connectionStatus === 'connected'`
    - Render neutral "Connecting…" when `connectionStatus === 'connecting'`
    - Render "Connection lost — reconnecting…" when `connectionStatus === 'reconnecting'`
    - Render "Could not reconnect. Please refresh the page." when `connectionStatus === 'failed'`
    - Banner is a fixed overlay at the top of the viewport, z-index above canvas
    - _Requirements: 7.1, 7.3, 7.5, 7.6_

  - [x] 6.2 Implement `CursorOverlay.tsx`
    - Accept `remoteCursors: Record<string, CursorPosition>` and `selfCursor: {x,y} | null` and `selfColor: string`
    - Render a small colored dot + label for each remote cursor at `{ left: x, top: y }` using absolute positioning
    - Render self cursor as "You" using `selfColor`
    - Rendered as an absolutely positioned `<div>` that fills the canvas container, `pointerEvents: none`, above both canvas layers
    - _Requirements: 5.3, 5.4, 5.6_

  - [x] 6.3 Implement `CollaborativeWhiteboardApp.tsx`
    - Accept `roomId: string` prop
    - Call `useCollaboration(roomId)` to get `{ remoteStrokes, participants, remoteCursors, self, connectionStatus, sendStroke, sendCursor }`
    - Merge local strokes (from `useHistory`) with `remoteStrokes` into a combined `allStrokes` array (dedup by id, ordered by server timestamp where available)
    - Pass `allStrokes` to `Canvas`; on `onStrokeComplete` call both `addStroke` (local) and `sendStroke` (remote)
    - Display participant count (e.g. "3 online") in a small badge in the toolbar area
    - Render `<CursorOverlay>` and `<ConnectionBanner>` as siblings to `Canvas`
    - Add `onMouseMove` prop to `Canvas` forwarding canvas-local coordinates to `sendCursor`
    - _Requirements: 4.1, 4.4, 2.1, 5.1, 1.5_

- [x] 7. Add `onMouseMove` prop to `Canvas.tsx`
  - Add optional `onMouseMove?: (x: number, y: number) => void` prop to `CanvasProps`
  - In `handleMouseMove`, after existing logic, call `onMouseMove(x, y)` if provided
  - No other Canvas changes needed
  - _Requirements: 5.1_

- [x] 8. Implement Next.js route `/board/[roomId]`
  - Create `src/app/board/[roomId]/page.tsx`
  - Read `roomId` from `params`, render `<CollaborativeWhiteboardApp roomId={roomId} />`
  - Display `roomId` in the page `<title>` via Next.js `generateMetadata`
  - _Requirements: 1.1, 1.3, 1.5_

- [x] 9. Implement `src/types/collaboration.ts`
  - Define and export `Participant`, `CursorPosition`, `ParticipantInfo`, `ConnectionStatus`, and all WS message types as TypeScript interfaces
  - Import and re-use `Stroke` from `src/types/stroke.ts`
  - _Requirements: 2.6, 6.1_

- [ ]* 10. Write property test for stroke serialization round-trip (Property 3)
  - **Property 3: Stroke serialization round-trip (all 7 types)**
  - **Validates: Requirements 2.6**
  - Use fast-check to generate valid Stroke objects for all 7 types; verify `JSON.parse(JSON.stringify(stroke))` produces a structurally equivalent Stroke with no field loss

- [ ] 11. Final checkpoint — all tests pass, server and client wired
  - Ensure all tests pass, ask the user if questions arise.
  - Verify `npm run dev` and `npm run dev:server` can run together

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests run against pure logic (roomManager, dedup, backoff) — no real WebSocket needed
- fast-check `{ numRuns: 100 }` minimum per property test
- Each property test comment: `// Feature: realtime-whiteboard-collaboration, Property N: <text>`
- Phase 1 components (Canvas, Toolbar, useHistory) are unchanged except Canvas gains one optional prop
