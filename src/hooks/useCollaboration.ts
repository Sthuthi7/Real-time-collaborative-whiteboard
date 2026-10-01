'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Stroke } from '../types/stroke';
import {
  CollaborationState,
  Participant,
  ParticipantInfo,
  CursorPosition,
  ConnectionStatus,
  ServerMessage,
} from '../types/collaboration';

const MAX_RETRIES = 10;
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8080';

export function computeDelay(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 30000);
}

export function useCollaboration(roomId: string, onRemoteClear?: () => void): CollaborationState {
  const [remoteStrokes, setRemoteStrokes] = useState<Stroke[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, CursorPosition>>({});
  const [self, setSelf] = useState<ParticipantInfo | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');

  const wsRef = useRef<WebSocket | null>(null);
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const lastCursorSent = useRef<number>(0);
  const unmounted = useRef(false);

  const connect = useCallback(() => {
    if (unmounted.current) return;

    const ws = new WebSocket(`${WS_URL}/board/${roomId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (unmounted.current) return;
      retryCount.current = 0;
      setConnectionStatus('connected');
    };

    ws.onmessage = (event) => {
      if (unmounted.current) return;
      let msg: ServerMessage;
      try {
        msg = JSON.parse(event.data) as ServerMessage;
      } catch {
        return;
      }

      switch (msg.type) {
        case 'ack': {
          setSelf({ sessionId: msg.sessionId, displayName: msg.displayName, displayColor: msg.displayColor });
          break;
        }
        case 'sync': {
          // Replace local remote strokes with board state; seed dedup set
          seenIds.current = new Set(msg.strokes.map((s) => s.id));
          setRemoteStrokes(msg.strokes);
          break;
        }
        case 'stroke': {
          const s = msg.stroke;
          if (seenIds.current.has(s.id)) break;
          seenIds.current.add(s.id);
          setRemoteStrokes((prev) => [...prev, s]);
          break;
        }
        case 'participants': {
          setParticipants(msg.participants);
          break;
        }
        case 'cursor': {
          setRemoteCursors((prev) => ({
            ...prev,
            [msg.sessionId]: {
              x: msg.x,
              y: msg.y,
              displayName: msg.displayName,
              displayColor: msg.displayColor,
            },
          }));
          break;
        }
        case 'cursor_remove': {
          setRemoteCursors((prev) => {
            const next = { ...prev };
            delete next[msg.sessionId];
            return next;
          });
          break;
        }
        case 'clear': {
          seenIds.current = new Set();
          setRemoteStrokes([]);
          onRemoteClear?.();
          break;
        }
      }
    };

    ws.onclose = () => {
      if (unmounted.current) return;
      scheduleReconnect();
    };

    ws.onerror = () => {
      if (unmounted.current) return;
      ws.close();
    };
  }, [roomId]);

  const scheduleReconnect = useCallback(() => {
    if (unmounted.current) return;
    if (retryCount.current >= MAX_RETRIES) {
      setConnectionStatus('failed');
      return;
    }
    setConnectionStatus('reconnecting');
    const delay = computeDelay(retryCount.current);
    retryCount.current += 1;
    retryTimer.current = setTimeout(() => {
      if (!unmounted.current) connect();
    }, delay);
  }, [connect]);

  useEffect(() => {
    unmounted.current = false;
    connect();
    return () => {
      unmounted.current = true;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendStroke = useCallback((stroke: Stroke) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'stroke', stroke }));
    }
  }, []);

  const sendCursor = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - lastCursorSent.current < 50) return;
    lastCursorSent.current = now;
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'cursor', x, y }));
    }
  }, []);

  const sendClear = useCallback(() => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'clear' }));
    }
  }, []);

  return {
    remoteStrokes,
    participants,
    remoteCursors,
    self,
    connectionStatus,
    sendStroke,
    sendCursor,
    sendClear,
  };
}
