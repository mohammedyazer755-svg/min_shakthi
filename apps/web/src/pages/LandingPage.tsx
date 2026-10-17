import React, { useState, useCallback } from 'react';
import { ArrowRight, Activity, ShieldCheck, Zap, BarChart3, ChevronRight } from 'lucide-react';
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

  const handleCloseAuth = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const handleOpenAuth = (email = 'admin@minsakthi.local') => {
    setPrefillEmail(email);
    setIsAuthModalOpen(true);
    if (onSignIn) onSignIn(email);
  };

  const channels = [
    { slot: 'CH01', name: 'Main Phase A', status: 'Sign in to view', voltage: '— V', current: '— A' },
    { slot: 'CH02', name: 'Chiller Compressors', status: 'Sign in to view', voltage: '— V', current: '— A' },
    { slot: 'CH03', name: 'Server Rack Feed A', status: 'Sign in to view', voltage: '— V', current: '— A' },
    { slot: 'CH04', name: 'HVAC Air Handlers', status: 'Sign in to view', voltage: '— V', current: '— A' },
    { slot: 'CH05', name: 'Emergency Backup Inverter', status: 'Sign in to view', voltage: '— V', current: '— A' },
  ];

  const benefits = [
    {
      icon: Zap,
      badge: '01 / PRECISION',
      title: 'Sub-Second Edge Precision',
      desc: '5-channel electrical tracking with CRC32 integrity framing and cadence-aware freshness. Discards retained broker silence without false online claims.',
    },
    {
      icon: BarChart3,
      badge: '02 / REPORTING',
      title: 'Auditable Civil Reporting',
      desc: 'Deterministic energy aggregation bounded in civil timezones (Asia/Kolkata). Continuous gap and counter reset tracking with zero unverified billing claims.',
    },
    {
      icon: ShieldCheck,
      badge: '03 / RELIABILITY',
      title: 'Resilient Mission Control',
      desc: 'Persistent disk-buffered spooling with SQLite/Postgres reconciliation, multi-tenant site isolation, and real-time socket diagnostics.',
    },
  ];

  return (
    <div className="landing-container">
      {/* ── Volumetric Light Rays (reacts to mouse position) ── */}
      <div className="landing-ambient-layer" aria-hidden="true">
        <LightRays
          raysOrigin="top-center"
          raysSpeed={0.5}
          lightSpread={0.5}
          rayLength={2.4}
          pulsating={false}
          fadeDistance={1.15}
          followMouse={true}
          mouseInfluence={0.06}
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
            <a href="#benefits" className="landing-nav-link">Platform Capabilities</a>
            <a href="#preview" className="landing-nav-link">Workspace Preview</a>
          </nav>

          <div className="landing-nav-actions">
            <div className="landing-status-badge hidden sm:inline-flex">
              <span className="landing-live-dot" aria-hidden="true" style={{ background: '#c8a96e', boxShadow: '0 0 10px rgba(200, 169, 110, 0.5)' }} />
              <span>Secure access</span>
            </div>

            <button
              type="button"
              onClick={() => handleOpenAuth()}
              className="landing-signin-btn motion-interactive motion-btn-press"
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
          <span className="hidden sm:inline">FOR INDUSTRIAL &amp; COMMERCIAL GRIDS</span>
        </div>
      </div>

      {/* ── Hero Section with Dimensional 3D Assembly ── */}
      <section className="landing-hero" id="overview">
        <div className="landing-hero-grid items-center">
          {/* Left: Editorial Headline & Actions */}
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
              Continuous hardware telemetry, verified civil reporting, and high-integrity historical records.
            </p>

          </div>

          <div className="landing-index-card">
            <div className="landing-card-header">
              <span className="landing-card-tag">01 / OVERVIEW</span>
              <span className="text-xs font-bold text-neutral-400">ESP32 PROTO</span>
            </div>
            <h2 className="landing-card-title">Multi-Channel Edge Ingestion</h2>
            <p className="landing-card-text">
              Monitor five electrical channels in one workspace. Live voltage, current,
              active power, and grid frequency, with clear device status and searchable history.
            </p>
            <div className="landing-card-actions">
              <button type="button" onClick={() => handleOpenAuth()} className="landing-primary-btn motion-interactive motion-btn-press">
                Live Stream <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <a href="#benefits" className="landing-secondary-btn motion-interactive motion-btn-press">Architecture</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Three Short Benefits ── */}
      <section className="landing-benefits-section" id="benefits">
        <div className="landing-section-header">
          <div className="landing-section-title-wrap">
            <span className="landing-section-tag">ENGINEERING PILLARS</span>
            <h2 className="landing-section-heading">Designed for Mission-Critical Clarity</h2>
          </div>
        </div>

        <div className="landing-benefits-grid">
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.title} className="landing-benefit-card motion-clickable-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-amber-400">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 font-mono">
                    {b.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mb-2">{b.title}</h3>
                <p className="text-xs leading-relaxed text-neutral-400">{b.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Honest Non-Operational Product Preview ── */}
      <section className="landing-channels-section" id="preview">
        <div className="landing-section-header">
          <div className="landing-section-title-wrap">
            <span className="landing-section-tag">WORKPLACE PREVIEW</span>
            <h2 className="landing-section-heading">5-Channel Composite Tracking</h2>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                style={{ background: 'rgba(200, 169, 110, 0.15)', color: '#c8a96e', border: '1px solid rgba(200, 169, 110, 0.3)' }}
              >
                NON-OPERATIONAL WORKSPACE PREVIEW
              </span>
              <span className="text-xs text-neutral-400">Sign in to view real-time site telemetry</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleOpenAuth()}
            className="text-xs font-bold text-amber-300 hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>Authorize workspace access</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="landing-channel-cards-grid">
          {channels.map((ch) => (
            <div
              key={ch.slot}
              className="landing-channel-card motion-clickable-card"
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

      {/* ── Final Call to Action ── */}
      <section className="landing-cta-section max-w-7xl mx-auto px-6 py-16">
        <div
          className="p-8 sm:p-12 rounded-2xl border text-center flex flex-col items-center justify-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #0d0d12 0%, #050508 100%)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}
        >
          <ElectricBrandMark size={40} className="mb-4" />
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Authorize Mission-Control Access
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-lg mt-3 leading-relaxed">
            Sign in to access your site&apos;s real-time power telemetry cockpit, multi-channel diagnostics,
            automated alert evaluations, and historical event logs.
          </p>
          <button
            type="button"
            onClick={() => handleOpenAuth()}
            className="landing-primary-btn motion-interactive motion-btn-press mt-6"
            style={{ padding: '12px 32px', fontSize: '14px' }}
          >
            <span>Open Dashboard</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* ── Clean Footer (Zero public role shortcuts) ── */}
      <footer className="landing-footer">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ElectricBrandMark size={20} />
            <span className="font-bold text-neutral-300">MIN-SAKTHI V2</span>
            <span>— Energy Intelligence Platform</span>
          </div>

          <div className="text-xs text-neutral-500">
            Sessions authenticated via secure HttpOnly tokens. All rights reserved.
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
