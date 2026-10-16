import React, { useState } from 'react';
import { Card } from './Card';
import { MetricCard } from './MetricCard';
import { Button } from './Button';
import { Input } from './Input';
import { StatusSummary } from './StatusSummary';
import { FreshnessLabel } from './FreshnessLabel';
import { AlertBadge } from './AlertBadge';
import { DataTable, type ColumnDef } from './DataTable';
import { EmptyState } from './EmptyState';
import { ErrorBanner } from './ErrorBanner';
import { Monitor, Smartphone } from 'lucide-react';
import type { ChannelFreshness } from '@minsakthi/contracts';

interface TestChannelRow {
  slot: string;
  rawChannelId: string;
  label: string;
  voltage: number | null;
  current: number | null;
  power: number | null;
  freshness: ChannelFreshness;
}

export const ComponentShowcase: React.FC = () => {
  const [viewportMode, setViewportMode] = useState<'responsive' | 'mobile_390' | 'desktop_1440'>('responsive');
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const testChannels: TestChannelRow[] = [
    {
      slot: 'CH01',
      rawChannelId: 'channel1',
      label: 'Main Incomer',
      voltage: 239.67,
      current: 0.14,
      power: 33.22,
      freshness: 'fresh',
    },
    {
      slot: 'CH02',
      rawChannelId: 'channel2',
      label: 'HVAC Feeder',
      voltage: 239.67,
      current: 0.8,
      power: 191.17,
      freshness: 'fresh',
    },
    {
      slot: 'CH03',
      rawChannelId: 'channel3',
      label: 'Server Rack A',
      voltage: 240.0,
      current: 0.0,
      power: 0.0,
      freshness: 'fresh', // Valid zero measurement
    },
    {
      slot: 'CH04',
      rawChannelId: 'channel4',
      label: 'Compressor 2',
      voltage: 238.1,
      current: 4.5,
      power: 1071.45,
      freshness: 'stale', // Stale age
    },
    {
      slot: 'CH05',
      rawChannelId: 'unconfigured',
      label: 'Not Configured',
      voltage: null,
      current: null,
      power: null,
      freshness: 'unconfigured', // Honest null
    },
  ];

  const columns: ColumnDef<TestChannelRow>[] = [
    {
      key: 'slot',
      header: 'Slot',
      align: 'left',
      render: (r) => <span className="font-semibold">{r.slot}</span>,
    },
    {
      key: 'label',
      header: 'Channel & Assignment',
      align: 'left',
      render: (r) => (
        <div>
          <div className="font-medium text-text-primary">{r.label}</div>
          <div className="text-xs text-text-secondary">{r.rawChannelId}</div>
        </div>
      ),
    },
    {
      key: 'voltage',
      header: 'Voltage (V)',
      align: 'right',
      render: (r) => (r.voltage !== null ? `${r.voltage.toFixed(2)}` : '—'),
    },
    {
      key: 'current',
      header: 'Current (A)',
      align: 'right',
      render: (r) => (r.current !== null ? `${r.current.toFixed(2)}` : '—'),
    },
    {
      key: 'power',
      header: 'Power (W)',
      align: 'right',
      render: (r) => (r.power !== null ? `${r.power.toFixed(2)}` : '—'),
    },
    {
      key: 'freshness',
      header: 'Status',
      align: 'center',
      render: (r) => <FreshnessLabel freshness={r.freshness} />,
    },
  ];

  const containerClasses = {
    responsive: 'w-full',
    mobile_390: 'max-w-[390px] mx-auto border-x border-dashed border-brand-gold/40 shadow-md',
    desktop_1440: 'max-w-[1440px] mx-auto border border-dashed border-brand-gold/40 shadow-md',
  }[viewportMode];

  return (
    <div className="space-y-8">
      {/* Viewport & Test Mode Bar */}
      <div className="bg-surface border border-border p-4 rounded-card flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-block px-2 py-0.5 text-xs font-bold bg-amber-100 text-brand-gold-text border border-amber-300 rounded">
              TEST ONLY SHOWCASE
            </span>
            <h2 className="text-sm font-semibold text-text-primary">
              Design System & Component Primitives
            </h2>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Isolated visual harness outside production routes. No fake live data or unauthenticated dashboards.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-text-secondary font-medium">Preview Width:</span>
          <Button
            size="sm"
            variant={viewportMode === 'responsive' ? 'primary' : 'secondary'}
            onClick={() => setViewportMode('responsive')}
          >
            Responsive
          </Button>
          <Button
            size="sm"
            variant={viewportMode === 'mobile_390' ? 'primary' : 'secondary'}
            onClick={() => setViewportMode('mobile_390')}
            className="inline-flex items-center space-x-1"
          >
            <Smartphone className="w-3.5 h-3.5 mr-1" />
            390px (Mobile)
          </Button>
          <Button
            size="sm"
            variant={viewportMode === 'desktop_1440' ? 'primary' : 'secondary'}
            onClick={() => setViewportMode('desktop_1440')}
            className="inline-flex items-center space-x-1"
          >
            <Monitor className="w-3.5 h-3.5 mr-1" />
            1440px (Desktop)
          </Button>
        </div>
      </div>

      <div className={containerClasses}>
        <div className="space-y-8">
          {/* Error Banner Demonstration */}
          {!bannerDismissed && (
            <ErrorBanner
              title="Connection Warning (Test Simulation)"
              message="Ingest service lost connection to broker. Last known values are held as stale; no synthetic data will be generated."
              actionText="Inspect Diagnostics"
              onAction={() => alert('Diagnostics action triggered (Showcase Test)')}
              onDismiss={() => setBannerDismissed(true)}
            />
          )}

          {/* Section 1: KPI Metrics & Honest States */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">
              1. Metric Cards (With Nulls and Valid Zero)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Reporting Power Subtotal"
                value="224.39"
                unit="W"
                subtext="Partial · 2/5 reporting (CH01, CH02)"
                testOnly
              />
              <MetricCard
                label="Feeder Voltage"
                value="239.67"
                unit="V"
                subtext="Phase L1 · Reported"
                testOnly
              />
              <MetricCard
                label="Server Rack Load"
                value="0.00"
                unit="W"
                subtext="Valid zero measurement (Fresh)"
                testOnly
              />
              <MetricCard
                label="Unconfigured Slot"
                value={null}
                unit="W"
                subtext="CH05 slot unconfigured — no fake zero"
                testOnly
              />
            </div>
          </section>

          {/* Section 2: Health & Freshness Primitives */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">
              2. Status & Freshness Primitives (Never Color Alone)
            </h3>
            <Card className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Separated System Health Layers</h4>
                <div className="flex flex-wrap gap-3">
                  <StatusSummary
                    health={{
                      process: 'healthy',
                      broker: 'connected',
                      brokerSubscribed: true,
                      database: 'healthy',
                      persistenceLagMs: 0,
                    }}
                    socketConnected={true}
                  />
                  <StatusSummary
                    health={{
                      process: 'healthy',
                      broker: 'disconnected',
                      brokerSubscribed: false,
                      database: 'degraded',
                      persistenceLagMs: 4200,
                    }}
                    socketConnected={false}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border">
                <h4 className="text-sm font-semibold mb-2">Channel Freshness Indicators</h4>
                <div className="flex flex-wrap gap-2">
                  <FreshnessLabel freshness="fresh" lastReceivedAt={new Date().toISOString()} />
                  <FreshnessLabel freshness="stale" lastReceivedAt={new Date(Date.now() - 20000).toISOString()} />
                  <FreshnessLabel freshness="offline_inferred" lastReceivedAt={new Date(Date.now() - 60000).toISOString()} />
                  <FreshnessLabel freshness="unseen" />
                  <FreshnessLabel freshness="unconfigured" />
                </div>
              </div>

              <div className="pt-3 border-t border-border">
                <h4 className="text-sm font-semibold mb-2">Alert Severity Badges</h4>
                <div className="flex flex-wrap gap-2">
                  <AlertBadge severity="critical" count={2} />
                  <AlertBadge severity="warning" count={5} />
                  <AlertBadge severity="info" count={1} />
                </div>
              </div>
            </Card>
          </section>

          {/* Section 3: Semantic Table */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">
              3. Channel Telemetry Table (Semantic, Tabular Numerals)
            </h3>
            <DataTable
              caption="TEST ONLY Hardware Channels Telemetry"
              columns={columns}
              data={testChannels}
            />
          </section>

          {/* Section 4: Form Controls & Buttons */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">
              4. Form Controls & Buttons (44px Minimum Touch Target)
            </h3>
            <Card className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Device Identifier"
                  defaultValue="prototype1"
                  helperText="Case-sensitive hardware identifier."
                />
                <Input
                  label="Channel Mapping Slot"
                  defaultValue="CH01"
                  error="Display slot CH01 already assigned to channel1."
                />
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary Action</Button>
                <Button variant="secondary">Secondary Action</Button>
                <Button variant="danger">Critical Action</Button>
                <Button variant="ghost">Ghost Button</Button>
                <Button variant="primary" isLoading>
                  Loading State
                </Button>
                <Button variant="secondary" disabled>
                  Disabled
                </Button>
              </div>
            </Card>
          </section>

          {/* Section 5: Empty State */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">
              5. Empty State Primitive
            </h3>
            <EmptyState
              title="No Historical Readings Recorded"
              description="No telemetry packets have been received for this device in the selected 24-hour range. Check the broker connection and ensure hardware is powered."
              action={
                <Button size="sm" variant="secondary">
                  Reset Time Range
                </Button>
              }
            />
          </section>
        </div>
      </div>
    </div>
  );
};
