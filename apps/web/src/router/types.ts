import type { UserRole } from '@minsakthi/contracts';

export type CanonicalRoute =
  | '/overview'
  | '/channels'
  | '/insights'
  | '/insights/trends'
  | '/insights/history'
  | '/insights/reports'
  | '/alerts'
  | '/manage'
  | '/manage/devices'
  | '/manage/diagnostics'
  | '/manage/audit'
  | '/settings'
  | '/showcase';

export interface RouteMatch {
  canonicalPath: string;
  section: 'overview' | 'channels' | 'insights' | 'alerts' | 'manage' | 'settings' | 'showcase';
  subTab?: string;
  params: Record<string, string>;
  isAllowed: boolean;
}

export interface NavigateOptions {
  replace?: boolean;
  preserveQuery?: boolean;
}

export interface RouterContextValue {
  path: string;
  canonicalPath: string;
  queryParams: URLSearchParams;
  selectedDevice: string;
  availableDevices: string[];
  setAvailableDevices: (devices: string[]) => void;
  navigate: (to: string, options?: NavigateOptions) => void;
  selectDevice: (deviceId: string) => void;
  isAllowedRoute: boolean;
  requiredRole?: UserRole;
}
