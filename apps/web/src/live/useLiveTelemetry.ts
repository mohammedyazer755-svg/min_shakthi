import { useState, useEffect, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  SnapshotPayload,
  SnapshotChannel,
  TelemetryPayload,
  SystemHealth,
  SystemCoverage,
} from '@minsakthi/contracts';
import { useAuth } from '../auth/AuthContext';

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

let globalSocket: Socket | null = null;

function getOrCreateSocket(token: string): Socket {
  if (!globalSocket || !globalSocket.connected) {
    if (globalSocket) {
      globalSocket.disconnect();
    }
    globalSocket = io(SOCKET_URL, {
      path: '/socket.io/',
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  } else {
    // Update auth token on existing socket if changed
    globalSocket.auth = { token };
  }
  return globalSocket;
}

export function useLiveTelemetry(deviceId: string) {
  const { accessToken, user } = useAuth();

  const [snapshot, setSnapshot] = useState<SnapshotPayload | null>(null);
  const [channels, setChannels] = useState<SnapshotChannel[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [coverage, setCoverage] = useState<SystemCoverage | null>(null);
  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [lastDisplayLatencyMs, setLastDisplayLatencyMs] = useState<number | null>(null);

  const selectionGenRef = useRef(0);
  const currentDeviceIdRef = useRef(deviceId);
  currentDeviceIdRef.current = deviceId;

  const handleDisplayAck = useCallback((socket: Socket, eventId: string, clientReceivedAtMs: number) => {
    // Double requestAnimationFrame as browser paint proxy per specification (T26, R18)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const renderCompleteAtMs = performance.now();
        const latency = renderCompleteAtMs - clientReceivedAtMs;
        setLastDisplayLatencyMs(Math.round(latency));

        socket.emit('display:ack', {
          requestId: crypto.randomUUID(),
          eventId,
          clientReceivedAtMs,
          renderCompleteAtMs,
        });
      });
    });
  }, []);

  useEffect(() => {
    if (!accessToken || !user || !deviceId) {
      setConnectionState('disconnected');
      return;
    }

    setConnectionState('connecting');
    const socket = getOrCreateSocket(accessToken);

    const onConnect = () => {
      setConnectionState('connected');
      // Subscribe to selected device
      selectionGenRef.current += 1;
      const gen = selectionGenRef.current;

      socket.emit('device:subscribe', {
        requestId: crypto.randomUUID(),
        selectionGeneration: gen,
        siteId: user.siteId,
        deviceId,
      });
    };

    const onDisconnect = () => {
      setConnectionState('disconnected');
    };

    const onConnectError = (err: Error) => {
      console.warn('[LIVE TELEMETRY] Connection error:', err.message);
      setConnectionState('disconnected');
    };

    const onSnapshot = (snap: SnapshotPayload) => {
      // Discard snapshot if generation is stale or wrong device (T07)
      if (
        snap.deviceId !== currentDeviceIdRef.current ||
        snap.selectionGeneration < selectionGenRef.current
      ) {
        return;
      }
      setSnapshot(snap);
      setChannels(snap.channels);
      setHealth(snap.health);
      setCoverage(snap.coverage);
    };

    const onTelemetryUpdate = (update: TelemetryPayload) => {
      const clientReceivedAtMs = performance.now();
      if (update.deviceId !== currentDeviceIdRef.current) {
        return;
      }

      setChannels((prev) => {
        return prev.map((ch) => {
          if (ch.rawChannelId === update.channelId) {
            return {
              ...ch,
              lastSample: update,
              lastReceivedAt: update.receivedAt,
              freshness: 'fresh',
            };
          }
          return ch;
        });
      });

      handleDisplayAck(socket, update.eventId, clientReceivedAtMs);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('state:snapshot', onSnapshot);
    socket.on('telemetry:update', onTelemetryUpdate);

    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('state:snapshot', onSnapshot);
      socket.off('telemetry:update', onTelemetryUpdate);
    };
  }, [accessToken, user, deviceId, handleDisplayAck]);

  return {
    connectionState,
    snapshot,
    channels,
    health,
    coverage,
    lastDisplayLatencyMs,
  };
}
