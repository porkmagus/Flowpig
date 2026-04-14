import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '~/lib/auth-client';
import { WS_URL } from './runtime-config';

interface PresenceUser {
  userId: string;
  name: string;
  image?: string;
  cursor?: {
    x: number;
    y: number;
    blockId?: string;
  };
}

interface PresenceState {
  users: PresenceUser[];
  isConnected: boolean;
  isTyping: Record<string, boolean>;
}

export function usePresence(workspaceId: string, pageType: 'issue' | 'note', pageId: string) {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [presence, setPresence] = useState<PresenceState>({
    users: [],
    isConnected: false,
    isTyping: {},
  });
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (!user || !pageId) return;

    const connectWebSocket = () => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setPresence(prev => ({ ...prev, isConnected: true }));

        // Authenticate
        ws.send(JSON.stringify({
          type: 'auth',
          token: document.cookie.match(/better-auth\.session_token=([^;]+)/)?.[1],
        }));
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'auth_success':
            // Subscribe to workspace and set presence
            ws.send(JSON.stringify({
              type: 'subscribe',
              workspaceId,
            }));

            // Set presence on current page
            setTimeout(() => {
              ws.send(JSON.stringify({
                type: 'presence',
                page: { type: pageType, id: pageId },
                userInfo: {
                  name: user.name || user.email,
                  image: user.image,
                },
              }));
            }, 100);
            break;

          case 'presence.update':
            if (message.payload.pageId === pageId && message.payload.pageType === pageType) {
              setPresence(prev => ({
                ...prev,
                users: message.payload.viewers,
              }));
            }
            break;

          case 'cursor.update':
            if (message.payload.page.id === pageId && message.payload.page.type === pageType) {
              setPresence(prev => ({
                ...prev,
                users: prev.users.map(u =>
                  u.userId === message.payload.userId
                    ? { ...u, cursor: message.payload.cursor }
                    : u
                ),
              }));
            }
            break;

          case 'typing':
            if (message.payload.page.id === pageId && message.payload.page.type === pageType) {
              setPresence(prev => ({
                ...prev,
                isTyping: {
                  ...prev.isTyping,
                  [message.payload.userId]: message.payload.isTyping,
                },
              }));
            }
            break;

          case 'pong':
            break;
        }
      };

      ws.onclose = () => {
        setPresence(prev => ({ ...prev, isConnected: false }));
        
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [user, workspaceId, pageType, pageId]);

  // Send cursor position
  const sendCursorPosition = useCallback((x: number, y: number, blockId?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'cursor',
        cursor: { x, y, blockId },
      }));
    }
  }, []);

  // Send typing indicator
  const sendTyping = useCallback((isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        isTyping,
      }));
    }
  }, []);

  return {
    ...presence,
    sendCursorPosition,
    sendTyping,
    otherUsers: presence.users.filter(u => u.userId !== user?.id),
  };
}
