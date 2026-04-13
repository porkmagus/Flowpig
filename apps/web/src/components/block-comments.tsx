import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '~/lib/api';
import { 
  MessageSquare, 
  X, 
  Send,
  MoreHorizontal,
  Trash2,
  Smile,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface BlockCommentThreadProps {
  workspace: string;
  noteId: string;
  blockId: string;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
}

interface Comment {
  id: string;
  content: string;
  blockId: string | null;
  blockType: string | null;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    name: string | null;
    image: string | null;
  };
  reactions: Array<{
    id: string;
    emoji: string;
    user: {
      id: string;
      name: string | null;
    };
  }>;
  replies: Comment[];
}

export function BlockCommentThread({ 
  workspace, 
  noteId, 
  blockId, 
  isActive, 
  onActivate, 
  onClose 
}: BlockCommentThreadProps) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['block-comments', noteId, blockId],
    queryFn: async (): Promise<{ comments: Comment[] }> => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/notes/${noteId}/comments?blockId=${blockId}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to load comments');
      return response.json();
    },
    enabled: isActive,
  });

  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/notes/${noteId}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            content,
            blockId,
            parentId: replyTo,
          }),
        }
      );
      if (!response.ok) throw new Error('Failed to create comment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['block-comments', noteId, blockId] });
      setNewComment('');
      setReplyTo(null);
    },
    onError: () => {
      toast.error('Failed to add comment');
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/notes/${noteId}/comments/${commentId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to delete comment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['block-comments', noteId, blockId] });
    },
  });

  const comments = data?.comments || [];

  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive, replyTo]);

  if (!isActive && comments.length === 0) {
    return (
      <button
        onClick={onActivate}
        className="absolute -right-10 top-0 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-linear-elevated rounded"
      >
        <MessageSquare className="w-4 h-4 text-linear-text-tertiary" />
      </button>
    );
  }

  return (
    <div className={`
      absolute -right-80 top-0 w-72 bg-linear-surface rounded-xl shadow-2xl border border-linear-border z-50
      ${isActive ? 'block' : 'hidden group-hover:block'}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-linear-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-linear-text-secondary" />
          <span className="font-medium text-sm text-linear-text">
            {comments.length} comment{comments.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-linear-elevated rounded"
        >
          <X className="w-4 h-4 text-linear-text-tertiary" />
        </button>
      </div>

      {/* Comments list */}
      <div className="max-h-80 overflow-y-auto p-3 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-linear-accent/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center text-sm text-linear-text-secondary py-4">
            No comments yet. Start a discussion!
          </p>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={() => setReplyTo(comment.id)}
              onDelete={() => deleteCommentMutation.mutate(comment.id)}
            />
          ))
        )}
      </div>

      {/* Input */}
      {isActive && (
        <div className="p-3 border-t border-linear-border">
          {replyTo && (
            <div className="flex items-center justify-between mb-2 text-xs text-linear-text-secondary bg-linear-elevated/50 px-2 py-1 rounded">
              <span>Replying to comment</span>
              <button onClick={() => setReplyTo(null)}>
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 min-h-[60px] p-2 text-sm border border-linear-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-linear-accent/40"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  if (newComment.trim()) {
                    createCommentMutation.mutate(newComment.trim());
                  }
                }
              }}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-linear-text-tertiary">Cmd+Enter to send</span>
            <button
              onClick={() => {
                if (newComment.trim()) {
                  createCommentMutation.mutate(newComment.trim());
                }
              }}
              disabled={!newComment.trim() || createCommentMutation.isPending}
              className="flex items-center gap-1 px-3 py-1.5 bg-linear-accent text-white text-sm rounded-lg hover:bg-linear-accent/80 disabled:opacity-50 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Comment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface CommentItemProps {
  comment: Comment;
  onReply: () => void;
  onDelete: () => void;
}

function CommentItem({ comment, onReply, onDelete }: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="shrink-0">
          {comment.creator.image ? (
            <img 
              src={comment.creator.image} 
              alt="" 
              className="w-7 h-7 rounded-full"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-linear-elevated flex items-center justify-center text-xs font-medium">
              {comment.creator.name?.[0] || '?'}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm text-linear-text">
              {comment.creator.name || 'Unknown'}
            </span>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-linear-elevated rounded opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal className="w-4 h-4 text-linear-text-tertiary" />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-32 bg-linear-surface border border-linear-border rounded-lg shadow-lg z-10 py-1">
                  <button
                    onClick={() => {
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          <p className="text-sm text-linear-text-secondary mt-0.5">{comment.content}</p>

          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-linear-text-tertiary">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
            <button
              onClick={onReply}
              className="text-xs text-linear-text-secondary hover:text-linear-text-secondary"
            >
              Reply
            </button>
          </div>

          {/* Reactions */}
          {comment.reactions.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              {comment.reactions.map((reaction) => (
                <button
                  key={reaction.id}
                  className="flex items-center gap-1 px-2 py-0.5 bg-linear-elevated hover:bg-linear-elevated rounded-full text-sm"
                  title={reaction.user.name || 'Unknown'}
                >
                  {reaction.emoji}
                </button>
              ))}
              <button className="p-1 hover:bg-linear-elevated rounded-full">
                <Smile className="w-3.5 h-3.5 text-linear-text-tertiary" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div className="ml-9">
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-1 text-xs text-linear-text-secondary hover:text-linear-text-secondary mb-2"
          >
            {showReplies ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
            {comment.replies.length} repl{comment.replies.length === 1 ? 'y' : 'ies'}
          </button>

          <AnimatePresence>
            {showReplies && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2"
              >
                {comment.replies.map((reply) => (
                  <div key={reply.id} className="flex gap-2">
                    <div className="shrink-0">
                      {reply.creator.image ? (
                        <img 
                          src={reply.creator.image} 
                          alt="" 
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-linear-elevated flex items-center justify-center text-xs">
                          {reply.creator.name?.[0] || '?'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <span className="font-medium text-sm text-linear-text">
                        {reply.creator.name || 'Unknown'}
                      </span>
                      <p className="text-sm text-linear-text-secondary">{reply.content}</p>
                      <span className="text-xs text-linear-text-tertiary">
                        {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
