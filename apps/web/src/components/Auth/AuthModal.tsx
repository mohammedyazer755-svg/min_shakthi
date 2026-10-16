import React, { useEffect, useRef, useState } from 'react';
import { X, Mail, Lock, Eye, EyeOff, Zap, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { ElectricBrandMark } from '../ElectricBrandMark';
import { ErrorBanner } from '../ErrorBanner';
import './AuthModal.css';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialEmail?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialEmail = 'admin@minsakthi.local',
}) => {
  const { login, error, clearError } = useAuth();
  const dialogRef = useRef<HTMLDivElement>(null);

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  useEffect(() => {
    if (!isOpen) {
      clearError();
      return;
    }

    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;

    const emailInput = dialog?.querySelector<HTMLInputElement>('#signin-email');
    if (emailInput) {
      emailInput.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'Tab' && dialog) {
        const focusable = Array.from(
          dialog.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter(el => el.offsetWidth > 0 || el.offsetHeight > 0);

        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [isOpen, clearError, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const ok = await login(email, password);
    setIsSubmitting(false);
    if (ok) {
      onClose();
      if (onSuccess) onSuccess();
    }
  };

  const handleRoleSelect = (roleEmail: string) => {
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
      className="auth-glass-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Ambient background light circle */}
      <div className="auth-ambient-shadow" aria-hidden="true" />

      {/* Frosted glass modal card */}
      <div ref={dialogRef} className="auth-glass-card">
        {/* Top-Right Circular Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="auth-close-btn"
          aria-label="Close authentication modal"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>

        {/* Modal Header */}
        <div className="auth-header-wrapper">
          <div className="auth-brand-badge">
            <ElectricBrandMark size={16} />
            <span>01 / SECURE ACCESS</span>
          </div>

          <h2 id="auth-modal-title" className="auth-main-heading">
            MIN-SAKTHI ENERGY INTELLIGENCE
          </h2>

          <p className="auth-sub-text">
            Log in to access your live multi-channel edge telemetry stream.
          </p>
        </div>

        {/* Error notification banner if any */}
        {error && (
          <ErrorBanner
            title="Authentication Failed"
            message={error}
            onDismiss={clearError}
            className="mb-4"
          />
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit}>
          {/* Work Email */}
          <div className="auth-input-group">
            <label htmlFor="signin-email" className="auth-input-label">
              Work Email
            </label>
            <div className="auth-input-container">
              <Mail className="auth-input-icon" aria-hidden="true" />
              <input
                id="signin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@minsakthi.local"
                required
                autoComplete="email"
                className="auth-input-field"
              />
            </div>
          </div>

          {/* Password */}
          <div className="auth-input-group">
            <label htmlFor="signin-password" className="auth-input-label">
              Password
            </label>
            <div className="auth-input-container">
              <Lock className="auth-input-icon" aria-hidden="true" />
              <input
                id="signin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                autoComplete="current-password"
                className="auth-input-field"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="auth-password-toggle-btn"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me & Runtime Mode */}
          <div className="auth-options-row">
            <label className="auth-checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="auth-checkbox-input"
              />
              <span>Remember me</span>
            </label>
            <span className="auth-runtime-badge">Active Edge Node</span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="auth-submit-btn"
          >
            {!isSubmitting && <span className="auth-shimmer-sweep" aria-hidden="true" />}
            <Zap className="w-4 h-4 text-amber-500" aria-hidden="true" />
            <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>

        {/* Test Identities Pre-fill Chips */}
        <div className="auth-test-identities">
          <div className="auth-test-identities-title">
            Test Identities — select to auto-fill
          </div>
          <div className="auth-role-buttons">
            {roles.map(r => (
              <button
                key={r.email}
                type="button"
                onClick={() => handleRoleSelect(r.email)}
                className={`auth-role-btn ${email === r.email ? 'active-role' : ''}`}
                style={{
                  borderColor: email === r.email ? r.color : undefined,
                }}
              >
                <span
                  className="auth-role-badge-dot"
                  style={{ background: r.color }}
                  aria-hidden="true"
                />
                <span>{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Security & Token disclosure note */}
        <div className="auth-security-notice">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            In-memory bearer tokens with HttpOnly session cookies. Zero persistent secrets in browser storage.
          </span>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
