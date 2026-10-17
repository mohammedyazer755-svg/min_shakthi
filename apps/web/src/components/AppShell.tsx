import React, { useState, useRef, useEffect } from 'react';
import {
  Menu, X, LayoutDashboard, Cpu, Bell, History, Settings, Radio,
  BarChart3, LogOut, Server, ChevronDown
} from 'lucide-react';
import { StatusSummary } from './StatusSummary';
import { useAuth } from '../auth/AuthContext';
import { ElectricBrandMark } from './ElectricBrandMark';
import type { SystemHealth, SnapshotChannel } from '@minsakthi/contracts';
import { deviceStreamStatus } from '../live/status';
import { normalizeRoute, getVisiblePrimaryNav, getVisibleManageNav } from '../navigation/roleNav';

export interface AppShellProps {
  children: React.ReactNode;
  selectedDevice?: string;
  onSelectDevice?: (deviceId: string) => void;
  availableDevices?: string[];
  activeRoute?: string;
  onNavigate?: (route: string) => void;
  health?: SystemHealth | null;
  channels?: SnapshotChannel[];
  socketConnected?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  selectedDevice = 'prototype1',
  onSelectDevice,
  availableDevices = ['prototype1', 'prototype2'],
  activeRoute = '/overview',
  onNavigate,
  health,
  channels = [],
  socketConnected = false,
}) => {
  const { user: authUser, logout } = useAuth();
  const isWorkspacePreview = import.meta.env.DEV && typeof window !== 'undefined' && (
    window.location.search.includes('view=workspace') ||
    window.location.hash === '#workspace'
  );
  const user = authUser || (isWorkspacePreview ? {
    id: 'usr_preview',
    siteId: 'site_default',
    email: 'admin@minsakthi.local',
    displayName: 'Administrator',
    role: 'admin' as const,
  } : null);
  const stream = deviceStreamStatus(channels, socketConnected, health);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [deviceDropdownOpen, setDeviceDropdownOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const deviceDropdownRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const prevDrawerOpenRef = useRef(false);

  const dotColor = stream.tone === 'positive'
    ? 'var(--status-ok)'
    : stream.tone === 'critical'
      ? 'var(--status-critical)'
      : stream.tone === 'warning'
        ? 'var(--status-warn)'
        : 'var(--status-unknown)';

  const normalizedActive = normalizeRoute(activeRoute);

  // Accessible focus restoration when mobile drawer opens / closes
  useEffect(() => {
    if (mobileDrawerOpen && !prevDrawerOpenRef.current) {
      // Focus drawer close button
      setTimeout(() => closeBtnRef.current?.focus(), 50);
    } else if (!mobileDrawerOpen && prevDrawerOpenRef.current) {
      // Restore focus to mobile trigger button
      mobileTriggerRef.current?.focus();
    }
    prevDrawerOpenRef.current = mobileDrawerOpen;
  }, [mobileDrawerOpen]);

  // Handle escape key to close drawers & menus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mobileDrawerOpen) setMobileDrawerOpen(false);
        if (deviceDropdownOpen) setDeviceDropdownOpen(false);
        if (accountMenuOpen) setAccountMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileDrawerOpen, deviceDropdownOpen, accountMenuOpen]);

  // Handle click outside dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (deviceDropdownRef.current && !deviceDropdownRef.current.contains(target)) {
        setDeviceDropdownOpen(false);
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(target)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavClick = (route: string) => {
    onNavigate?.(route);
    setMobileDrawerOpen(false);
  };

  const primaryNavItems = getVisiblePrimaryNav(user?.role);
  const manageNavItems = getVisibleManageNav(user?.role);

  const roleBadgeColor = user?.role === 'admin'
    ? 'text-red-700 border-red-300 bg-red-50'
    : user?.role === 'operator'
      ? 'text-amber-700 border-amber-300 bg-amber-50'
      : 'text-sky-700 border-sky-300 bg-sky-50';

  const userInitials = (user?.displayName || user?.email || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // Helper to resolve icon component
  const getIcon = (name: string) => {
    switch (name) {
      case 'LayoutDashboard': return LayoutDashboard;
      case 'Cpu': return Cpu;
      case 'BarChart3': return BarChart3;
      case 'Bell': return Bell;
      case 'Server': return Server;
      case 'Radio': return Radio;
      case 'History': return History;
      case 'Settings': return Settings;
      default: return LayoutDashboard;
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--canvas)', color: 'var(--text-primary)' }}
    >
      {/* Skip to main content accessibility link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4"
        style={{ background: 'var(--accent)', color: '#FFFFFF', fontWeight: 600 }}
      >
        Skip to main content
      </a>

      {/* Header — clean workspace header */}
      <header
        className="sticky top-0 z-30 flex flex-col"
        style={{
          background: 'var(--header-bg)',
          borderBottom: '1px solid var(--header-border)',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
        }}
      >
        {/* Top bar */}
        <div className="relative h-14 sm:h-16 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button with accessible touch target (>= 44x44) */}
            <button
              ref={mobileTriggerRef}
              type="button"
              onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
              className="lg:hidden p-2.5 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center transition-colors"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              aria-label={mobileDrawerOpen ? 'Close navigation drawer' : 'Open navigation drawer'}
              aria-expanded={mobileDrawerOpen}
              aria-controls="mobile-navigation-drawer"
            >
              {mobileDrawerOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
            </button>

            {/* Brand Logo & Title */}
            <button
              type="button"
              onClick={() => handleNavClick('/overview')}
              className="flex items-center gap-2.5 text-left focus-visible:outline-hidden"
              aria-label="MIN-SAKTHI Home"
            >
              <ElectricBrandMark size={32} />
              <div className="leading-none">
                <div className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  MIN-SAKTHI
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--accent-text)' }}>
                  Energy Intelligence V2
                </div>
              </div>
            </button>

            {/* Single Unified Device Selector & Status Area */}
            <div ref={deviceDropdownRef} className="hidden sm:block relative ml-2">
              <button
                type="button"
                onClick={() => setDeviceDropdownOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:border-[var(--accent)]"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
                aria-haspopup="listbox"
                aria-expanded={deviceDropdownOpen}
                aria-label={`Active Device: ${selectedDevice}, Status: ${stream.label}`}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: dotColor }}
                  aria-hidden="true"
                />
                <span className="font-mono">{selectedDevice}</span>
                <span
                  className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded"
                  style={{
                    background: 'var(--surface-raised)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {stream.label}
                </span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />
              </button>

              {deviceDropdownOpen && (
                <div
                  className="motion-dropdown-enter absolute top-full mt-1.5 left-0 min-w-[200px] rounded-xl overflow-hidden z-50 py-1.5"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border-strong)',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                  }}
                  role="listbox"
                  aria-label="Select device"
                >
                  <div
                    className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: 'var(--text-dim)' }}
                  >
                    Configured Devices ({availableDevices.length})
                  </div>
                  {availableDevices.length === 0 ? (
                    <div className="px-3.5 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      No devices available
                    </div>
                  ) : (
                    availableDevices.map((d) => (
                      <button
                        key={d}
                        role="option"
                        aria-selected={d === selectedDevice}
                        type="button"
                        onClick={() => {
                          onSelectDevice?.(d);
                          setDeviceDropdownOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs font-mono font-medium transition-colors flex items-center justify-between"
                        style={{
                          color: d === selectedDevice ? 'var(--accent-text)' : 'var(--text-primary)',
                          background: d === selectedDevice ? 'var(--accent-dim)' : 'transparent',
                        }}
                      >
                        <span>{d}</span>
                        {d === selectedDevice && (
                          <span className="text-[10px] font-sans font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--accent)', color: '#FFF' }}>
                            ACTIVE
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right side controls: Health + Account Menu */}
          <div className="flex items-center gap-3">
            <StatusSummary
              health={health}
              channels={channels}
              socketConnected={socketConnected}
              className="hidden xl:inline-flex"
            />

            {/* Account Menu */}
            {user && (
              <div ref={accountMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((v) => !v)}
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium transition-all hover:border-[var(--border-strong)]"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  aria-haspopup="menu"
                  aria-expanded={accountMenuOpen}
                  aria-label={`User account menu for ${user.displayName}`}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px]"
                    style={{ background: 'var(--accent)', color: '#FFFFFF' }}
                  >
                    {userInitials}
                  </div>
                  <div className="hidden sm:flex flex-col items-start leading-tight">
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {user.displayName}
                    </span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1 rounded border ${roleBadgeColor}`}>
                      {user.role}
                    </span>
                  </div>
                  <ChevronDown className="w-3 h-3 opacity-60 hidden sm:inline" aria-hidden="true" />
                </button>

                {accountMenuOpen && (
                  <div
                    className="motion-dropdown-enter absolute right-0 top-full mt-1.5 w-56 rounded-xl overflow-hidden z-50 py-1.5"
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border-strong)',
                      boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                    }}
                    role="menu"
                    aria-label="User Account Options"
                  >
                    {/* User Profile Header */}
                    <div className="px-4 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
                      <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                        {user.displayName}
                      </div>
                      <div className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
                        {user.email}
                      </div>
                      <div className="mt-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${roleBadgeColor}`}>
                          {user.role} Privilege
                        </span>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="py-1">
                      <button
                        role="menuitem"
                        type="button"
                        onClick={() => {
                          onNavigate?.('/settings');
                          setAccountMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium flex items-center gap-2.5 transition-colors hover:bg-[var(--surface-raised)]"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <Settings className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} aria-hidden="true" />
                        <span>Personal Preferences</span>
                      </button>

                      <button
                        role="menuitem"
                        type="button"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          logout();
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium flex items-center gap-2.5 transition-colors hover:bg-red-50 text-red-600"
                      >
                        <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Desktop Primary Navigation Tabs */}
        <nav
          className="hidden lg:flex items-center px-6 relative overflow-x-auto"
          style={{ zIndex: 1, borderTop: '1px solid var(--border)' }}
          aria-label="Primary Navigation"
        >
          {primaryNavItems.map((item) => {
            const Icon = getIcon(item.iconName);
            const isSelected = normalizedActive === item.route || (item.route !== '/overview' && normalizedActive.startsWith(item.route));

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.route)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold motion-interactive relative ${
                  isSelected ? 'nav-active' : ''
                }`}
                style={{
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isSelected ? 'var(--accent-dim)' : 'transparent',
                  borderBottom: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
                }}
                aria-current={isSelected ? 'page' : undefined}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" style={{ color: isSelected ? 'var(--accent)' : 'inherit' }} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Manage Area for Admin / Diagnostics for Operator */}
          {manageNavItems.length > 0 && (
            <div className="ml-4 pl-4 border-l flex items-center gap-1" style={{ borderColor: 'var(--border)' }}>
              {user?.role === 'admin' ? (
                <button
                  type="button"
                  onClick={() => handleNavClick('/manage/devices')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold motion-interactive ${
                    normalizedActive.startsWith('/manage') ? 'border border-[var(--accent)] font-bold' : ''
                  }`}
                  style={{
                    color: normalizedActive.startsWith('/manage') ? 'var(--accent-text)' : 'var(--text-secondary)',
                    background: normalizedActive.startsWith('/manage') ? 'var(--accent-dim)' : 'var(--surface-raised)',
                  }}
                  aria-current={normalizedActive.startsWith('/manage') ? 'page' : undefined}
                >
                  <Server className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Manage</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1 rounded bg-red-100 text-red-700">
                    Admin
                  </span>
                </button>
              ) : user?.role === 'operator' ? (
                <button
                  type="button"
                  onClick={() => handleNavClick('/manage/diagnostics')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold motion-interactive ${
                    normalizedActive.startsWith('/manage/diagnostics') ? 'border border-[var(--accent)] font-bold' : ''
                  }`}
                  style={{
                    color: normalizedActive.startsWith('/manage/diagnostics') ? 'var(--accent-text)' : 'var(--text-secondary)',
                    background: normalizedActive.startsWith('/manage/diagnostics') ? 'var(--accent-dim)' : 'var(--surface-raised)',
                  }}
                  aria-current={normalizedActive.startsWith('/manage/diagnostics') ? 'page' : undefined}
                >
                  <Radio className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Diagnostics</span>
                </button>
              ) : null}
            </div>
          )}
        </nav>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex min-w-0">
        {/* Mobile Navigation Drawer */}
        {mobileDrawerOpen && (
          <div
            id="mobile-navigation-drawer"
            className="fixed inset-0 z-40 lg:hidden flex"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
          >
            {/* Backdrop */}
            <div
              className="motion-drawer-backdrop fixed inset-0"
              style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
              onClick={() => setMobileDrawerOpen(false)}
            />

            {/* Slide-out drawer */}
            <nav
              className="motion-drawer-slide relative w-76 max-w-[85%] h-full flex flex-col z-10"
              style={{
                background: 'var(--surface)',
                borderRight: '1px solid var(--border)',
                boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
              }}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                  <ElectricBrandMark size={28} />
                  <div>
                    <div className="text-sm font-bold leading-none" style={{ color: 'var(--text-primary)' }}>
                      MIN-SAKTHI
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-text)' }}>
                      Navigation
                    </div>
                  </div>
                </div>
                <button
                  ref={closeBtnRef}
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-2.5 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  aria-label="Close navigation drawer"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {/* Mobile Device Selector & Status */}
              <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <label
                  htmlFor="device-select-mobile"
                  className="block text-[10px] font-bold uppercase tracking-widest mb-1.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Active Device &amp; Status
                </label>
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: dotColor }}
                    aria-hidden="true"
                  />
                  <select
                    id="device-select-mobile"
                    value={selectedDevice}
                    onChange={(e) => {
                      onSelectDevice?.(e.target.value);
                      setMobileDrawerOpen(false);
                    }}
                    className="w-full text-xs font-mono font-semibold px-3 py-2.5 rounded-lg min-h-[44px]"
                    style={{
                      background: 'var(--canvas)',
                      border: '1px solid var(--border-strong)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {availableDevices.map((d) => (
                      <option key={d} value={d}>
                        {d} ({stream.label})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Primary Nav items */}
              <div className="flex-1 p-3 space-y-1 overflow-y-auto">
                <div
                  className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: 'var(--text-dim)' }}
                >
                  Workspace
                </div>
                {primaryNavItems.map((item) => {
                  const Icon = getIcon(item.iconName);
                  const isSelected = normalizedActive === item.route || (item.route !== '/overview' && normalizedActive.startsWith(item.route));

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.route)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium motion-interactive min-h-[44px]"
                      style={{
                        color: isSelected ? 'var(--accent-text)' : 'var(--text-secondary)',
                        background: isSelected ? 'var(--accent-dim)' : 'transparent',
                        borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                      }}
                      aria-current={isSelected ? 'page' : undefined}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" style={{ color: isSelected ? 'var(--accent)' : 'inherit' }} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}

                {/* Manage Items in Drawer */}
                {manageNavItems.length > 0 && (
                  <>
                    <div
                      className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: 'var(--text-dim)' }}
                    >
                      {user?.role === 'admin' ? 'Admin Management' : 'Operations'}
                    </div>
                    {manageNavItems.map((item) => {
                      const Icon = getIcon(item.iconName);
                      const isSelected = normalizedActive.startsWith(item.route);

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleNavClick(item.route)}
                          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium motion-interactive min-h-[44px]"
                          style={{
                            color: isSelected ? 'var(--accent-text)' : 'var(--text-secondary)',
                            background: isSelected ? 'var(--accent-dim)' : 'transparent',
                            borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                          }}
                          aria-current={isSelected ? 'page' : undefined}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" style={{ color: isSelected ? 'var(--accent)' : 'inherit' }} />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </>
                )}

                {/* Account Section in Drawer */}
                <div
                  className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: 'var(--text-dim)' }}
                >
                  Account
                </div>
                <button
                  type="button"
                  onClick={() => handleNavClick('/settings')}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium motion-interactive min-h-[44px]"
                  style={{
                    color: normalizedActive === '/settings' ? 'var(--accent-text)' : 'var(--text-secondary)',
                    background: normalizedActive === '/settings' ? 'var(--accent-dim)' : 'transparent',
                  }}
                >
                  <Settings className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span>Personal Preferences</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium motion-interactive min-h-[44px] text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              </div>

              {/* Status summary at drawer footer */}
              <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <StatusSummary health={health} channels={channels} socketConnected={socketConnected} className="w-full" />
              </div>
            </nav>
          </div>
        )}

        {/* Content Container */}
        <main
          id="main-content"
          style={{ viewTransitionName:'workspace-content' }}
          tabIndex={-1}
          className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full outline-hidden"
        >
          <div key={normalizedActive} className="motion-page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;
