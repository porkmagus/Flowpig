import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WS_URL } from '~/lib/runtime-config';

interface Cursor {
  id: string;
  x: number;
  y: number;
  name: string;
  color: string;
  isTyping?: boolean;
}

interface PresenceUser {
  id: string;
  name: string;
  email: string;
  color: string;
  isOnline: boolean;
  isTyping?: boolean;
  lastSeen: string;
}

const CURSOR_COLORS = [
  '#5E6AD2', // Linear indigo
  '#F2A50C', // Yellow
  '#0D9B6A', // Green
  '#D13B3B', // Red
  '#7C3AED', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

export function useRealtimePresence(workspaceId: string, currentUserId: string) {
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [cursors, setCursors] = useState<Cursor[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const heartbeatRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      setIsConnected(true);
      
      // Authenticate
      ws.send(JSON.stringify({
        type: 'auth',
        workspaceId,
        userId: currentUserId,
      }));

      // Subscribe to workspace
      ws.send(JSON.stringify({
        type: 'subscribe',
        channel: `workspace:${workspaceId}`,
      }));

      // Start heartbeat
      heartbeatRef.current = setInterval(() => {
        ws.send(JSON.stringify({ type: 'ping' }));
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'presence':
            setUsers(prev => {
              const existing = prev.find(u => u.id === message.user.id);
              if (existing) {
                return prev.map(u => u.id === message.user.id ? { ...u, ...message.user } : u);
              }
              return [...prev, { ...message.user, color: CURSOR_COLORS[prev.length % CURSOR_COLORS.length] }];
            });
            break;
            
          case 'cursor':
            setCursors(prev => {
              const existing = prev.find(c => c.id === message.userId);
              if (existing) {
                return prev.map(c => c.id === message.userId 
                  ? { ...c, x: message.x, y: message.y } 
                  : c
                );
              }
              const user = users.find(u => u.id === message.userId);
              return [...prev, {
                id: message.userId,
                x: message.x,
                y: message.y,
                name: user?.name || 'Anonymous',
                color: user?.color || CURSOR_COLORS[0],
              }];
            });
            break;
            
          case 'typing':
            setUsers(prev => prev.map(u => 
              u.id === message.userId ? { ...u, isTyping: message.isTyping } : u
            ));
            break;
            
          case 'user_left':
            setUsers(prev => prev.filter(u => u.id !== message.userId));
            setCursors(prev => prev.filter(c => c.id !== message.userId));
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      clearInterval(heartbeatRef.current);
      
      // Reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current = ws;
  }, [workspaceId, currentUserId, users]);

  useEffect(() => {
    connect();
    
    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      clearInterval(heartbeatRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendCursorPosition = useCallback((x: number, y: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'cursor',
        x,
        y,
      }));
    }
  }, []);

  const sendTypingStatus = useCallback((isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        isTyping,
      }));
    }
  }, []);

  return {
    users,
    cursors,
    isConnected,
    sendCursorPosition,
    sendTypingStatus,
  };
}

export function LiveCursors({ cursors }: { cursors: Cursor[] }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {cursors.map((cursor) => (
          <motion.div
            key={cursor.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute"
            style={{
              left: cursor.x,
              top: cursor.y,
            }}
          >
            {/* Cursor arrow */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              style={{ 
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))',
                transform: 'rotate(-15deg)'
              }}
            >
              <path
                d="M3 3L10.5 20.5L13.5 13.5L20.5 10.5L3 3Z"
                fill={cursor.color}
                stroke="white"
                strokeWidth="1.5"
              />
            </svg>
            
            {/* Name tag */}
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="absolute left-4 top-4 px-2 py-1 rounded-md text-xs font-medium text-white whitespace-nowrap"
              style={{ backgroundColor: cursor.color }}
            >
              {cursor.name}
              {cursor.isTyping && (
                <span className="ml-1.5">
                  <span className="animate-pulse">typing</span>
                </span>
              )}
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function PresenceIndicators({ users, maxShown = 3 }: { users: PresenceUser[]; maxShown?: number }) {
  const displayedUsers = users.slice(0, maxShown);
  const remainingCount = users.length - maxShown;

  return (
    <div className="flex items-center -space-x-2">
      {displayedUsers.map((user) => (
        <div
          key={user.id}
          className="relative group"
        >
          <div
            className="w-7 h-7 rounded-full border-2 border-linear-elevated flex items-center justify-center text-xs font-medium text-white transition-transform hover:scale-110"
            style={{ backgroundColor: user.color }}
            title={user.name || user.email}
          >
            {(user.name?.[0] || user.email[0]).toUpperCase()}
          </div>
          
          {/* Online indicator */}
          {user.isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-linear-success rounded-full border-2 border-linear-elevated" />
          )}
          
          {/* Typing indicator */}
          {user.isTyping && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-linear-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-linear-accent" />
            </span>
          )}
          
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-linear-text text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            {user.name || user.email}
            {user.isTyping && ' (typing...)'}
          </div>
        </div>
      ))}
      
      {remainingCount > 0 && (
        <div className="w-7 h-7 rounded-full bg-linear-surface border-2 border-linear-elevated flex items-center justify-center text-xs font-medium text-linear-text-secondary">
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

export function TypingIndicator({ users }: { users: PresenceUser[] }) {
  const typingUsers = users.filter(u => u.isTyping);
  
  if (typingUsers.length === 0) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2 text-sm text-linear-text-secondary"
    >
      <div className="flex items-center -space-x-1">
        {typingUsers.slice(0, 2).map((user) => (
          <div
            key={user.id}
            className="w-5 h-5 rounded-full border border-linear-elevated flex items-center justify-center text-[10px] font-medium text-white"
            style={{ backgroundColor: user.color }}
          >
            {(user.name?.[0] || user.email[0]).toUpperCase()}
          </div>
        ))}
      </div>
      <span>
        {typingUsers.length === 1 
          ? `${typingUsers[0].name || typingUsers[0].email} is typing...`
          : `${typingUsers.length} people are typing...`}
      </span>
      <span className="flex gap-0.5">
        <span className="w-1 h-1 rounded-full bg-linear-text-tertiary animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1 h-1 rounded-full bg-linear-text-tertiary animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1 h-1 rounded-full bg-linear-text-tertiary animate-bounce" style={{ animationDelay: '300ms' }} />
      </span>
    </motion.div>
  );
}

export function ConnectionStatus({ isConnected }: { isConnected: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={cn(
        "w-2 h-2 rounded-full",
        isConnected ? "bg-linear-success" : "bg-priority-urgent"
      )} />
      <span className={isConnected ? "text-linear-success" : "text-priority-urgent"}>
        {isConnected ? 'Connected' : 'Reconnecting...'}
      </span>
    </div>
  );
}

// Utility for tracking mouse position
export function useMousePosition(onMove: (x: number, y: number) => void, throttleMs = 50) {
  const lastUpdateRef = useRef(0);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastUpdateRef.current < throttleMs) return;
      
      cancelAnimationFrame(rafRef.current!);
      rafRef.current = requestAnimationFrame(() => {
        onMove(e.clientX, e.clientY);
        lastUpdateRef.current = now;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafRef.current!);
    };
  }, [onMove, throttleMs]);
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
