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

export interface ChannelHistoryMap {
  [channelId: string]: Array<{ timestamp: string; value: number | null }>;
}

export function useLiveTelemetry(deviceId: string) {
  const { accessToken, user } = useAuth();

  const [snapshot, setSnapshot] = useState<SnapshotPayload | null>(null);
  const [channels, setChannels] = useState<SnapshotChannel[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [coverage, setCoverage] = useState<SystemCoverage | null>(null);
  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [lastDisplayLatencyMs, setLastDisplayLatencyMs] = useState<number | null>(null);

  // Live buffer (capped at 200 rows - R18)
  const [livePackets, setLivePackets] = useState<TelemetryPayload[]>([]);
  // History buffer (capped at 600 points/channel - R18)
  const [powerHistory, setPowerHistory] = useState<ChannelHistoryMap>({});

  // View pause control (R18, Live Screen spec)
  const [isViewPaused, setIsViewPaused] = useState(false);
  const isViewPausedRef = useRef(false);
  isViewPausedRef.current = isViewPaused;
  const pausedBufferRef = useRef<TelemetryPayload[]>([]);
  const [pausedCatchupCount, setPausedCatchupCount] = useState(0);

  const selectionGenRef = useRef(0);
  const currentDeviceIdRef = useRef(deviceId);
  currentDeviceIdRef.current = deviceId;

  const pauseView = useCallback(() => {
    setIsViewPaused(true);
  }, []);

  const resumeView = useCallback(() => {
    setIsViewPaused(false);
    if (pausedBufferRef.current.length > 0) {
      setLivePackets((prev) => {
        const merged = [...pausedBufferRef.current, ...prev].slice(0, 200);
        return merged;
      });
      pausedBufferRef.current = [];
      setPausedCatchupCount(0);
    }
  }, []);

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

  // Periodic freshness check (fresh -> stale after 5s, offline after 30s)
  useEffect(() => {
    const timer = setInterval(() => {
      const nowMs = Date.now();
      setChannels((prev) =>
        prev.map((ch) => {
          if (!ch.lastReceivedAt || ch.freshness === 'unconfigured') {
            return ch;
          }
          const ageMs = nowMs - new Date(ch.lastReceivedAt).getTime();
          let newFreshness = ch.freshness;
          if (ageMs > 30000) {
            newFreshness = 'offline_inferred';
          } else if (ageMs > 5000) {
            newFreshness = 'stale';
          }
          if (newFreshness !== ch.freshness) {
            return { ...ch, freshness: newFreshness };
          }
          return ch;
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Main Socket Connection & Device Subscription
  useEffect(() => {
    // Reset device-scoped buffers when deviceId changes (T07)
    setLivePackets([]);
    setPowerHistory({});
    pausedBufferRef.current = [];
    setPausedCatchupCount(0);

    if (!accessToken || !user || !deviceId) {
      setConnectionState('disconnected');
      return;
    }

    setConnectionState('connecting');
    const socket = getOrCreateSocket(accessToken);

    const onConnect = () => {
      setConnectionState('connected');
      // Monotonic selection generation
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

      // Preload initial history points from snapshot samples
      const initialHist: ChannelHistoryMap = {};
      for (const ch of snap.channels) {
        if (ch.lastSample) {
          initialHist[ch.rawChannelId] = [
            { timestamp: ch.lastSample.receivedAt, value: ch.lastSample.values.power },
          ];
        }
      }
      setPowerHistory(initialHist);
    };

    const onTelemetryUpdate = (update: TelemetryPayload) => {
      const clientReceivedAtMs = performance.now();
      if (update.deviceId !== currentDeviceIdRef.current) {
        return;
      }

      // 1. Update live channels matrix
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

      // 2. Append to power history (cap at 600 points - R18)
      setPowerHistory((prev) => {
        const cur = prev[update.channelId] || [];
        const next = [...cur, { timestamp: update.receivedAt, value: update.values.power }].slice(-600);
        return {
          ...prev,
          [update.channelId]: next,
        };
      });

      // 3. Append to live packets table or pause buffer (cap at 200 rows - R18)
      if (isViewPausedRef.current) {
        pausedBufferRef.current.unshift(update);
        setPausedCatchupCount(pausedBufferRef.current.length);
      } else {
        setLivePackets((prev) => [update, ...prev].slice(0, 200));
      }

      // 4. Send display ACK with double rAF paint proxy
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
    livePackets,
    powerHistory,
    isViewPaused,
    pausedCatchupCount,
    pauseView,
    resumeView,
  };
}

export type UseLiveTelemetryResult = ReturnType<typeof useLiveTelemetry>;

