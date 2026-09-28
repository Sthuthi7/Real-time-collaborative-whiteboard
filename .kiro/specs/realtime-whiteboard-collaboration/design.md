# Design Document: Realtime Whiteboard Collaboration

## Overview

Phase 2 adds a WebSocket collaboration layer to the existing single-user whiteboard. The architecture is deliberately thin: a small Node.js server handles room management and message routing; the existing Phase 1 React components and hooks are extended rather than replaced.

The key design principle is **additive**: `WhiteboardApp` gains a `roomId` prop and delegates all network concerns to a new `useCollaboration` hook. The canvas, toolbar, and history stack from Phase 1 are unchanged except for wiring remote strokes into the existing `strokes` array.

---

## Architecture

```
Browser (Client A)                  Node.js Server                  Browser (Client B)
┌─────────────────────┐            ┌──────────────────┐            ┌─────────────────────┐
│  /board/[roomId]    │            │  server.js        │            │  /board/[roomId]    │
│                     │  WS conn   │                   │  WS conn   │                     │
│  useCollaboration   │◄──────────►│  RoomManager      │◄──────────►│  useCollaboration   │
│    ↓ strokes        │            │    └─ Room A       │            │    ↓ strokes        │
│  WhiteboardApp      │            │       ├─ BoardState│            │  WhiteboardApp      │
│    ├─ Canvas        │            │       └─ Clients   │            │    ├─ Canvas        │
│    └─ Toolbar       │            └──────────────────┘            │    └─ Toolbar       │
│  CursorOverlay      │                                             │  CursorOverlay      │
│  ConnectionBanner   │                                             │  ConnectionBanner   │
└─────────────────────┘                                             └─────────────────────┘
```

**Data flow for a stroke:**
1. User draws → `Canvas.onStrokeComplete` fires
2. `WhiteboardApp` calls `addStroke` (local history) AND `sendStroke` (via collaboration hook)
3. Server receives stroke, appends to Room's `BoardState`, broadcasts to all other clients
4. Remote clients receive stroke, append to local strokes array, canvas re-renders

**Data flow for cursor:**
1. Mouse move on canvas → throttled (50 ms) cursor event
2. `useCollaboration` sends `{ type: 'cursor', x, y }`
3. Server relays to room peers (no echo)
4. `CursorOverlay` renders dot + label per remote participant

---

## Components and Interfaces

### New Files

| File | Role |
|------|------|
| `server/server.js` | WebSocket server — room management, message relay |
| `server/roomManager.js` | Pure room state: participants, board state |
| `src/app/board/[roomId]/page.tsx` | Next.js dynamic route for collaboration |
| `src/hooks/useCollaboration.ts` | WebSocket lifecycle + message dispatch |
| `src/components/CollaborativeWhiteboardApp.tsx` | Top-level wrapper that wires collaboration into Phase 1 |
| `src/components/CursorOverlay.tsx` | Renders remote cursors on an HTML layer |
| `src/components/ConnectionBanner.tsx` | Shows connection status banners |

### Modified Files

| File | Change |
|------|--------|
| `src/components/Canvas.tsx` | Add `onMouseMove` prop callback for cursor sharing |
| `package.json` | Add `ws`, `uuid` server deps; add `dev:server` script |

---

### `useCollaboration` Hook

```typescript
interface CollaborationState {
  // Strokes received from remote participants
  remoteStrokes: Stroke[];
  // All current participants (including self)
  participants: Participant[];
  // Remote cursor positions keyed by sessionId
  remoteCursors: Record<string, CursorPosition>;
  // Self identity assigned by server
  self: ParticipantInfo | null;
  // Current WebSocket connection status
  connectionStatus: 'connecting' | 'connected' | 'reconnecting' | 'failed';
  // Call on every local stroke commit
  sendStroke: (stroke: Stroke) => void;
  // Call on every mouse move over canvas (hook handles throttle)
  sendCursor: (x: number, y: number) => void;
}

function useCollaboration(roomId: string): CollaborationState
```

Internally the hook manages:
- WebSocket instance lifecycle (open, message, close, error)
- Exponential backoff reconnection timer
- Deduplication set of seen stroke IDs
- Cursor throttle via `useRef` + timestamp comparison

---

### WebSocket Message Protocol

All messages are JSON-encoded strings. Every message has a `type` discriminant.

#### Client → Server

```typescript
// Stroke committed by local user
{ type: 'stroke', stroke: Stroke }

// Cursor moved
{ type: 'cursor', x: number, y: number }
```

#### Server → Client

```typescript
// Immediately after connection, assigns identity
{ type: 'ack', sessionId: string, displayName: string, displayColor: string }

// Full board state on join / rejoin
{ type: 'sync', strokes: Stroke[] }

// A stroke from another participant
{ type: 'stroke', stroke: Stroke, senderId: string, timestamp: number }

// Updated participant list (any join/leave)
{ type: 'participants', participants: Participant[] }

// Cursor position from another participant
{ type: 'cursor', sessionId: string, x: number, y: number }

// A participant left — remove their cursor
{ type: 'cursor_remove', sessionId: string }
```

---

## Data Models

```typescript
// Participant as known to clients
interface Participant {
  sessionId: string;
  displayName: string;
  displayColor: string;
}

// A cursor position for the overlay
interface CursorPosition {
  x: number;
  y: number;
  displayName: string;
  displayColor: string;
}

// Self-identity received on ack
interface ParticipantInfo {
  sessionId: string;
  displayName: string;
  displayColor: string;
}

// Server-side room entry (roomManager.js)
interface RoomState {
  roomId: string;
  boardState: Stroke[];          // ordered array of all committed strokes
  clients: Map<string, ClientEntry>;
}

interface ClientEntry {
  ws: WebSocket;
  sessionId: string;
  displayName: string;
  displayColor: string;
}
```

### Predefined Identity Assets

**Display names** (20 minimum): Fox, Otter, Panda, Wolf, Lynx, Hawk, Bear, Mink, Raven, Ibis, Crane, Dingo, Finch, Gecko, Heron, Jackal, Kite, Lemur, Moose, Newt

**Display colors** (8 minimum, WCAG AA contrast on white): `#D32F2F` (red), `#1976D2` (blue), `#388E3C` (green), `#7B1FA2` (purple), `#F57C00` (orange), `#0097A7` (teal), `#5D4037` (brown), `#455A64` (slate)

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Stroke broadcast — all peers receive, sender does not

*For any* room with N connected clients, when one client sends a stroke, every other N-1 clients should receive exactly that stroke (same id, same data, with a numeric timestamp field), and the sending client should receive no echo of that stroke.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

---

### Property 2: Remote stroke deduplication

*For any* client whose dedup set receives the same stroke id twice (e.g. after a reconnect), the resulting local stroke list should contain that id exactly once — identical to the list size after the first delivery.

**Validates: Requirements 2.5**

---

### Property 3: Stroke serialization round-trip (all 7 types)

*For any* valid Stroke of any of the seven types (pencil, eraser, line, arrow, rectangle, circle, text), serializing it to JSON and deserializing it back should produce a structurally equivalent Stroke with no field loss or type coercion.

**Validates: Requirements 2.6**

---

### Property 4: Board state sync round-trip

*For any* ordered sequence of strokes committed to a room, a client that joins (or rejoins) should receive a `sync` message whose strokes array is identical in length, ids, and order to the committed sequence.

**Validates: Requirements 3.1, 3.2, 3.5**

---

### Property 5: Participant count accuracy

*For any* sequence of join and leave events in a room, the participant list broadcast after each event should have a length exactly equal to the number of currently connected WebSocket clients in that room, and that count must include the local client itself.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

---

### Property 6: Cursor relay — no echo, correct recipients

*For any* cursor update sent by client A in a room containing clients A, B, and C, each of B and C should receive exactly one cursor event carrying A's sessionId, while A receives no cursor event from itself.

**Validates: Requirements 5.1, 5.2**

---

### Property 7: Unique color assignment when room ≤ palette size

*For any* room where the number of simultaneously connected participants is at most 8 (the palette size), all assigned Display_Colors should be pairwise distinct.

**Validates: Requirements 6.3, 6.5**

---

### Property 8: Identity fields within predefined sets

*For any* client connection, the server-assigned Display_Name should be a member of the predefined animal names list and the Display_Color should be a member of the predefined palette; the Session_ID should be a valid UUID v4 string.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

---

### Property 9: Exponential backoff delay sequence

*For any* reconnection attempt number n (0-indexed), the computed retry delay should equal `min(1000 × 2^n, 30000)` milliseconds — i.e. 1s, 2s, 4s, 8s, 16s, 30s (capped), 30s, … — regardless of the surrounding application state.

**Validates: Requirements 7.2**

---

### Property 10: Post-reconnect sync completeness

*For any* set of strokes added to a room while a client was disconnected, after a successful reconnection and receipt of the `sync` message, the client's local stroke list should contain every stroke that was in the room's board state at the time of sync (i.e. local strokes ⊇ board state strokes, modulo deduplication).

**Validates: Requirements 7.4, 3.5**

---

### Property 11: Max retries leads to failed status

*For any* sequence of exactly 10 consecutive failed reconnection attempts, the `connectionStatus` returned by `useCollaboration` should become `'failed'` and no further reconnection timers should be scheduled.

**Validates: Requirements 7.6**

---

### Property 12: Room isolation

*For any* two WebSocket connections where both use the same `roomId`, they should be assigned to the same Room object on the server; for any two connections using different `roomId` values, they should be in different Room objects and strokes from one room must not appear in the other.

**Validates: Requirements 1.2, 8.3**

---

### Property 13: Malformed message server resilience

*For any* malformed JSON string or message with an unrecognized `type` field received by the server, the server process should remain running, the sending connection should remain open, and all other clients in the same room should continue to receive subsequent valid messages without interruption.

**Validates: Requirements 8.4**

---

### Property 14: roomId extraction from URL path

*For any* WebSocket connection URL of the form `ws://host:port/board/<roomId>`, the server should extract and store a `roomId` string that exactly matches the `<roomId>` path segment.

**Validates: Requirements 8.6**

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| WebSocket close (code 1000–1015) | `useCollaboration` triggers reconnect with exponential backoff; Connection_Banner shown |
| WebSocket error event | Treated as a close; same reconnect path |
| Server receives malformed JSON | `try/catch` around `JSON.parse`; log error; skip message |
| Server receives unknown `type` | Log warning; skip message |
| 10 consecutive reconnect failures | Stop retrying; show "Could not reconnect. Please refresh." banner |
| Stroke with duplicate id received | Dedup set check; stroke silently ignored |
| `sync` message replaces local state | Local strokes overwritten; redo stack cleared (no history conflict) |

---

## Testing Strategy

### Unit Tests (Vitest)

Focus on specific examples, edge cases, and error conditions that are easiest to verify with concrete inputs:

- Route renders with roomId visible in header (Requirement 1.5)
- Initial connection status is `'connecting'`, not `'reconnecting'` (Requirement 7.5)
- `WS_PORT` env var respected by server (Requirement 8.2)
- Cursor overlay rendered on a separate DOM layer (Requirement 5.6)
- "You" label rendered for self cursor (Requirement 5.4)

### Property-Based Tests (fast-check)

Each correctness property is implemented as a single property-based test using [fast-check](https://fast-check.io/), configured for a minimum of 100 iterations per test.

Each test is annotated:

```
// Feature: realtime-whiteboard-collaboration, Property N: <property text>
```

| Property | Scope | Test Description |
|----------|-------|-----------------|
| Property 1 | server | For any N clients and arbitrary stroke, all N-1 peers receive it with timestamp; sender does not |
| Property 2 | client | For any stroke id delivered twice, list contains it exactly once |
| Property 3 | server/client | For any 7-type stroke, JSON serialization round-trip produces equivalent object |
| Property 4 | server | For any stroke sequence, joining client's sync matches committed sequence |
| Property 5 | server | For any join/leave sequence, broadcast participant count equals connected count |
| Property 6 | server | For any cursor update from A, B and C receive it; A does not |
| Property 7 | server | For any room ≤ 8 participants, all Display_Colors are distinct |
| Property 8 | server | For any connection, assigned name ∈ name list, color ∈ palette, sessionId is UUID v4 |
| Property 9 | client | For any attempt n, backoff delay = min(1000×2^n, 30000) |
| Property 10 | client | For any missed strokes, post-reconnect local list ⊇ room board state |
| Property 11 | client | After 10 consecutive failures, connectionStatus = 'failed', no further timers |
| Property 12 | server | Same roomId → same room; different roomIds → isolated rooms, no cross-room stroke leakage |
| Property 13 | server | For any malformed input, server stays up and peers receive subsequent messages |
| Property 14 | server | For any URL ws://host:port/board/<roomId>, extracted roomId = <roomId> |

**Property test configuration**: fast-check with `{ numRuns: 100 }` per property. Server-side properties run against `roomManager.js` directly (in-process, no network). Client-side properties run against pure logic extracted from `useCollaboration` (dedup, merge, backoff).
