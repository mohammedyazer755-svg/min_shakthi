import React, { useState } from 'react';
import { Menu, X, LayoutDashboard, Cpu, Bell, History, FileText, Settings, Radio, BarChart3, LogOut } from 'lucide-react';
import { StatusSummary } from './StatusSummary';
import { useAuth } from '../auth/AuthContext';

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

  const navItems = [
    { label: 'Overview', route: '/overview', icon: LayoutDashboard },
    { label: 'Analytics', route: '/analytics', icon: BarChart3 },
    { label: 'Channels', route: '/channels', icon: Cpu },
    { label: 'Real-Time', route: '/live', icon: Radio },
    { label: 'History', route: '/history', icon: History },
    { label: 'Reports', route: '/reports', icon: FileText },
    { label: 'Alerts', route: '/alerts', icon: Bell },
    { label: 'Settings', route: '/settings', icon: Settings },
  ];

  const handleNavClick = (route: string) => {
    onNavigate?.(route);
    setMobileDrawerOpen(false);
  };

  return (
    <div className="min-h-screen bg-canvas text-text-primary flex flex-col">
      {/* Accessible skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-btn-primary focus:text-white"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="h-14 sm:h-16 bg-surface border-b border-border sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="lg:hidden p-2 -ml-2 text-text-primary hover:bg-[#F2F1EC] rounded-control focus-visible:outline-2 focus-visible:outline-brand-gold"
            aria-label={mobileDrawerOpen ? 'Close navigation drawer' : 'Open navigation drawer'}
            aria-expanded={mobileDrawerOpen}
          >
            {mobileDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-gold" aria-hidden="true" />
            <h1 className="text-base sm:text-lg font-semibold tracking-tight">
              MIN-SAKTHI <span className="text-xs font-normal text-brand-gold-text ml-1">V2</span>
            </h1>
          </div>

          {/* Device Selector */}
          <div className="hidden sm:flex items-center space-x-2 pl-4 border-l border-border">
            <label htmlFor="device-select-desktop" className="text-xs font-medium text-text-secondary">
              Device:
            </label>
            <select
              id="device-select-desktop"
              value={selectedDevice}
              onChange={(e) => onSelectDevice?.(e.target.value)}
              className="text-xs font-semibold bg-surface border border-border-strong rounded px-2.5 py-1 text-text-primary focus-visible:outline-2 focus-visible:outline-brand-gold"
            >
              {availableDevices.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          <StatusSummary className="hidden xl:inline-flex" />
          {user && (
            <div className="flex items-center space-x-3 pl-2 sm:pl-3 border-l border-border">
              <div className="hidden sm:block text-right">
                <span className="text-xs font-semibold block text-text-primary leading-tight">
                  {user.displayName}
                </span>
                <span className="text-[10px] text-brand-gold-text font-bold uppercase tracking-wider">
                  {user.role}
                </span>
              </div>
              <button
                type="button"
                onClick={() => logout()}
                className="text-xs font-medium px-2.5 py-1 rounded-control border border-border bg-surface hover:bg-canvas text-text-secondary hover:text-text-primary transition-colors focus:ring-1 focus:ring-brand-gold inline-flex items-center gap-1"
                aria-label="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Body with Sidebar and Main */}
      <div className="flex-1 flex min-w-0">
        {/* Desktop Sidebar */}
        <aside
          className="hidden lg:block w-56 flex-shrink-0 bg-surface border-r border-border p-4"
          aria-label="Desktop Primary Navigation"
        >
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeRoute === item.route;
              return (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => handleNavClick(item.route)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-control text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#F2F1EC] text-text-primary font-semibold'
                      : 'text-text-secondary hover:text-text-primary hover:bg-[#F2F1EC]/60'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileDrawerOpen && (
          <div
            className="fixed inset-0 z-40 lg:hidden flex"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
          >
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/30 backdrop-blur-xs"
              onClick={() => setMobileDrawerOpen(false)}
            />

            {/* Drawer Content */}
            <nav className="relative w-64 max-w-[80%] bg-surface border-r border-border h-full p-4 flex flex-col justify-between z-10 shadow-lg">
              <div>
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
                  <span className="text-sm font-semibold">Navigation</span>
                  <button
                    type="button"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="p-1 rounded text-text-secondary hover:text-text-primary"
                    aria-label="Close drawer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile Device Selector */}
                <div className="mb-4">
                  <label htmlFor="device-select-mobile" className="block text-xs font-medium text-text-secondary mb-1">
                    Selected Device:
                  </label>
                  <select
                    id="device-select-mobile"
                    value={selectedDevice}
                    onChange={(e) => {
                      onSelectDevice?.(e.target.value);
                      setMobileDrawerOpen(false);
                    }}
                    className="w-full text-sm font-semibold bg-surface border border-border-strong rounded px-3 py-2 text-text-primary"
                  >
                    {availableDevices.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeRoute === item.route;
                    return (
                      <button
                        key={item.route}
                        type="button"
                        onClick={() => handleNavClick(item.route)}
                        className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-control text-sm font-medium ${
                          isActive
                            ? 'bg-[#F2F1EC] text-text-primary font-semibold'
                            : 'text-text-secondary hover:text-text-primary hover:bg-[#F2F1EC]/60'
                        }`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <StatusSummary className="w-full" />
              </div>
            </nav>
          </div>
        )}

        {/* Main Content Area */}
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
