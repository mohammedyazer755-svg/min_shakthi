import React, { useState, useRef, useEffect } from 'react';
import {
  Menu, X, LayoutDashboard, Cpu, Bell, History, FileText,
  Settings, Radio, BarChart3, LogOut, Server, ChevronDown
} from 'lucide-react';
import { StatusSummary } from './StatusSummary';
import { useAuth } from '../auth/AuthContext';
import { LightRays } from './LightRays/LightRays';
import { ElectricBrandMark } from './ElectricBrandMark';

export interface AppShellProps {
  children: React.ReactNode;
  selectedDevice?: string;
  onSelectDevice?: (deviceId: string) => void;
  availableDevices?: string[];
  activeRoute?: string;
  onNavigate?: (route: string) => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  selectedDevice = 'prototype1',
  onSelectDevice,
  availableDevices = ['prototype1', 'prototype2'],
  activeRoute = '/overview',
  onNavigate,
}) => {
  const { user, logout } = useAuth();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [deviceDropdownOpen, setDeviceDropdownOpen] = useState(false);
  const deviceDropdownRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { label: 'Overview', route: '/overview', icon: LayoutDashboard },
    { label: 'Analytics', route: '/analytics', icon: BarChart3 },
    { label: 'Channels', route: '/channels', icon: Cpu },
    { label: 'Live', route: '/live', icon: Radio },
    { label: 'History', route: '/history', icon: History },
    { label: 'Reports', route: '/reports', icon: FileText },
    { label: 'Alerts', route: '/alerts', icon: Bell },
    { label: 'Devices', route: '/devices', icon: Server },
    { label: 'Settings', route: '/settings', icon: Settings },
  ];

  const handleNavClick = (route: string) => {
    onNavigate?.(route);
    setMobileDrawerOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (deviceDropdownRef.current && !deviceDropdownRef.current.contains(e.target as Node)) {
        setDeviceDropdownOpen(false);
      }
    };
    if (deviceDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [deviceDropdownOpen]);

  const roleBadgeColor = user?.role === 'admin'
    ? 'text-red-400 border-red-400/30 bg-red-400/10'
    : user?.role === 'operator'
      ? 'text-amber-400 border-amber-400/30 bg-amber-400/10'
      : 'text-sky-400 border-sky-400/30 bg-sky-400/10';

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--dark-canvas)', color: 'var(--dark-text-primary)' }}
    >
      {/* Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4"
        style={{ background: 'var(--dark-accent)', color: '#000000', fontWeight: 600 }}
      >
        Skip to main content
      </a>

      {/* Header */}
      <header
        className="sticky top-0 z-30 flex flex-col"
        style={{
          background: 'rgba(5,5,7,0.92)',
          borderBottom: '1px solid var(--dark-border)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Ambient WebGL light rays behind header */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
          <LightRays
            raysOrigin="top-center"
            raysSpeed={0.4}
            lightSpread={0.7}
            rayLength={1.2}
            fadeDistance={0.6}
            followMouse={true}
            mouseInfluence={0.08}
            pulsating={false}
            distortion={0}
          />
        </div>

        {/* Top bar: Brand + Device Selector + Health + User Profile */}
        <div className="relative h-14 sm:h-16 px-4 sm:px-6 flex items-center justify-between" style={{ zIndex: 1 }}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
              className="lg:hidden p-1.5 rounded-lg"
              style={{ background: 'var(--dark-surface)', border: '1px solid var(--dark-border)' }}
              aria-label={mobileDrawerOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={mobileDrawerOpen}
            >
              {mobileDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <ElectricBrandMark size={32} />
            <div className="leading-none">
              <div className="text-sm font-bold tracking-tight" style={{ color: 'var(--dark-text-primary)' }}>
                MIN-SAKTHI
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--dark-accent)' }}>
                Energy Intelligence V2
              </div>
            </div>

            {/* Device selector pill */}
            <div
              ref={deviceDropdownRef}
              className="hidden sm:block relative ml-3"
            >
              <button
                type="button"
                onClick={() => setDeviceDropdownOpen(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:border-amber-400/40"
                style={{
                  background: 'var(--dark-surface)',
                  border: '1px solid var(--dark-border-strong)',
                  color: 'var(--dark-text-primary)',
                }}
                aria-haspopup="listbox"
                aria-expanded={deviceDropdownOpen}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse-beacon"
                  style={{ background: 'var(--dark-status-ok)' }}
                />
                <span className="font-mono">{selectedDevice}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {deviceDropdownOpen && (
                <div
                  className="absolute top-full mt-1.5 left-0 min-w-[140px] rounded-lg overflow-hidden z-50 py-1"
                  style={{
                    background: 'var(--dark-surface-raised)',
                    border: '1px solid var(--dark-border-strong)',
                    boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
                  }}
                  role="listbox"
                  aria-label="Select device"
                >
                  {availableDevices.map(d => (
                    <button
                      key={d}
                      role="option"
                      aria-selected={d === selectedDevice}
                      type="button"
                      onClick={() => { onSelectDevice?.(d); setDeviceDropdownOpen(false); }}
                      className="w-full text-left px-3.5 py-2 text-xs font-mono font-medium transition-colors"
                      style={{
                        color: d === selectedDevice ? 'var(--dark-accent)' : 'var(--dark-text-primary)',
                        background: d === selectedDevice ? 'var(--dark-accent-dim)' : 'transparent',
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-3">
            <StatusSummary className="hidden xl:inline-flex" />

            {user && (
              <>
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-semibold" style={{ color: 'var(--dark-text-primary)' }}>
                    {user.displayName}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${roleBadgeColor}`}
                  >
                    {user.role}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:text-white hover:border-white/30"
                  style={{
                    background: 'var(--dark-surface)',
                    border: '1px solid var(--dark-border)',
                    color: 'var(--dark-text-muted)',
                  }}
                  aria-label="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav
          className="hidden lg:flex items-center px-6 relative overflow-x-auto"
          style={{ zIndex: 1, borderTop: '1px solid var(--dark-border)' }}
          aria-label="Primary Navigation"
        >
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeRoute === item.route;
            return (
              <button
                key={item.route}
                type="button"
                onClick={() => handleNavClick(item.route)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all relative ${
                  isActive ? 'nav-active' : ''
                }`}
                style={{
                  color: isActive ? 'var(--dark-text-primary)' : 'var(--dark-text-muted)',
                  background: isActive ? 'var(--dark-accent-dim)' : 'transparent',
                  borderBottom: isActive ? '2px solid var(--dark-accent)' : '2px solid transparent',
                }}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex min-w-0">
        {/* Mobile Navigation Drawer */}
        {mobileDrawerOpen && (
          <div
            className="fixed inset-0 z-40 lg:hidden flex"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
          >
            <div
              className="fixed inset-0"
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
              onClick={() => setMobileDrawerOpen(false)}
            />
            <nav
              className="relative w-72 max-w-[85%] h-full flex flex-col z-10"
              style={{
                background: 'var(--dark-surface)',
                borderRight: '1px solid var(--dark-border)',
                boxShadow: '4px 0 40px rgba(0,0,0,0.6)',
              }}
            >
              <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--dark-border)' }}>
                <div className="flex items-center gap-2">
                  <ElectricBrandMark size={24} />
                  <span className="text-sm font-bold">Navigation</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded"
                  style={{ color: 'var(--dark-text-muted)' }}
                  aria-label="Close drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Device Selector */}
              <div className="p-4" style={{ borderBottom: '1px solid var(--dark-border)' }}>
                <label
                  htmlFor="device-select-mobile"
                  className="block text-[10px] font-bold uppercase tracking-widest mb-2"
                  style={{ color: 'var(--dark-text-muted)' }}
                >
                  Active Device
                </label>
                <select
                  id="device-select-mobile"
                  value={selectedDevice}
                  onChange={(e) => { onSelectDevice?.(e.target.value); setMobileDrawerOpen(false); }}
                  className="w-full text-sm font-mono font-semibold px-3 py-2 rounded-lg"
                  style={{
                    background: 'var(--dark-surface-raised)',
                    border: '1px solid var(--dark-border-strong)',
                    color: 'var(--dark-text-primary)',
                  }}
                >
                  {availableDevices.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Nav items */}
              <div className="flex-1 p-3 space-y-0.5 overflow-y-auto">
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeRoute === item.route;
                  return (
                    <button
                      key={item.route}
                      type="button"
                      onClick={() => handleNavClick(item.route)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                      style={{
                        color: isActive ? 'var(--dark-accent)' : 'var(--dark-text-muted)',
                        background: isActive ? 'var(--dark-accent-dim)' : 'transparent',
                        borderLeft: isActive ? '2px solid var(--dark-accent)' : '2px solid transparent',
                      }}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="p-4" style={{ borderTop: '1px solid var(--dark-border)' }}>
                <StatusSummary className="w-full" />
              </div>
            </nav>
          </div>
        )}

        {/* Content Container */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full outline-hidden"
        >
          {children}
        </main>
      </div>
    </div>
  );
};
