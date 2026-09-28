const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');
const {
  addClient,
  removeClient,
  getClients,
  appendStroke,
  getBoardState,
  broadcastToRoom,
} = require('./roomManager');

const PORT = process.env.WS_PORT ?? 8080;

const DISPLAY_NAMES = [
  'Fox', 'Otter', 'Panda', 'Wolf', 'Lynx', 'Hawk', 'Bear', 'Mink',
  'Raven', 'Ibis', 'Crane', 'Dingo', 'Finch', 'Gecko', 'Heron',
  'Jackal', 'Kite', 'Lemur', 'Moose', 'Newt',
];

const DISPLAY_COLORS = [
  '#D32F2F', '#1976D2', '#388E3C', '#7B1FA2',
  '#F57C00', '#0097A7', '#5D4037', '#455A64',
];

function pickDisplayName() {
  return DISPLAY_NAMES[Math.floor(Math.random() * DISPLAY_NAMES.length)];
}

function pickDisplayColor(roomId) {
  const taken = new Set(getClients(roomId).map((c) => c.displayColor));
  const available = DISPLAY_COLORS.filter((c) => !taken.has(c));
  const pool = available.length > 0 ? available : DISPLAY_COLORS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function parseRoomId(url) {
  // URL is like /board/<roomId>
  const match = (url || '').match(/^\/board\/([^/?#]+)/);
  return match ? match[1] : null;
}

const wss = new WebSocketServer({ port: PORT });

wss.on('listening', () => {
  console.log(`WebSocket server listening on ws://localhost:${PORT}`);
});

wss.on('connection', (ws, req) => {
  const roomId = parseRoomId(req.url);

  if (!roomId) {
    ws.close(1008, 'Missing roomId in URL');
    return;
  }

  const sessionId = uuidv4();
  const displayName = pickDisplayName();
  const displayColor = pickDisplayColor(roomId);

  const clientEntry = { ws, sessionId, displayName, displayColor };
  addClient(roomId, clientEntry);

  // 1. Send ack (identity)
  ws.send(JSON.stringify({ type: 'ack', sessionId, displayName, displayColor }));

  // 2. Send current board state
  ws.send(JSON.stringify({ type: 'sync', strokes: getBoardState(roomId) }));

  // 3. Broadcast updated participant list to all in room
  broadcastParticipants(roomId);

  // ── Message handling ─────────────────────────────────────────────────────
  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (err) {
      console.error(`[${roomId}] Malformed message:`, err.message);
      return;
    }

    switch (msg.type) {
      case 'stroke': {
        const stroke = { ...msg.stroke, timestamp: Date.now() };
        appendStroke(roomId, stroke);
        broadcastToRoom(roomId, { type: 'stroke', stroke, senderId: sessionId }, sessionId);
        break;
      }
      case 'cursor': {
        broadcastToRoom(
          roomId,
          { type: 'cursor', sessionId, x: msg.x, y: msg.y, displayName, displayColor },
          sessionId
        );
        break;
      }
      default:
        console.warn(`[${roomId}] Unknown message type: ${msg.type}`);
    }
  });

  // ── Disconnect handling ──────────────────────────────────────────────────
  ws.on('close', () => {
    removeClient(roomId, sessionId);
    broadcastToRoom(roomId, { type: 'cursor_remove', sessionId });
    broadcastParticipants(roomId);
  });

  ws.on('error', (err) => {
    console.error(`[${roomId}] WS error for ${sessionId}:`, err.message);
    removeClient(roomId, sessionId);
    broadcastToRoom(roomId, { type: 'cursor_remove', sessionId });
    broadcastParticipants(roomId);
  });
});

function broadcastParticipants(roomId) {
  const participants = getClients(roomId).map(({ sessionId, displayName, displayColor }) => ({
    sessionId,
    displayName,
    displayColor,
  }));
  broadcastToRoom(roomId, { type: 'participants', participants });
}
