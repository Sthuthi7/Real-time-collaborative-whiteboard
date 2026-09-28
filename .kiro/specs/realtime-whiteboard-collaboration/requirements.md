# Requirements Document

## Introduction

Phase 2 adds real-time multi-user collaboration to the existing single-user whiteboard. Users join a shared board via a URL (e.g. `/board/[roomId]`). Every stroke drawn by any user is broadcast to all other users in the same room in real time. The system also shows live cursor positions and an online-user count. If a connection drops, the client reconnects automatically and re-syncs the full board state.

The existing Phase 1 canvas, tools, and history stack remain intact. Phase 2 layers a WebSocket server and collaboration hooks on top.

## Glossary

- **Client**: The browser-side Next.js application running in a user's tab.
- **Server**: The Node.js WebSocket server (`ws` package) that manages rooms and relays messages.
- **Room**: A shared drawing session identified by a unique `roomId` string.
- **Stroke**: A completed drawing action as defined in `src/types/stroke.ts` (pencil, eraser, line, arrow, rectangle, circle, text).
- **Participant**: A user currently connected to a room via WebSocket.
- **Cursor**: The live mouse position of a participant on the canvas, expressed as `{ x, y }` in canvas-local coordinates.
- **Board_State**: The ordered array of all committed Strokes for a room, stored server-side.
- **Session_ID**: A UUID assigned by the Server to each WebSocket connection upon joining.
- **Display_Name**: A short human-readable label (e.g. "Fox", "Otter") randomly assigned to each Participant on join.
- **Display_Color**: A hex color randomly assigned to each Participant on join, used for cursor labels.
- **Connection_Banner**: A UI overlay shown on the Client when the WebSocket is not in a connected state.
- **Collaboration_Hook**: The `useCollaboration` React hook that manages WebSocket lifecycle, message dispatch, and state sync.

---

## Requirements

### Requirement 1: Room-based URL Routing

**User Story:** As a user, I want to join a shared whiteboard by visiting a URL, so that I can collaborate with others without any sign-up or configuration.

#### Acceptance Criteria

1. THE Client SHALL serve a whiteboard page at the route `/board/[roomId]` where `roomId` is a non-empty string.
2. WHEN two or more Clients navigate to the same `/board/[roomId]` URL, THE Server SHALL place them in the same Room.
3. WHEN a Client navigates to `/board/[roomId]`, THE Client SHALL establish a WebSocket connection to the Server, passing `roomId` as part of the connection URL or handshake.
4. WHEN a Client disconnects from a Room, THE Server SHALL remove that Participant from the Room's active participant list.
5. THE Client SHALL display the `roomId` in the page title or a visible header so users can confirm which board they are on.

---

### Requirement 2: Real-time Stroke Synchronization

**User Story:** As a user, I want every stroke I draw to appear on all other participants' canvases immediately, so that we can collaborate on the same drawing in real time.

#### Acceptance Criteria

1. WHEN a Client commits a Stroke (any of: pencil, eraser, line, arrow, rectangle, circle, text), THE Collaboration_Hook SHALL send that Stroke to the Server via the WebSocket connection.
2. WHEN the Server receives a Stroke from one Client, THE Server SHALL broadcast that Stroke to all other Clients in the same Room.
3. WHEN a Client receives a Stroke broadcast from the Server, THE Client SHALL append that Stroke to its local stroke list and render it on the canvas.
4. THE Server SHALL assign each incoming Stroke a server-side timestamp before broadcasting, preserving ordering across Clients.
5. WHEN a Client receives a remote Stroke that has the same `id` as an existing local Stroke, THE Client SHALL ignore the duplicate.
6. THE Collaboration_Hook SHALL support all seven Stroke types defined in `src/types/stroke.ts` without loss of data.

---

### Requirement 3: Board State Sync on Join

**User Story:** As a user, I want to see the full board history when I join a room, so that I don't miss work that was done before I arrived.

#### Acceptance Criteria

1. WHEN a Client joins a Room, THE Server SHALL send the current Board_State (all committed Strokes in order) to that Client as a single `sync` message.
2. WHEN a Client receives a `sync` message, THE Client SHALL replace its local stroke list with the received Board_State.
3. THE Server SHALL maintain Board_State in memory for the lifetime of the Room (at minimum while at least one Participant is connected).
4. WHEN all Participants leave a Room, THE Server MAY discard that Room's Board_State.
5. WHEN a Client rejoins after a reconnection, THE Server SHALL send the current Board_State again so the Client is fully up to date.

---

### Requirement 4: Presence — Online User Count

**User Story:** As a user, I want to see how many people are currently online in the room, so that I know I'm collaborating with others.

#### Acceptance Criteria

1. THE Client SHALL display the count of currently connected Participants in the Room as a visible UI element (e.g. "3 online").
2. WHEN a Participant joins or leaves the Room, THE Server SHALL broadcast an updated participant list to all remaining Clients in the Room.
3. WHEN a Client receives an updated participant list, THE Client SHALL update the displayed online count immediately.
4. THE count displayed SHALL include the local user themselves.

---

### Requirement 5: Presence — Live Cursor Sharing

**User Story:** As a user, I want to see the live cursor positions of other participants on the canvas, so that I can follow along with what they are drawing.

#### Acceptance Criteria

1. WHEN a Participant moves their mouse over the canvas, THE Collaboration_Hook SHALL throttle cursor-position updates to at most one message per 50 ms and send the current `{ x, y }` canvas coordinates to the Server.
2. WHEN the Server receives a cursor update from a Client, THE Server SHALL relay it to all other Clients in the same Room (not echo back to the sender).
3. WHEN a Client receives a cursor update, THE Client SHALL render a colored dot or crosshair at those canvas coordinates with the Display_Name label of the sender.
4. THE Client SHALL render its own cursor as a label "You" using its own Display_Color, distinct from remote cursors.
5. WHEN a Participant leaves the Room, THE Server SHALL broadcast a cursor-remove event so other Clients remove that participant's cursor overlay.
6. Cursor overlays SHALL be rendered on a separate HTML layer above the canvas so they do not affect the drawn content.

---

### Requirement 6: Participant Identity

**User Story:** As a user, I want to be automatically assigned a display name and color when I join, so that my contributions are visually distinguishable from others.

#### Acceptance Criteria

1. WHEN a Client connects to the Server, THE Server SHALL assign a unique Session_ID (UUID v4) to that connection.
2. WHEN a Client connects, THE Server SHALL assign a Display_Name chosen randomly from a predefined list of short animal names (minimum 20 names).
3. WHEN a Client connects, THE Server SHALL assign a Display_Color chosen from a predefined palette (minimum 8 distinct, accessible colors).
4. THE Server SHALL send the assigned Session_ID, Display_Name, and Display_Color to the Client in the connection acknowledgment message.
5. WHEN Display_Colors are assigned to multiple Participants in the same Room, THE Server SHALL prefer unique colors across participants before repeating.

---

### Requirement 7: Reconnection and Connection State

**User Story:** As a user, I want the app to recover automatically if my connection drops, so that I can keep collaborating without refreshing the page.

#### Acceptance Criteria

1. WHEN the WebSocket connection is lost, THE Collaboration_Hook SHALL display the Connection_Banner with the message "Connection lost — reconnecting…".
2. WHEN the WebSocket connection is lost, THE Collaboration_Hook SHALL attempt to reconnect using exponential backoff with an initial delay of 1 s, doubling each attempt, up to a maximum delay of 30 s.
3. WHEN a reconnection attempt succeeds, THE Collaboration_Hook SHALL hide the Connection_Banner.
4. WHEN a reconnection attempt succeeds, THE Collaboration_Hook SHALL request a full Board_State sync from the Server so any Strokes missed during the outage are applied.
5. IF the Client has not connected to the Server yet (initial page load), THEN THE Collaboration_Hook SHALL NOT display the Connection_Banner; instead, THE Client SHALL show a neutral "Connecting…" indicator.
6. THE Collaboration_Hook SHALL stop reconnecting after 10 consecutive failed attempts and display a "Could not reconnect. Please refresh the page." message.

---

### Requirement 8: WebSocket Server

**User Story:** As a developer, I want a standalone Node.js WebSocket server that manages rooms, relays messages, and maintains board state, so that the collaboration backend is clearly separated from the Next.js frontend.

#### Acceptance Criteria

1. THE Server SHALL be implemented as a Node.js process using the `ws` package.
2. THE Server SHALL run on a configurable port (default 8080), read from the `WS_PORT` environment variable.
3. THE Server SHALL support multiple concurrent Rooms, each identified by a unique `roomId`.
4. WHEN a Client sends a malformed or unrecognized message, THE Server SHALL log the error and continue operating without crashing.
5. THE Server SHALL be startable via a `npm run server` (or equivalent) script defined in `package.json`.
6. THE Server SHALL parse `roomId` from the WebSocket connection URL path (e.g. `ws://host:port/board/[roomId]`).
