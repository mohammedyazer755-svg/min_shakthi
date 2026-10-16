// Production API and sockets share the frontend origin, including Git previews.
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin)).replace(/\/$/,'');
