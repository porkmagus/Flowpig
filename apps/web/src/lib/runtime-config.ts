function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
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

function getDefaultApiUrl() {
  if (typeof window === 'undefined') {
    return 'http://localhost:3001';
  }

  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  return `${protocol}//${window.location.hostname}:3001`;
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

const configuredApiUrl = alignLocalUrlHost(import.meta.env.VITE_API_URL?.trim());
const configuredWsUrl = alignLocalUrlHost(import.meta.env.VITE_WS_URL?.trim());

export const API_URL = configuredApiUrl
  ? stripTrailingSlash(configuredApiUrl)
  : stripTrailingSlash(getDefaultApiUrl());

export const WS_URL = normalizeWebSocketUrl(configuredWsUrl)
  || normalizeWebSocketUrl(toWebSocketOrigin(API_URL))
  || 'ws://localhost:3001/ws';
