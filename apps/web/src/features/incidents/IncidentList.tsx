import React, { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  ChevronRight,
  Filter,
  RefreshCw,
  ZapOff,
  Activity,
  ServerOff,
} from 'lucide-react';
import type { IncidentRecord } from '@minsakthi/contracts';

export interface IncidentListProps {
  incidents: IncidentRecord[];
  isLoading?: boolean;
  onSelectIncident: (incident: IncidentRecord) => void;
  onRefresh?: () => void;
}

export const IncidentList: React.FC<IncidentListProps> = ({
  incidents,
  isLoading = false,
  onSelectIncident,
  onRefresh,
}) => {
  const [stateFilter, setStateFilter] = useState<'all' | 'evaluating' | 'resolved' | 'acknowledged'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'electrical_breach' | 'device_interruption' | 'transport_outage'>('all');

  const filtered = incidents.filter((inc) => {
    if (stateFilter !== 'all' && inc.state !== stateFilter) return false;
    if (typeFilter !== 'all' && inc.type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters & Refresh Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border bg-white" style={{ borderColor: 'var(--border)' }}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 mr-2">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-bold uppercase tracking-wider text-[10px]">Filter</span>
          </div>

          {/* State Filter Chips */}
          <div className="flex items-center gap-1">
            {(['all', 'evaluating', 'resolved', 'acknowledged'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStateFilter(s)}
                className="px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider transition-colors"
                style={{
                  background: stateFilter === s ? 'var(--accent, #a38445)' : 'var(--canvas, #f7f6f2)',
                  color: stateFilter === s ? '#ffffff' : 'var(--text-secondary)',
                }}
              >
                {s}
              </button>
            ))}
          </div>

          <span className="text-neutral-300 mx-1">|</span>

          {/* Type Filter Select */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | 'electrical_breach' | 'device_interruption' | 'transport_outage')}
            className="text-xs px-2.5 py-1 rounded border bg-neutral-50 focus:outline-none"
            style={{ borderColor: 'var(--border)' }}
            aria-label="Filter by incident type"
          >
            <option value="all">All Incident Types</option>
            <option value="electrical_breach">Electrical Breaches</option>
            <option value="device_interruption">Device Telemetry Silence</option>
            <option value="transport_outage">Transport Outages</option>
          </select>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="p-1.5 rounded border text-neutral-600 hover:bg-neutral-50 transition-colors"
          style={{ borderColor: 'var(--border)' }}
          title="Refresh incidents"
          aria-label="Refresh incidents"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* List / Cards */}
      {filtered.length === 0 ? (
        <div
          className="p-12 text-center rounded-xl border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-neutral-400" />
          <div className="text-sm font-bold text-neutral-700">No Incidents Found</div>
          <div className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            No electrical breaches, telemetry silence interruptions, or transport outages recorded matching current filters.
          </div>
        </div>
      ) : (
        <div className="divide-y divide-neutral-100 border rounded-xl bg-white overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          {filtered.map((inc) => {
            const isSilence = inc.type === 'device_interruption';
            const isTransport = inc.type === 'transport_outage';
            const Icon = isSilence ? ZapOff : isTransport ? ServerOff : Activity;

            const severityBadge =
              inc.severity === 'critical'
                ? 'bg-red-50 text-red-700 border-red-200'
                : inc.severity === 'warning'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200';

            const stateBadge =
              inc.state === 'resolved'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : inc.state === 'acknowledged'
                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200';

            return (
              <div
                key={inc.id}
                onClick={() => onSelectIncident(inc)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') onSelectIncident(inc); }}
                className="p-4 hover:bg-neutral-50 transition-colors cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className="p-2.5 rounded-lg border flex-shrink-0 mt-0.5"
                    style={{ background: 'var(--canvas, #f7f6f2)', borderColor: 'var(--border)' }}
                  >
                    <Icon className="w-4 h-4 text-neutral-700" />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${severityBadge}`}>
                        {inc.severity}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${stateBadge}`}>
                        {inc.state}
                      </span>
                      <span className="text-xs font-bold text-neutral-900 truncate">
                        {inc.title}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-600 line-clamp-1">
                      {inc.summary}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-neutral-400 font-mono">
                      <span>Device: <strong>{inc.deviceId}</strong></span>
                      {inc.channelId && <span>Channel: <strong>{inc.channelId}</strong></span>}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {inc.startedAt}
                      </span>
                      <span>Duration: <strong>{inc.durationMs ?? 0}s</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-amber-700 flex-shrink-0">
                  <span className="hidden sm:inline">Investigate</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default IncidentList;
