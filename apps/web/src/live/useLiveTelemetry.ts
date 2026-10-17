import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { readingFreshness, FRESHNESS_TICK_MS } from '@minsakthi/contracts/freshness';
import { deviceStreamStatus } from './status';
import { io, type Socket } from 'socket.io-client';
import type {
  SnapshotPayload,
  SnapshotChannel,
  TelemetryPayload,
  SystemHealth,
  SystemCoverage,
} from '@minsakthi/contracts';
import { useAuth } from '../auth/AuthContext';
import { API_BASE } from '../api';

const SOCKET_URL = import.meta.env.VITE_WS_URL || API_BASE;

let globalSocket: Socket | null = null;

function getOrCreateSocket(token: string): Socket {
  if (!globalSocket || !globalSocket.connected || (globalSocket.auth as { token?: string }).token !== token) {
    if (globalSocket) {
      globalSocket.disconnect();
    }
    globalSocket = io(SOCKET_URL, {
      path: '/socket.io/',
      auth: { token },
      withCredentials: true,
      transports: ['websocket'],
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
  const [receivedChannels, setChannels] = useState<SnapshotChannel[]>([]);
  const [receivedHealth, setHealth] = useState<SystemHealth | null>(null);
  const [nowMs, setNowMs] = useState(Date.now);
  const lastSnapshotAt = useRef(0);
  const serverClockOffset = useRef(0);
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

  // Age readings locally even when the open WebSocket stops delivering snapshots.
  useEffect(() => {
    if (!accessToken) return;
    const timer = setInterval(() => setNowMs(Date.now()), FRESHNESS_TICK_MS);
    return () => clearInterval(timer);
  }, [accessToken]);

  const health = snapshot?.deviceId === deviceId && connectionState === 'connected' && nowMs - lastSnapshotAt.current < 6000 ? receivedHealth : null;
  const transportAvailable = !!health && health.process === 'healthy' && health.database === 'healthy'
    && health.broker === 'connected' && health.brokerSubscribed;
  const channels = useMemo(() => (snapshot?.deviceId === deviceId ? receivedChannels : []).map((ch) => ({ ...ch,
    freshness:readingFreshness({ receivedAt:ch.lastReceivedAt,retained:ch.lastSample?.retained,
      suspectDuplicate:ch.lastSample?.quality.includes('SUSPECT_DUPLICATE'),
      configured:ch.freshness !== 'unconfigured',expectedIntervalMs:snapshot?.expectedIntervalMs,
      nowMs:nowMs + serverClockOffset.current,transportAvailable }),
  })),[receivedChannels,snapshot?.expectedIntervalMs,snapshot?.deviceId,deviceId,nowMs,transportAvailable]);
  const coverage: SystemCoverage = useMemo(() => {
    const configuredSlots = channels.filter((ch) => ch.freshness !== 'unconfigured').length;
    const reportingSlots = channels.filter((ch) => ch.freshness === 'fresh').length;
    return { configuredSlots,reportingSlots,partial:reportingSlots < configuredSlots };
  },[channels]);
  const streamStatus = deviceStreamStatus(channels,connectionState === 'connected',health);

  // Main Socket Connection & Device Subscription
  useEffect(() => {
    // Reset device-scoped buffers when deviceId changes (T07)
    setLivePackets([]);
    setPowerHistory({});
    setSnapshot(null);
    setChannels([]);
    setHealth(null);
    lastSnapshotAt.current = 0;
    serverClockOffset.current = 0;
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
      setHealth(null);
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
      lastSnapshotAt.current = Date.now();
      serverClockOffset.current = Date.parse(snap.serverNow) - Date.now();
      setNowMs(Date.now());
      setChannels(snap.channels);
      setHealth(snap.health);

      // Preload initial history points from snapshot samples
      const initialHist: ChannelHistoryMap = {};
      for (const ch of snap.channels) {
        if (ch.lastSample) {
          initialHist[ch.rawChannelId] = [
            { timestamp: ch.lastSample.receivedAt, value: ch.lastSample.values.power },
          ];
        }
      }
      setPowerHistory((previous) => ({ ...initialHist,...previous }));
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
            if (ch.lastReceivedAt && Date.parse(ch.lastReceivedAt) >= Date.parse(update.receivedAt)) return ch;
            return {
              ...ch,
              lastSample: update,
              lastReceivedAt: update.receivedAt,
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
    const onResync = () => { setHealth(null); };
    socket.on('resync:required',onResync);

    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('state:snapshot', onSnapshot);
      socket.off('telemetry:update', onTelemetryUpdate);
      socket.off('resync:required',onResync);
      socket.disconnect();
    };
  }, [accessToken, user, deviceId, handleDisplayAck]);

  return {
    connectionState,
    snapshot,
    channels,
    health,
    coverage,
    streamStatus,
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

