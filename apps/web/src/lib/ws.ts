import { useEffect, useRef, useState, useCallback } from 'react';
import { WS_URL } from './runtime-config';

interface WebSocketMessage {
  type: string;
  payload?: any;
  error?: string;
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnect?: boolean;
  reconnectInterval?: number;
}

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnect = true,
    reconnectInterval = 3000,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const subscribedWorkspaces = useRef<Set<string>>(new Set());

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        onConnect?.();

        // Authenticate if we have a session cookie
        const sessionToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('better-auth.session_token='))
          ?.split('=')[1];

        if (sessionToken) {
          ws.send(JSON.stringify({
            type: 'auth',
            token: sessionToken,
          }));
        }

        // Re-subscribe to previous workspaces
        subscribedWorkspaces.current.forEach((workspaceId) => {
          ws.send(JSON.stringify({
            type: 'subscribe',
            workspaceId,
          }));
        });
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          
          switch (message.type) {
            case 'auth_success':
              setIsAuthenticated(true);
              break;
            case 'auth_error':
              console.error('WebSocket auth error:', message.error);
              setIsAuthenticated(false);
              break;
            case 'subscribed':
              break;
            default:
              onMessage?.(message);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsAuthenticated(false);
        onDisconnect?.();

        if (reconnect) {
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(error);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [url, onMessage, onConnect, onDisconnect, onError, reconnect, reconnectInterval]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsAuthenticated(false);
  }, []);

  // Subscribe to workspace
  const subscribe = useCallback((workspaceId: string) => {
    subscribedWorkspaces.current.add(workspaceId);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        workspaceId,
      }));
    }
  }, []);

  // Unsubscribe from workspace
  const unsubscribe = useCallback((workspaceId: string) => {
    subscribedWorkspaces.current.delete(workspaceId);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        workspaceId,
      }));
    }
  }, []);

  // Send message
  const send = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    isAuthenticated,
    subscribe,
    unsubscribe,
    send,
    connect,
    disconnect,
  };
}

// Hook for workspace-specific real-time updates
export function useWorkspaceRealtime(
  workspaceId: string | undefined,
  handlers: {
    onIssueUpdated?: (issueId: string, changes: any) => void;
    onCommentCreated?: (data: { issueId?: string; noteId?: string; comment: any }) => void;
    onNoteUpdated?: (noteId: string, changes: any) => void;
    onNotificationCreated?: (notification: any) => void;
  } = {}
) {
  const { isConnected, isAuthenticated, subscribe, unsubscribe } = useWebSocket(WS_URL, {
    onMessage: (message) => {
      switch (message.type) {
        case 'issue.updated':
          handlers.onIssueUpdated?.(
            message.payload?.issueId,
            message.payload?.changes
          );
          break;
        case 'comment.created':
          handlers.onCommentCreated?.(message.payload);
          break;
        case 'note.updated':
          handlers.onNoteUpdated?.(
            message.payload?.noteId,
            message.payload?.changes
          );
          break;
        case 'notification.created':
          handlers.onNotificationCreated?.(message.payload?.notification);
          break;
      }
    },
  });

  // Subscribe/unsubscribe when workspace changes
  useEffect(() => {
    if (workspaceId && isAuthenticated) {
      subscribe(workspaceId);

      return () => {
        unsubscribe(workspaceId);
      };
    }
  }, [workspaceId, isAuthenticated, subscribe, unsubscribe]);

  return {
    isConnected,
    isAuthenticated,
  };
}
