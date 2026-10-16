import React, { useState } from 'react';
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Button, Input, Card, ErrorBanner } from '../components';

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
    if (ok && onSuccess) {
      onSuccess();
    }
  };

  const handlePrefill = (roleEmail: string) => {
    setEmail(roleEmail);
    clearError();
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col justify-center items-center px-4 py-8">
      <Card className="w-full max-w-[420px] p-6 md:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 text-brand-gold-text text-xs font-semibold uppercase tracking-wider mb-2 border border-amber-200">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Industrial Access</span>
          </div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">
            MIN-SAKTHI ENERGY INTELLIGENCE
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Sign in with your authorized site credentials
          </p>
        </div>

        {error && (
          <ErrorBanner
            title="Authentication Failed"
            message={error}
            onDismiss={clearError}
            className="mb-5"
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="signin-email"
            label="Work Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="operator@minsakthi.local"
            required
            autoComplete="email"
          />

          <div className="relative">
            <Input
              id="signin-password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[34px] text-text-secondary hover:text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-gold p-1 rounded"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="w-full mt-2"
          >
            {isSubmitting ? 'Authenticating...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-border">
          <div className="text-xs text-text-secondary mb-2 font-medium">
            Test Identities (enter runtime password):
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handlePrefill('admin@minsakthi.local')}
              className="px-2.5 py-1 bg-surface border border-border hover:border-brand-gold text-xs rounded text-text-secondary hover:text-text-primary font-medium transition-colors"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => handlePrefill('operator@minsakthi.local')}
              className="px-2.5 py-1 bg-surface border border-border hover:border-brand-gold text-xs rounded text-text-secondary hover:text-text-primary font-medium transition-colors"
            >
              Operator
            </button>
            <button
              type="button"
              onClick={() => handlePrefill('viewer@minsakthi.local')}
              className="px-2.5 py-1 bg-surface border border-border hover:border-brand-gold text-xs rounded text-text-secondary hover:text-text-primary font-medium transition-colors"
            >
              Viewer
            </button>
          </div>
        </div>

        <div className="mt-5 text-[11px] text-text-secondary/80 flex items-start gap-1.5 leading-relaxed bg-canvas p-2.5 rounded border border-border">
          <Lock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-text-secondary" aria-hidden="true" />
          <span>
            Access tokens are short-lived in browser memory. Sessions rotate in HttpOnly secure cookies. Zero credentials stored in localStorage.
          </span>
        </div>
      </Card>
    </div>
  );
};
