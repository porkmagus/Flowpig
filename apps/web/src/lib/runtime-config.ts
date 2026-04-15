function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function isLocalhostUrl(value?: string) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function alignLocalUrlHost(value?: string) {
  if (!value || typeof window === 'undefined' || !import.meta.env.DEV) {
    return value;
  }

  try {
    const url = new URL(value);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      url.hostname = window.location.hostname;
    }
    return url.toString();
  } catch {
    return value;
  }
}

function inferApiUrlFromWindow() {
  if (typeof window === 'undefined') {
    return 'http://localhost:3001';
  }

  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  const hostname = window.location.hostname;

  // If we're on a subdomain like app.example.com, assume api.example.com
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    return `${protocol}//api.${parts.slice(1).join('.')}`;
  }

  // Otherwise just prefix api.
  if (parts.length >= 2) {
    return `${protocol}//api.${hostname}`;
  }

  return `${protocol}//${hostname}:3001`;
}

function getDefaultApiUrl() {
  if (typeof window === 'undefined') {
    return 'http://localhost:3001';
  }

  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  return `${protocol}//${window.location.hostname}:3001`;
}

function resolveApiUrl() {
  const raw = alignLocalUrlHost(import.meta.env.VITE_API_URL?.trim());

  // In production (or any non-localhost page), ignore localhost configs
  if (typeof window !== 'undefined' && raw && isLocalhostUrl(raw) && !isLocalhostUrl(window.location.origin)) {
    const inferred = inferApiUrlFromWindow();
    return stripTrailingSlash(inferred);
  }

  if (raw) {
    return stripTrailingSlash(raw);
  }

  return stripTrailingSlash(getDefaultApiUrl());
}

function toWebSocketOrigin(value: string) {
  if (value.startsWith('https://')) {
    return `wss://${value.slice('https://'.length)}`;
  }

  if (value.startsWith('http://')) {
    return `ws://${value.slice('http://'.length)}`;
  }

  return value;
}

function normalizeWebSocketUrl(value?: string) {
  if (!value) {
    return undefined;
  }

  const normalized = stripTrailingSlash(value);
  return normalized.endsWith('/ws') ? normalized : `${normalized}/ws`;
}

const configuredWsUrl = alignLocalUrlHost(import.meta.env.VITE_WS_URL?.trim());

export const API_URL = resolveApiUrl();

export const WS_URL = normalizeWebSocketUrl(configuredWsUrl)
  || normalizeWebSocketUrl(toWebSocketOrigin(API_URL))
  || 'ws://localhost:3001/ws';
