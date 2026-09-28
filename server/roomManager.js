// In-memory room state manager
// RoomState: { roomId, boardState: Stroke[], clients: Map<sessionId, ClientEntry> }

/** @type {Map<string, { roomId: string, boardState: any[], clients: Map<string, any> }>} */
const rooms = new Map();

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { roomId, boardState: [], clients: new Map() });
  }
  return rooms.get(roomId);
}

function addClient(roomId, clientEntry) {
  const room = getOrCreateRoom(roomId);
  room.clients.set(clientEntry.sessionId, clientEntry);
}

function removeClient(roomId, sessionId) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.clients.delete(sessionId);
  // Clean up empty rooms
  if (room.clients.size === 0) {
    rooms.delete(roomId);
  }
}

function getClients(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room.clients.values());
}

function appendStroke(roomId, stroke) {
  const room = getOrCreateRoom(roomId);
  room.boardState.push(stroke);
}

function getBoardState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return room.boardState;
}

/**
 * Broadcast a message to all clients in a room except the excluded one.
 * @param {string} roomId
 * @param {object} message
 * @param {string|null} excludeSessionId
 */
function broadcastToRoom(roomId, message, excludeSessionId = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  const data = JSON.stringify(message);
  for (const client of room.clients.values()) {
    if (client.sessionId === excludeSessionId) continue;
    if (client.ws.readyState === 1 /* OPEN */) {
      client.ws.send(data);
    }
  }
}

module.exports = {
  getOrCreateRoom,
  addClient,
  removeClient,
  getClients,
  appendStroke,
  getBoardState,
  broadcastToRoom,
};
