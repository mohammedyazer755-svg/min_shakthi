import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock, History, AlertTriangle } from 'lucide-react';
import type { IncidentRecord, IncidentSamplePoint } from '@minsakthi/contracts';

export interface IncidentReplayProps {
  incident: IncidentRecord;
}

export const IncidentReplay: React.FC<IncidentReplayProps> = ({ incident }) => {
  const samples = incident.evidence.samples;
  const [isPlaying, setIsPlaying] = useState(false); // Paused by default!
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const totalPoints = samples.length;
  const currentSample: IncidentSamplePoint | undefined = samples[currentIndex];

  // Stop playback when reaching the end
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= totalPoints - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 500); // 500ms per sample point in playback
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, totalPoints]);

  // Keyboard navigation for accessible scrubber
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentIndex((prev) => Math.min(totalPoints - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Home') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentIndex(totalPoints - 1);
      }
    },
    [totalPoints]
  );

  // Group samples by phase
  const phaseStats = useMemo(() => {
    const beforeCount = samples.filter((s) => s.phase === 'before').length;
    const duringCount = samples.filter((s) => s.phase === 'during').length;
    const afterCount = samples.filter((s) => s.phase === 'after').length;
    return { beforeCount, duringCount, afterCount };
  }, [samples]);

  if (totalPoints === 0) {
    return (
      <div
        className="p-8 text-center rounded-xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <AlertTriangle className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent)' }} />
        <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
          No Telemetry Points in Replay Window
        </div>
        <div className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          During complete hardware silence, missing packets are recorded as observation gaps rather than interpolated values.
        </div>
      </div>
    );
  }

  const phaseColor =
    currentSample?.phase === 'during'
      ? '#d97706' // amber/during
      : currentSample?.phase === 'before'
        ? '#0284c7' // blue/before
        : '#16a34a'; // green/after

  const phaseLabel =
    currentSample?.phase === 'during'
      ? 'DURING BREACH / EVENT'
      : currentSample?.phase === 'before'
        ? 'BEFORE EVENT (BASELINE)'
        : 'AFTER EVENT (RECOVERY)';

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="p-5 rounded-xl border space-y-5 focus:outline-none focus:ring-2 focus:ring-amber-500"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      aria-label="Historical Replay Timeline Scrubber"
    >
      {/* Explicit Historical Disclaimer Banner */}
      <div
        className="flex items-center justify-between px-3 py-2 rounded-lg text-xs"
        style={{
          background: 'rgba(163, 132, 69, 0.12)',
          border: '1px solid rgba(163, 132, 69, 0.3)',
          color: 'var(--accent-text, #725719)',
        }}
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span className="font-bold uppercase tracking-wider text-[11px]">
            HISTORICAL TIMELINE REPLAY — NOT LIVE TELEMETRY
          </span>
        </div>
        <span className="text-[11px] opacity-80 hidden sm:inline">
          Use Space to Play/Pause, Arrows to step
        </span>
      </div>

      {/* Synchronized Readout Card at Scrubber Position */}
      <div
        className="p-4 rounded-lg border"
        style={{ background: 'var(--canvas, #f7f6f2)', borderColor: 'var(--border)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded text-white"
              style={{ background: phaseColor }}
            >
              {phaseLabel}
            </span>
            <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
              Frame {currentIndex + 1} of {totalPoints}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="font-mono text-[11px]">
              {currentSample?.timestamp ?? '—'}
            </span>
          </div>
        </div>

        {/* Multi-channel synchronized readings */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-2.5 rounded border bg-white" style={{ borderColor: 'var(--border)' }}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              Voltage
            </div>
            <div className="text-lg font-bold font-mono text-neutral-900 mt-0.5">
              {currentSample?.voltage !== null && currentSample?.voltage !== undefined
                ? `${currentSample.voltage.toFixed(1)} V`
                : <span className="text-red-500 text-sm">GAP / MISSING</span>}
            </div>
          </div>

          <div className="p-2.5 rounded border bg-white" style={{ borderColor: 'var(--border)' }}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              Current
            </div>
            <div className="text-lg font-bold font-mono text-neutral-900 mt-0.5">
              {currentSample?.current !== null && currentSample?.current !== undefined
                ? `${currentSample.current.toFixed(2)} A`
                : <span className="text-red-500 text-sm">GAP / MISSING</span>}
            </div>
          </div>

          <div className="p-2.5 rounded border bg-white" style={{ borderColor: 'var(--border)' }}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              Active Power
            </div>
            <div className="text-lg font-bold font-mono text-neutral-900 mt-0.5">
              {currentSample?.power !== null && currentSample?.power !== undefined
                ? `${currentSample.power.toFixed(1)} W`
                : <span className="text-red-500 text-sm">GAP / MISSING</span>}
            </div>
          </div>

          <div className="p-2.5 rounded border bg-white" style={{ borderColor: 'var(--border)' }}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              Frequency
            </div>
            <div className="text-lg font-bold font-mono text-neutral-900 mt-0.5">
              {currentSample?.frequency !== null && currentSample?.frequency !== undefined
                ? `${currentSample.frequency.toFixed(2)} Hz`
                : <span className="text-red-500 text-sm">GAP / MISSING</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Visual Timeline Segments */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] font-mono font-bold text-neutral-500">
          <span>BEFORE ({phaseStats.beforeCount} pts)</span>
          <span>DURING / GAP ({phaseStats.duringCount} pts)</span>
          <span>AFTER ({phaseStats.afterCount} pts)</span>
        </div>

        {/* Scrubber slider */}
        <input
          type="range"
          min={0}
          max={totalPoints - 1}
          value={currentIndex}
          onChange={(e) => {
            setIsPlaying(false);
            setCurrentIndex(Number(e.target.value));
          }}
          className="w-full h-2.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-amber-600 focus:outline-none"
          aria-label="Timeline position"
        />

        <div className="flex justify-between text-[11px] text-neutral-400 font-mono">
          <span>{samples[0]?.timestamp.split('T')[1]?.slice(0, 8)}</span>
          <span>{currentSample?.timestamp.split('T')[1]?.slice(0, 8)}</span>
          <span>{samples[totalPoints - 1]?.timestamp.split('T')[1]?.slice(0, 8)}</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setCurrentIndex(0);
            }}
            className="p-1.5 rounded border text-neutral-600 hover:bg-neutral-100"
            style={{ borderColor: 'var(--border)' }}
            title="Jump to Start (Home)"
            aria-label="Jump to start"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsPlaying((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded font-bold text-xs text-white"
            style={{ background: isPlaying ? '#805300' : 'var(--accent, #a38445)' }}
            aria-label={isPlaying ? 'Pause replay' : 'Play replay'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Replay</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setCurrentIndex(totalPoints - 1);
            }}
            className="p-1.5 rounded border text-neutral-600 hover:bg-neutral-100"
            style={{ borderColor: 'var(--border)' }}
            title="Jump to End (End)"
            aria-label="Jump to end"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        <div className="text-[11px] text-neutral-500 font-mono">
          Speed: <strong>1.0x (Historical)</strong>
        </div>
      </div>
    </div>
  );
};

export default IncidentReplay;
