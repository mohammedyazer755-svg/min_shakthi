import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Zap } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { LightRays } from '../components/LightRays/LightRays';
import { ElectricBrandMark } from '../components/ElectricBrandMark';
import { ErrorBanner } from '../components';

export interface SignInProps {
  onSuccess?: () => void;
}

export const SignIn: React.FC<SignInProps> = ({ onSuccess }) => {
  const { login, error, clearError } = useAuth();
  const [email, setEmail] = useState('admin@minsakthi.local');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const ok = await login(email, password);
    setIsSubmitting(false);
    if (ok && onSuccess) onSuccess();
  };

  const handlePrefill = (roleEmail: string) => {
    setEmail(roleEmail);
    clearError();
  };

  const roles = [
    { label: 'Admin', email: 'admin@minsakthi.local', color: '#f87171' },
    { label: 'Operator', email: 'operator@minsakthi.local', color: '#fbbf24' },
    { label: 'Viewer', email: 'viewer@minsakthi.local', color: '#38bdf8' },
  ];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--dark-canvas)' }}
    >
      {/* Full-screen WebGL volumetric light rays */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        <LightRays
          raysOrigin="top-center"
          raysSpeed={0.5}
          lightSpread={0.6}
          rayLength={2.5}
          fadeDistance={1.2}
          followMouse={true}
          mouseInfluence={0.15}
          pulsating={true}
          distortion={0.1}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-4 animate-fade-in-up">
        {/* Header mark */}
        <div className="flex flex-col items-center mb-8">
          <ElectricBrandMark size={52} className="mb-4" />
          <div
            className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2"
            style={{ color: 'var(--dark-accent)' }}
          >
            01 / SECURE ACCESS
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-center" style={{ color: 'var(--dark-text-primary)' }}>
            MIN-SAKTHI ENERGY INTELLIGENCE
          </h1>
          <p className="mt-2 text-xs text-center" style={{ color: 'var(--dark-text-muted)' }}>
            Industrial-grade power monitoring. Authorize to continue.
          </p>
        </div>

        {/* Glass card */}
        <div
          className="rounded-2xl p-6 md:p-8"
          style={{
            background: 'var(--dark-surface-glass)',
            border: '1px solid var(--dark-border-strong)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
          }}
        >
          {error && (
            <ErrorBanner
              title="Authentication Failed"
              message={error}
              onDismiss={clearError}
              className="mb-5"
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="signin-email"
                className="block text-[10px] font-bold uppercase tracking-widest mb-1.5"
                style={{ color: 'var(--dark-text-muted)' }}
              >
                Work Email
              </label>
              <input
                id="signin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@minsakthi.local"
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: 'var(--dark-canvas)',
                  border: '1px solid var(--dark-border-strong)',
                  color: 'var(--dark-text-primary)',
                  outline: 'none',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--dark-accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--dark-border-strong)')}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="signin-password"
                className="block text-[10px] font-bold uppercase tracking-widest mb-1.5"
                style={{ color: 'var(--dark-text-muted)' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="signin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-10 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: 'var(--dark-canvas)',
                    border: '1px solid var(--dark-border-strong)',
                    color: 'var(--dark-text-primary)',
                    outline: 'none',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--dark-accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--dark-border-strong)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded"
                  style={{ color: 'var(--dark-text-muted)' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-lg text-sm font-bold tracking-wide mt-2 relative overflow-hidden transition-all shadow-lg hover:brightness-110 active:brightness-95"
              style={{
                background: isSubmitting ? 'var(--dark-surface-raised)' : 'var(--dark-accent)',
                color: isSubmitting ? 'var(--dark-text-muted)' : '#000000',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {!isSubmitting && (
                <span
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmerSweep 2.5s ease-in-out infinite',
                  }}
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" aria-hidden="true" />
                {isSubmitting ? 'Authenticating...' : 'Sign In'}
              </span>
            </button>
          </form>

          {/* Role selector chips */}
          <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--dark-border)' }}>
            <div
              className="text-[10px] font-bold uppercase tracking-widest mb-3"
              style={{ color: 'var(--dark-text-dim)' }}
            >
              Test Identities — enter runtime password
            </div>
            <div className="flex gap-2">
              {roles.map(r => (
                <button
                  key={r.email}
                  type="button"
                  onClick={() => handlePrefill(r.email)}
                  className="flex-1 py-2 rounded-lg text-xs font-bold tracking-wide transition-all"
                  style={{
                    background: 'var(--dark-surface-raised)',
                    border: `1px solid ${email === r.email ? r.color + '60' : 'var(--dark-border)'}`,
                    color: email === r.email ? r.color : 'var(--dark-text-muted)',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Security notice */}
          <div
            className="mt-5 flex items-start gap-2 text-[11px] leading-relaxed p-3 rounded-lg"
            style={{
              background: 'var(--dark-canvas)',
              border: '1px solid var(--dark-border)',
              color: 'var(--dark-text-dim)',
            }}
          >
            <Lock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>Access tokens are short-lived in browser memory. Sessions rotate via HttpOnly secure cookies. Zero credentials stored in localStorage.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
