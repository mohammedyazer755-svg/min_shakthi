import React, { useState } from 'react';
import {
  ArrowLeft,
  Printer,
  Download,
  CheckCircle,
  AlertOctagon,
  Clock,
  ShieldCheck,
  Info,
} from 'lucide-react';
import type { IncidentRecord } from '@minsakthi/contracts';
import { IncidentReplay } from './IncidentReplay';
import { API_BASE } from '../../api';
import { useAuth } from '../../auth/AuthContext';

export interface IncidentDetailProps {
  incident: IncidentRecord;
  onBack: () => void;
  onRefresh?: () => void;
}

export const IncidentDetail: React.FC<IncidentDetailProps> = ({
  incident,
  onBack,
  onRefresh,
}) => {
  const { user, accessToken } = useAuth();
  const [ackNote, setAckNote] = useState('');
  const [isSubmittingAck, setIsSubmittingAck] = useState(false);
  const [ackError, setAckError] = useState<string | null>(null);

  const canAcknowledge = user?.role === 'operator' || user?.role === 'admin';

  const handleAcknowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAcknowledge || !accessToken) return;

    setIsSubmittingAck(true);
    setAckError(null);

    try {
      const res = await fetch(
        `${API_BASE}/api/v1/sites/${incident.siteId}/incidents/${incident.id}/ack`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization:`Bearer ${accessToken}` },
          credentials: 'include',
          body: JSON.stringify({ note: ackNote.trim() || undefined }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to acknowledge incident');
      }

      setAckNote('');
      onRefresh?.();
    } catch (err) {
      setAckError((err as Error).message);
    } finally {
      setIsSubmittingAck(false);
    }
  };

  const extrema = incident.evidence.extrema;
  const gaps = incident.evidence.gaps;

  const severityBadgeClass =
    incident.severity === 'critical'
      ? 'bg-red-100 text-red-800 border-red-300'
      : incident.severity === 'warning'
        ? 'bg-amber-100 text-amber-800 border-amber-300'
        : 'bg-blue-100 text-blue-800 border-blue-300';

  const stateBadgeClass =
    incident.state === 'resolved'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
      : incident.state === 'acknowledged'
        ? 'bg-sky-100 text-sky-800 border-sky-300'
        : 'bg-amber-100 text-amber-800 border-amber-300';

  const printUrl = `${API_BASE}/api/v1/sites/${incident.siteId}/incidents/${incident.id}/export/html`;
  const csvUrl = `${API_BASE}/api/v1/sites/${incident.siteId}/incidents/${incident.id}/export/csv`;
  const [exportError,setExportError] = useState<string | null>(null);
  const exportReport = async (url: string,kind: 'html' | 'csv') => {
    if (!accessToken) return;
    // Open print destination during the gesture; the authenticated response is loaded below.
    const reportWindow = kind === 'html' ? window.open('about:blank','_blank') : null;
    if (reportWindow) reportWindow.opener = null;
    setExportError(null);
    try {
      const response = await fetch(url,{headers:{Authorization:`Bearer ${accessToken}`}});
      if (!response.ok) throw new Error('Unable to export this incident. Please retry.');
      const blobUrl = URL.createObjectURL(await response.blob());
      if (reportWindow) reportWindow.location.href = blobUrl;
      else {
        const link=document.createElement('a');
        link.href=blobUrl;link.download=`incident-${incident.id}.${kind}`;link.click();
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl),60000);
    } catch(error) { reportWindow?.close();setExportError((error as Error).message); }
  };

  return (
    <div className="space-y-6">
      {/* Top Nav Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border hover:bg-neutral-100 transition-colors"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Incidents</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { void exportReport(printUrl,'html'); }}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border hover:bg-neutral-50 transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>

          <button
            type="button"
            onClick={() => { void exportReport(csvUrl,'csv'); }}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent, #171717)' }}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {exportError && <p role="alert" className="text-sm text-red-700">{exportError}</p>}

      {/* Main Incident Overview Box */}
      <div
        className="p-6 rounded-xl border space-y-4"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${severityBadgeClass}`}>
              {incident.severity}
            </span>
            <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${stateBadgeClass}`}>
              {incident.state}
            </span>
            <span className="text-xs font-mono text-neutral-400">
              ID: {incident.id.slice(0, 8)}…
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
            <Clock className="w-3.5 h-3.5" />
            <span>Started: {incident.startedAt}</span>
          </div>
        </div>

        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {incident.title}
        </h1>

        {/* Deterministic "What Happened" Summary Callout */}
        <div
          className="p-4 rounded-lg border text-sm leading-relaxed"
          style={{
            background: 'var(--canvas, #f7f6f2)',
            borderColor: 'var(--border)',
            borderLeft: '4px solid var(--accent, #171717)',
          }}
        >
          <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">
            Deterministic Incident Finding
          </div>
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {incident.summary}
          </p>
        </div>

        {/* Evidence Boundaries & Integrity Callout */}
        <div
          className="flex items-start gap-2.5 p-3 rounded-lg text-xs leading-relaxed"
          style={{ background: '#fbfbf9', border: '1px dashed var(--border)' }}
        >
          <Info className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
          <div className="text-neutral-600 text-[11px] space-y-1">
            <div>
              <strong>Evidence Limitations:</strong> Timestamps reflect server-receipt time.
              Missing data represents lost/dropped packets; missing data is <em>never assumed to be zero electrical load</em>.
            </div>
            <div>
              <strong>Cause Confirmation:</strong> <code className="bg-neutral-100 px-1 py-0.5 rounded text-neutral-800">{incident.causeConfirmation}</code> — Physical causes remain unverified without edge hardware calibration diagnostics.
            </div>
          </div>
        </div>

        {/* Key Metrics Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Device</div>
            <div className="text-xs font-bold text-neutral-800 mt-0.5">{incident.deviceId}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Channel</div>
            <div className="text-xs font-bold text-neutral-800 mt-0.5">
              {incident.evidence.channelLabel ?? incident.channelId ?? 'All Channels'}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Observed Duration</div>
            <div className="text-xs font-bold text-neutral-800 mt-0.5">
              {incident.durationMs ?? 0}s
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Recovery Status</div>
            <div className="text-xs font-bold text-neutral-800 mt-0.5">
              {incident.evidence.recoveryTime ? 'Recovered' : 'Ongoing / Unverified'}
            </div>
          </div>
        </div>
      </div>

      {/* Observed Extrema Grid */}
      {(extrema.minVoltage !== undefined || extrema.maxCurrent !== undefined || extrema.maxPower !== undefined) && (
        <div
          className="p-5 rounded-xl border space-y-3"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="text-xs font-bold uppercase tracking-widest text-neutral-500">
            Observed Extrema During Incident
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="p-3 rounded border bg-white" style={{ borderColor: 'var(--border)' }}>
              <div className="text-[10px] font-bold text-neutral-400 uppercase">Min Voltage</div>
              <div className="text-base font-bold font-mono text-neutral-900 mt-0.5">
                {extrema.minVoltage !== undefined ? `${extrema.minVoltage.toFixed(1)} V` : '—'}
              </div>
            </div>
            <div className="p-3 rounded border bg-white" style={{ borderColor: 'var(--border)' }}>
              <div className="text-[10px] font-bold text-neutral-400 uppercase">Max Voltage</div>
              <div className="text-base font-bold font-mono text-neutral-900 mt-0.5">
                {extrema.maxVoltage !== undefined ? `${extrema.maxVoltage.toFixed(1)} V` : '—'}
              </div>
            </div>
            <div className="p-3 rounded border bg-white" style={{ borderColor: 'var(--border)' }}>
              <div className="text-[10px] font-bold text-neutral-400 uppercase">Max Current</div>
              <div className="text-base font-bold font-mono text-neutral-900 mt-0.5">
                {extrema.maxCurrent !== undefined ? `${extrema.maxCurrent.toFixed(2)} A` : '—'}
              </div>
            </div>
            <div className="p-3 rounded border bg-white" style={{ borderColor: 'var(--border)' }}>
              <div className="text-[10px] font-bold text-neutral-400 uppercase">Max Power</div>
              <div className="text-base font-bold font-mono text-neutral-900 mt-0.5">
                {extrema.maxPower !== undefined ? `${extrema.maxPower.toFixed(1)} W` : '—'}
              </div>
            </div>
            <div className="p-3 rounded border bg-white" style={{ borderColor: 'var(--border)' }}>
              <div className="text-[10px] font-bold text-neutral-400 uppercase">Min Frequency</div>
              <div className="text-base font-bold font-mono text-neutral-900 mt-0.5">
                {extrema.minFrequency !== undefined ? `${extrema.minFrequency.toFixed(2)} Hz` : '—'}
              </div>
            </div>
            <div className="p-3 rounded border bg-white" style={{ borderColor: 'var(--border)' }}>
              <div className="text-[10px] font-bold text-neutral-400 uppercase">Max Frequency</div>
              <div className="text-base font-bold font-mono text-neutral-900 mt-0.5">
                {extrema.maxFrequency !== undefined ? `${extrema.maxFrequency.toFixed(2)} Hz` : '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Observation Gaps Table */}
      {gaps.length > 0 && (
        <div
          className="p-5 rounded-xl border space-y-3"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral-500">
            <AlertOctagon className="w-4 h-4 text-amber-500" />
            <span>Recorded Observation Gaps ({gaps.length})</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                  <th className="py-2 px-3">Gap Start</th>
                  <th className="py-2 px-3">Gap End</th>
                  <th className="py-2 px-3">Duration</th>
                  <th className="py-2 px-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-mono">
                {gaps.map((g, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50">
                    <td className="py-2 px-3">{g.startAt}</td>
                    <td className="py-2 px-3">{g.endAt ?? <span className="text-amber-600 font-bold">Active</span>}</td>
                    <td className="py-2 px-3">{g.durationMs ? `${Math.round(g.durationMs / 1000)}s` : 'Active'}</td>
                    <td className="py-2 px-3 font-sans text-neutral-600">{g.reason ?? 'Telemetry silence'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Interactive Replay Scrubber */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-600">
          Historical Investigation Replay
        </h2>
        <IncidentReplay incident={incident} />
      </div>

      {/* Operator Acknowledgement Section */}
      <div
        className="p-5 rounded-xl border space-y-4"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
            Incident Acknowledgement &amp; Audit
          </h3>
        </div>

        {incident.acknowledgements.length > 0 ? (
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-neutral-500">Acknowledgement History:</div>
            <div className="divide-y divide-neutral-100 border rounded-lg bg-neutral-50">
              {incident.acknowledgements.map((ack) => (
                <div key={ack.id} className="p-3 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-neutral-800">{ack.userDisplayName ?? ack.userId}</span>
                    <span className="text-neutral-400 ml-2">({ack.ackAt})</span>
                    {ack.note && <p className="text-neutral-600 mt-1 italic">&ldquo;{ack.note}&rdquo;</p>}
                  </div>
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs text-neutral-400 italic">No user acknowledgements recorded yet.</div>
        )}

        {canAcknowledge && (
          <form onSubmit={handleAcknowledge} className="space-y-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
            {ackError && (
              <div className="p-2 rounded bg-red-50 text-red-700 text-xs font-semibold">
                {ackError}
              </div>
            )}
            <div>
              <label htmlFor="ack-note" className="block text-[11px] font-bold uppercase text-neutral-500 mb-1">
                Acknowledgement Note (Optional)
              </label>
              <input
                id="ack-note"
                type="text"
                value={ackNote}
                onChange={(e) => setAckNote(e.target.value)}
                placeholder="e.g. Investigated HVAC compressor overload; breaker reset"
                className="w-full px-3 py-2 text-xs rounded border bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                style={{ borderColor: 'var(--border)' }}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmittingAck}
              className="px-4 py-2 rounded text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--accent, #171717)' }}
            >
              {isSubmittingAck ? 'Acknowledging...' : 'Acknowledge Incident'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default IncidentDetail;
