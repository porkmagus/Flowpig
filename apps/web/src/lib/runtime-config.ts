function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
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

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

export const API_URL = configuredApiUrl
  ? stripTrailingSlash(configuredApiUrl)
  : 'http://localhost:3001';

export const WS_URL = normalizeWebSocketUrl(import.meta.env.VITE_WS_URL?.trim())
  || normalizeWebSocketUrl(toWebSocketOrigin(API_URL))
  || 'ws://localhost:3001/ws';
