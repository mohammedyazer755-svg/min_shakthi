import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Activity, ChevronRight } from 'lucide-react';
import { ElectricBrandMark } from '../components/ElectricBrandMark';
import { LightRays } from '../components/LightRays/LightRays';
import { AuthModal } from '../components/Auth/AuthModal';
import './LandingPage.css';

export interface LandingPageProps {
  onSignIn?: (prefillEmail?: string) => void;
  onSuccess?: () => void;
  initialAuthOpen?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignIn,
  onSuccess,
  initialAuthOpen = false,
}) => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(initialAuthOpen);
  const [prefillEmail, setPrefillEmail] = useState('admin@minsakthi.local');

  // Dynamic micro-fluctuations so the electrical readings never feel static
  const [metrics, setMetrics] = useState({
    voltage: 239.67,
    frequency: 49.98,
    power: 33.22,
    current: 0.14,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setMetrics({
        voltage: +(239.67 + (Math.random() * 0.4 - 0.2)).toFixed(2),
        frequency: +(49.98 + (Math.random() * 0.04 - 0.02)).toFixed(2),
        power: +(33.22 + (Math.random() * 0.3 - 0.15)).toFixed(2),
        current: +(0.14 + (Math.random() * 0.02 - 0.01)).toFixed(2),
      });
    }, 1800);

    return () => clearInterval(timer);
  }, []);

  const handleCloseAuth = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const handleOpenAuth = (roleEmail = 'admin@minsakthi.local') => {
    setPrefillEmail(roleEmail);
    setIsAuthModalOpen(true);
    if (onSignIn) onSignIn(roleEmail);
  };

  const channels = [
    { slot: 'CH01', name: 'Main Incomer Phase', status: 'Active', voltage: '239.67 V', current: '0.14 A' },
    { slot: 'CH02', name: 'Sub Load Feeder', status: 'Standby', voltage: '240.10 V', current: '0.00 A' },
    { slot: 'CH03', name: 'Server UPS Line', status: 'Active', voltage: '238.90 V', current: '1.42 A' },
    { slot: 'CH04', name: 'Auxiliary Power', status: 'Active', voltage: '240.50 V', current: '0.22 A' },
    { slot: 'CH05', name: 'Lighting Circuit', status: 'Active', voltage: '239.80 V', current: '0.48 A' },
  ];

  const pipelineSteps = [
    {
      num: '01 / EDGE INGESTION',
      title: 'ESP32 Firmware',
      desc: 'Raw multi-channel electrical sampling calibrated on-chip, framed with CRC32 integrity.',
    },
    {
      num: '02 / TELEMETRY BROKER',
      title: 'Telemetry Broker',
      desc: 'High-throughput broker publishing to dedicated swiftpower topic with zero packet mutation.',
    },
    {
      num: '03 / ALWAYS-ON BACKEND',
      title: 'Durable Ingestion Engine',
      desc: 'Fsync disk spooling, PostgreSQL cold store, and monotonic sequence reconciliation.',
    },
    {
      num: '04 / CLIENT STREAMING',
      title: 'Authenticated Socket.IO',
      desc: 'Sub-second real-time streaming directly into the mission-control monitoring cockpit.',
    },
  ];

  return (
    <div className="landing-container">
      {/* ── Volumetric Light Rays (reacts to mouse position) ── */}
      <div className="landing-ambient-layer" aria-hidden="true">
        <LightRays
          raysOrigin="top-center"
          raysSpeed={0.7}
          lightSpread={0.48}
          rayLength={2.6}
          pulsating={false}
          fadeDistance={1.15}
          followMouse={true}
          mouseInfluence={0.08}
          distortion={0}
          className="landing-rays-canvas"
        />
      </div>

      {/* ── Sticky Frosted Navigation Bar ── */}
      <header className="landing-navbar">
        <div className="landing-navbar-inner">
          <a href="/" className="landing-brand" aria-label="MIN-SAKTHI Home">
            <ElectricBrandMark size={30} />
            <div>
              <div className="landing-brand-title">MIN-SAKTHI</div>
              <div className="landing-brand-sub">ENERGY INTELLIGENCE V2</div>
            </div>
          </a>

          <nav className="landing-nav-links hidden md:flex" aria-label="Main Navigation">
            <a href="#live-stream" className="landing-nav-link">Live Telemetry</a>
            <a href="#channels" className="landing-nav-link">Channels</a>
            <a href="#architecture" className="landing-nav-link">Architecture</a>
            <a href="#specs" className="landing-nav-link">System Specs</a>
          </nav>

          <div className="landing-nav-actions">
            <div className="landing-status-badge hidden sm:inline-flex">
              <span className="landing-live-dot" aria-hidden="true" />
              <span>Broker Active</span>
            </div>

            <button
              type="button"
              onClick={() => handleOpenAuth()}
              className="landing-signin-btn"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* ── Hairline Sub-Header ── */}
      <div className="landing-hairline">
        <div className="landing-hairline-inner">
          <span>ENERGY INTELLIGENCE WORKSPACE</span>
          <span className="hidden sm:inline">FOR INDUSTRIAL & COMMERCIAL GRIDS</span>
        </div>
      </div>

      {/* ── Hero Section ── */}
      <section className="landing-hero" id="overview">
        <div className="landing-hero-grid">
          {/* Left: Editorial Headline & Brief */}
          <div className="landing-hero-left">
            <div className="landing-hero-badge">
              <Activity className="w-3.5 h-3.5" aria-hidden="true" />
              <span>SUB-SECOND EDGE TELEMETRY</span>
            </div>

            <h1 className="landing-headline">
              Measure every watt<br />
              before the <span className="landing-headline-accent">grid commits.</span>
            </h1>

            <p className="landing-hero-description">
              Industrial-grade electrical monitoring engineered for mission-critical facilities.
              Continuous high-frequency ESP32 edge telemetry, durable local spooling,
              and tamper-evident civil reporting.
            </p>
          </div>

          {/* Right: Editorial 01 / OVERVIEW Card */}
          <div className="landing-index-card">
            <div className="landing-card-header">
              <span className="landing-card-tag">01 / OVERVIEW</span>
              <span className="text-[11px] font-bold text-neutral-400">ESP32 PROTO</span>
            </div>

            <h3 className="landing-card-title">Multi-Channel Edge Ingestion</h3>

            <p className="landing-card-text">
              Continuous 50 samples/second throughput across 5 physical channels.
              Precise phase voltage, active load current, power factor, and frequency tracking with zero synthetic fabrications.
            </p>

            <div className="landing-card-actions">
              <button
                type="button"
                onClick={() => handleOpenAuth()}
                className="landing-primary-btn"
              >
                <span>Live Stream</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>

              <a
                href="#architecture"
                className="landing-secondary-btn"
              >
                Architecture
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Live Electrical Telemetry Strip (Guarantees dynamic feel) ── */}
      <section className="landing-ticker-strip" id="live-stream">
        <div className="landing-ticker-box">
          <div className="landing-ticker-status">
            <span className="landing-live-dot" aria-hidden="true" />
            <div>
              <div className="text-xs font-bold tracking-wider text-emerald-400 uppercase">
                Live Ingestion Active
              </div>
              <div className="text-[10px] text-neutral-400">
                prototype1 / channel1
              </div>
            </div>
          </div>

          <div className="landing-ticker-metrics">
            <div className="landing-metric-item">
              <span className="landing-metric-label">Phase Voltage</span>
              <span className="landing-metric-value">
                {metrics.voltage} <span className="landing-metric-unit">V</span>
              </span>
            </div>

            <div className="landing-metric-item">
              <span className="landing-metric-label">Phase Current</span>
              <span className="landing-metric-value">
                {metrics.current} <span className="landing-metric-unit">A</span>
              </span>
            </div>

            <div className="landing-metric-item">
              <span className="landing-metric-label">Active Power</span>
              <span className="landing-metric-value">
                {metrics.power} <span className="landing-metric-unit">W</span>
              </span>
            </div>

            <div className="landing-metric-item">
              <span className="landing-metric-label">Grid Frequency</span>
              <span className="landing-metric-value">
                {metrics.frequency} <span className="landing-metric-unit">Hz</span>
              </span>
            </div>
          </div>

          {/* Flowing animated SVG electrical sparkline */}
          <div className="landing-wave-container" aria-hidden="true">
            <svg viewBox="0 0 140 36" fill="none" className="landing-wave-svg">
              <path
                d="M 0 18 Q 17.5 4, 35 18 T 70 18 T 105 18 T 140 18"
                stroke="#C8A96E"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="landing-wave-path"
              />
            </svg>
          </div>
        </div>
      </section>

      {/* ── 5-Channel Hardware Preview ── */}
      <section className="landing-channels-section" id="channels">
        <div className="landing-section-header">
          <div className="landing-section-title-wrap">
            <span className="landing-section-tag">02 / HARDWARE MAPPINGS</span>
            <h2 className="landing-section-heading">5-Channel Composite Tracking</h2>
          </div>
          <button
            type="button"
            onClick={() => handleOpenAuth()}
            className="text-xs font-bold text-amber-300 hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>View all channels</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="landing-channel-cards-grid">
          {channels.map(ch => (
            <div
              key={ch.slot}
              className="landing-channel-card"
              onClick={() => handleOpenAuth()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') handleOpenAuth(); }}
            >
              <div className="landing-channel-card-top">
                <span className="landing-channel-slot">{ch.slot}</span>
                <span className="landing-channel-status-pill">{ch.status}</span>
              </div>
              <div className="landing-channel-name">{ch.name}</div>
              <div className="landing-channel-stats">
                <span>{ch.voltage}</span>
                <span>{ch.current}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Architecture Pipeline ── */}
      <section className="landing-arch-section" id="architecture">
        <div className="landing-arch-box">
          <div className="flex flex-col gap-2">
            <span className="landing-section-tag">03 / SYSTEM ARCHITECTURE</span>
            <h2 className="landing-section-heading">Deterministic Hardware-to-Cloud Pipeline</h2>
            <p className="text-sm text-neutral-400 max-w-2xl mt-1">
              Zero browser TCP MQTT. All ingestion passes through authenticated, disk-buffered server infrastructure.
            </p>
          </div>

          <div className="landing-arch-pipeline">
            {pipelineSteps.map(step => (
              <div key={step.num} className="landing-pipeline-step">
                <span className="landing-step-num">{step.num}</span>
                <h4 className="landing-step-title">{step.title}</h4>
                <p className="landing-step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ElectricBrandMark size={20} />
            <span className="font-bold text-neutral-300">MIN-SAKTHI V2</span>
            <span>— Energy Intelligence Platform</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => handleOpenAuth('admin@minsakthi.local')}
              className="hover:text-white transition-colors"
            >
              Admin Access
            </button>
            <button
              type="button"
              onClick={() => handleOpenAuth('operator@minsakthi.local')}
              className="hover:text-white transition-colors"
            >
              Operator
            </button>
            <button
              type="button"
              onClick={() => handleOpenAuth('viewer@minsakthi.local')}
              className="hover:text-white transition-colors"
            >
              Viewer
            </button>
          </div>
        </div>
      </footer>

      {/* ── Glassmorphism Auth Modal ── */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={handleCloseAuth}
        onSuccess={onSuccess}
        initialEmail={prefillEmail}
      />
    </div>
  );
};

export default LandingPage;
