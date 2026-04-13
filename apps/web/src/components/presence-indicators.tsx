import { Users, MousePointer2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PresenceUser {
  userId: string;
  name: string;
  image?: string;
  cursor?: {
    x: number;
    y: number;
  };
}

interface PresenceIndicatorsProps {
  users: PresenceUser[];
  isConnected: boolean;
  isTyping: Record<string, boolean>;
  showCursors?: boolean;
}

const COLORS = [
  '#EF4444', // red
  '#F59E0B', // orange
  '#10B981', // green
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
];

function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function PresenceIndicators({ 
  users, 
  isConnected, 
  isTyping,
  showCursors = true,
}: PresenceIndicatorsProps) {
  const typingUsers = Object.entries(isTyping)
    .filter(([_, isTyping]) => isTyping)
    .map(([userId]) => users.find(u => u.userId === userId))
    .filter(Boolean) as PresenceUser[];

  if (users.length === 0 && !isConnected) return null;

  return (
    <>
      {/* Top-right presence indicator */}
      <div className="flex items-center gap-2">
        {/* Connection status */}
        {!isConnected && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Connecting...</span>
          </div>
        )}

        {/* Users count */}
        {users.length > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
            <Users className="w-3.5 h-3.5" />
            <span>{users.length + 1} viewing</span>
          </div>
        )}

        {/* User avatars */}
        <div className="flex -space-x-2">
          {users.slice(0, 3).map((user, index) => (
            <motion.div
              key={user.userId}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-white"
              style={{ 
                backgroundColor: getUserColor(user.userId),
                zIndex: users.length - index,
              }}
              title={user.name}
            >
              {user.image ? (
                <img 
                  src={user.image} 
                  alt={user.name} 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </motion.div>
          ))}
          {users.length > 3 && (
            <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-600">
              +{users.length - 3}
            </div>
          )}
        </div>
      </div>

      {/* Typing indicator */}
      <AnimatePresence>
        {typingUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-2 text-xs text-gray-500 mt-2"
          >
            <div className="flex gap-0.5">
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                className="w-1 h-1 bg-gray-400 rounded-full"
              />
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                className="w-1 h-1 bg-gray-400 rounded-full"
              />
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                className="w-1 h-1 bg-gray-400 rounded-full"
              />
            </div>
            <span>
              {typingUsers.length === 1 
                ? `${typingUsers[0].name} is typing...`
                : `${typingUsers.length} people are typing...`
              }
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Remote cursors */}
      {showCursors && users.map(user => (
        user.cursor && (
          <PresenceCursor
            key={user.userId}
            user={user}
            color={getUserColor(user.userId)}
          />
        )
      ))}
    </>
  );
}

interface PresenceCursorProps {
  user: PresenceUser;
  color: string;
}

function PresenceCursor({ user, color }: PresenceCursorProps) {
  if (!user.cursor) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        x: user.cursor.x,
        y: user.cursor.y,
      }}
      transition={{ 
        type: 'spring',
        damping: 30,
        stiffness: 200,
        mass: 0.5,
      }}
      className="fixed pointer-events-none z-50"
      style={{ left: 0, top: 0 }}
    >
      <MousePointer2 
        className="w-5 h-5" 
        style={{ color }}
        fill={color}
      />
      <div 
        className="absolute left-4 top-4 px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap"
        style={{ backgroundColor: color }}
      >
        {user.name}
      </div>
    </motion.div>
  );
}
