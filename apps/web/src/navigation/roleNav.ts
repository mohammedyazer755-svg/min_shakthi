import type { UserRole } from '@minsakthi/contracts';

export interface NavItemConfig {
  id: string;
  label: string;
  route: string;
  iconName: 'LayoutDashboard' | 'Cpu' | 'BarChart3' | 'Bell' | 'Server' | 'Radio' | 'History' | 'Settings';
  roles: UserRole[];
  subTabs?: { id: string; label: string; route: string }[];
}

export const PRIMARY_NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'overview',
    label: 'Overview',
    route: '/overview',
    iconName: 'LayoutDashboard',
    roles: ['viewer', 'operator', 'admin'],
  },
  {
    id: 'channels',
    label: 'Channels',
    route: '/channels',
    iconName: 'Cpu',
    roles: ['viewer', 'operator', 'admin'],
  },
  {
    id: 'insights',
    label: 'Insights',
    route: '/insights',
    iconName: 'BarChart3',
    roles: ['viewer', 'operator', 'admin'],
    subTabs: [
      { id: 'trends', label: 'Trends', route: '/insights/trends' },
      { id: 'history', label: 'History', route: '/insights/history' },
      { id: 'reports', label: 'Reports', route: '/insights/reports' },
      { id: 'incidents', label: 'Incidents', route: '/insights/incidents' },
    ],
  },
  {
    id: 'alerts',
    label: 'Alerts',
    route: '/alerts',
    iconName: 'Bell',
    roles: ['viewer', 'operator', 'admin'],
  },
];

export const MANAGE_NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'manage-devices',
    label: 'Devices & Mappings',
    route: '/manage/devices',
    iconName: 'Server',
    roles: ['admin'],
  },
  {
    id: 'manage-diagnostics',
    label: 'Diagnostics',
    route: '/manage/diagnostics',
    iconName: 'Radio',
    roles: ['operator', 'admin'],
  },
  {
    id: 'manage-audit',
    label: 'Audit Log',
    route: '/manage/audit',
    iconName: 'History',
    roles: ['admin'],
  },
];

/**
 * Normalizes any route string, resolving legacy aliases and cleaning up trailing slashes.
 */
export function normalizeRoute(path: string): string {
  if (!path) return '/overview';
  const clean = path.split('?')[0]!.replace(/\/+$/, '') || '/';

  switch (clean) {
    case '/analytics':
      return '/insights/trends';
    case '/history':
      return '/insights/history';
    case '/reports':
      return '/insights/reports';
    case '/incidents':
      return '/insights/incidents';
    case '/live':
    case '/realtime':
      return '/manage/diagnostics';
    case '/devices':
      return '/manage/devices';
    case '/audit':
      return '/manage/audit';
    case '/preferences':
    case '/account':
    case '/account/preferences':
      return '/settings';
    case '/insights':
      return '/insights/trends';
    case '/manage':
      return '/manage/devices';
    case '/consumption':
    case '/billing':
    case '/insights/energy':
      return '/energy';
    case '/':
      return '/overview';
    default:
      return clean;
  }
}

/**
 * Returns minimum required role to access a given canonical path.
 */
export function getRequiredRoleForRoute(path: string): UserRole | null {
  const norm = normalizeRoute(path);

  if (norm.startsWith('/manage/devices') || norm.startsWith('/manage/audit') || norm.startsWith('/manage/rules')) {
    return 'admin';
  }

  if (norm.startsWith('/manage/diagnostics') || norm.startsWith('/diagnostics')) {
    return 'operator';
  }

  // All other authenticated routes (/overview, /channels, /insights/*, /alerts, /settings)
  return null;
}

/**
 * Determines whether a given user role has permission to access a route.
 */
export function canAccessRoute(role: UserRole | undefined, path: string): boolean {
  if (!role) return false;
  const req = getRequiredRoleForRoute(path);
  if (!req) return true;

  if (req === 'admin') {
    return role === 'admin';
  }

  if (req === 'operator') {
    return role === 'admin' || role === 'operator';
  }

  return true;
}

/**
 * Filters navigation items according to user role.
 */
export function getVisiblePrimaryNav(role?: UserRole): NavItemConfig[] {
  if (!role) return PRIMARY_NAV_ITEMS;
  return PRIMARY_NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function getVisibleManageNav(role?: UserRole): NavItemConfig[] {
  if (!role) return [];
  return MANAGE_NAV_ITEMS.filter((item) => item.roles.includes(role));
}
