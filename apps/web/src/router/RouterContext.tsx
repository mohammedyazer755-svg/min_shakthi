import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { UserRole } from '@minsakthi/contracts';
import { normalizeRoute, canAccessRoute, getRequiredRoleForRoute } from '../navigation/roleNav';
import { safeViewTransition } from '../motion';
import type { RouterContextValue, NavigateOptions } from './types';

const RouterContext = createContext<RouterContextValue | undefined>(undefined);

export interface RouterProviderProps {
  children: React.ReactNode;
  initialPath?: string;
  initialDevice?: string;
  userRole?: UserRole;
}

export const RouterProvider: React.FC<RouterProviderProps> = ({
  children,
  initialPath = '/overview',
  initialDevice = 'prototype1',
  userRole,
}) => {
  // Read from window if available (browser runtime)
  const isBrowser = typeof window !== 'undefined';

  const [initialPathname, initialSearch] = useMemo(() => {
    const parts = (initialPath || '/overview').split('?');
    return [parts[0] || '/overview', parts[1] ? `?${parts[1]}` : ''];
  }, [initialPath]);

  const [rawPath, setRawPath] = useState<string>(() => {
    if (isBrowser && window.location.pathname && window.location.pathname !== '/') {
      return window.location.pathname;
    }
    return initialPathname;
  });

  const [searchStr, setSearchStr] = useState<string>(() => {
    if (isBrowser && window.location.search) {
      return window.location.search;
    }
    return initialSearch;
  });

  const queryParams = useMemo(() => new URLSearchParams(searchStr), [searchStr]);

  const [availableDevices, setAvailableDevices] = useState<string[]>(['prototype1', 'prototype2']);

  const [selectedDeviceState, setSelectedDeviceState] = useState<string>(() => {
    const qDev = queryParams.get('device');
    return qDev || initialDevice;
  });

  // Keep device selection in sync with query parameter
  const selectedDevice = useMemo(() => {
    const qDev = queryParams.get('device');
    return qDev || selectedDeviceState;
  }, [queryParams, selectedDeviceState]);

  const canonicalPath = useMemo(() => normalizeRoute(rawPath), [rawPath]);
  const isAllowedRoute = useMemo(() => canAccessRoute(userRole, canonicalPath), [userRole, canonicalPath]);
  const requiredRole = useMemo(() => getRequiredRoleForRoute(canonicalPath) ?? undefined, [canonicalPath]);

  // Browser Back/Forward navigation listener
  useEffect(() => {
    if (!isBrowser) return;

    const onPopState = () => {
      const currentPath = window.location.pathname;
      const currentSearch = window.location.search;
      setRawPath(currentPath && currentPath !== '/' ? currentPath : '/overview');
      setSearchStr(currentSearch);

      const params = new URLSearchParams(currentSearch);
      const dev = params.get('device');
      if (dev) {
        setSelectedDeviceState(dev);
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isBrowser]);

  // Programmatic navigation
  const navigate = useCallback(
    (to: string, options?: NavigateOptions) => {
      const [newPath, newSearch] = to.split('?');
      const targetPath = normalizeRoute(newPath || '/overview');

      const nextParams = new URLSearchParams(newSearch || '');

      // Preserve device selection unless explicitly changed in target URL
      if (!nextParams.has('device') && selectedDevice) {
        nextParams.set('device', selectedDevice);
      }

      const queryString = nextParams.toString() ? `?${nextParams.toString()}` : '';
      const fullUrl = `${targetPath}${queryString}`;

      if (isBrowser) {
        if (options?.replace) {
          window.history.replaceState(null, '', fullUrl);
        } else {
          window.history.pushState(null, '', fullUrl);
        }
      }

      safeViewTransition(() => {
        setRawPath(targetPath);
        setSearchStr(queryString);
        if (nextParams.get('device')) {
          setSelectedDeviceState(nextParams.get('device')!);
        }
      });
    },
    [isBrowser, selectedDevice]
  );

  // Device selection updater (updates URL without full page reload)
  const selectDevice = useCallback(
    (deviceId: string) => {
      setSelectedDeviceState(deviceId);

      const nextParams = new URLSearchParams(searchStr);
      nextParams.set('device', deviceId);
      const queryString = `?${nextParams.toString()}`;
      const fullUrl = `${canonicalPath}${queryString}`;

      if (isBrowser) {
        window.history.replaceState(null, '', fullUrl);
      }
      setSearchStr(queryString);
    },
    [isBrowser, searchStr, canonicalPath]
  );

  const value: RouterContextValue = {
    path: rawPath,
    canonicalPath,
    queryParams,
    selectedDevice,
    availableDevices,
    setAvailableDevices,
    navigate,
    selectDevice,
    isAllowedRoute,
    requiredRole,
  };

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
};

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return ctx;
}
