import { Stroke } from './stroke';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'failed';

export interface Participant {
  sessionId: string;
  displayName: string;
  displayColor: string;
}

export interface ParticipantInfo {
  sessionId: string;
  displayName: string;
  displayColor: string;
}

export interface CursorPosition {
  x: number;
  y: number;
  displayName: string;
  displayColor: string;
}

// ── Server → Client messages ─────────────────────────────────────────────

export interface AckMessage {
  type: 'ack';
  sessionId: string;
  displayName: string;
  displayColor: string;
}

export interface SyncMessage {
  type: 'sync';
  strokes: Stroke[];
}

export interface StrokeMessage {
  type: 'stroke';
  stroke: Stroke & { timestamp?: number };
  senderId: string;
}

export interface ParticipantsMessage {
  type: 'participants';
  participants: Participant[];
}

export interface CursorMessage {
  type: 'cursor';
  sessionId: string;
  x: number;
  y: number;
  displayName: string;
  displayColor: string;
}

export interface CursorRemoveMessage {
  type: 'cursor_remove';
  sessionId: string;
}

export type ServerMessage =
  | AckMessage
  | SyncMessage
  | StrokeMessage
  | ParticipantsMessage
  | CursorMessage
  | CursorRemoveMessage;

// ── Client → Server messages ─────────────────────────────────────────────

export interface SendStrokeMessage {
  type: 'stroke';
  stroke: Stroke;
}

export interface SendCursorMessage {
  type: 'cursor';
  x: number;
  y: number;
}

export type ClientMessage = SendStrokeMessage | SendCursorMessage;

// ── Collaboration hook state ─────────────────────────────────────────────

export interface CollaborationState {
  remoteStrokes: Stroke[];
  participants: Participant[];
  remoteCursors: Record<string, CursorPosition>;
  self: ParticipantInfo | null;
  connectionStatus: ConnectionStatus;
  sendStroke: (stroke: Stroke) => void;
  sendCursor: (x: number, y: number) => void;
}
