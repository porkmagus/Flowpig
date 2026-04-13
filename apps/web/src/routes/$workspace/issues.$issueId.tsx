import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '~/lib/api';
import { useAuth } from '~/lib/auth-client';
import { AnimatedPage } from '@flowpigdev/ui';
import { 
  CircleDot,
  ArrowLeft,
  MessageSquare,
  Send,
  MoreHorizontal,
  User,
  Clock,
  Smile,
  Check,
  X,
} from 'lucide-react';

interface Comment {
  id: string;
  content: string;
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
      name: string;
    };
  }>;
  replies?: Comment[];
}

interface Issue {
  id: string;
  identifier: string;
  title: string;
  description: Record<string, unknown> | null;
  state: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
  assignee?: {
    id: string;
    name: string | null;
    image: string | null;
    email: string;
  } | null;
  creator: {
    id: string;
    name: string | null;
    image: string | null;
    email: string;
  };
  team: {
    id: string;
    name: string;
    key: string;
    color: string;
  };
  workflowState?: {
    id: string;
    name: string;
    key: string;
    color: string;
    category: string;
  };
  labels: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  comments: Comment[];
  isSubscribed: boolean;
}

const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
  'NO_PRIORITY': { label: 'No Priority', color: 'text-gray-500', bg: 'bg-gray-100' },
  'LOW': { label: 'Low', color: 'text-blue-500', bg: 'bg-blue-50' },
  'MEDIUM': { label: 'Medium', color: 'text-yellow-500', bg: 'bg-yellow-50' },
  'HIGH': { label: 'High', color: 'text-orange-500', bg: 'bg-orange-50' },
  'URGENT': { label: 'Urgent', color: 'text-red-500', bg: 'bg-red-50' },
};

export default function IssueDetailRoute() {
  const { workspace, issueId } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['issue', workspace, issueId],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/issues/${issueId}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to load issue');
      return response.json();
    },
  });

  const issue: Issue | undefined = data?.issue;

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/issues/${issueId}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ content }),
        }
      );
      if (!response.ok) throw new Error('Failed to add comment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', workspace, issueId] });
      setCommentText('');
    },
  });

  const addReactionMutation = useMutation({
    mutationFn: async ({ commentId, emoji }: { commentId: string; emoji: string }) => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/comments/${commentId}/reactions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ emoji }),
        }
      );
      if (!response.ok) throw new Error('Failed to add reaction');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', workspace, issueId] });
      setShowEmojiPicker(null);
    },
  });

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
      addCommentMutation.mutate(commentText);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold text-gray-900">Issue not found</h2>
        <Link to={`/${workspace}/issues`} className="text-primary-500 hover:text-primary-600 mt-4 inline-block">
          Back to issues
        </Link>
      </div>
    );
  }

  const priority = priorityConfig[issue.priority] || priorityConfig['NO_PRIORITY'];

  return (
    <AnimatedPage className="max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <Link 
        to={`/${workspace}/issues`}
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to issues
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-gray-500 font-medium">{issue.identifier}</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${priority.bg} ${priority.color}`}>
            {priority.label}
          </span>
          {issue.workflowState && (
            <span 
              className="px-2 py-1 rounded text-xs font-medium text-white"
              style={{ backgroundColor: issue.workflowState.color }}
            >
              {issue.workflowState.name}
            </span>
          )}
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{issue.title}</h1>
        
        {/* Meta row */}
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>Created by {issue.creator.name || issue.creator.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
          </div>
          {issue.assignee && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Assigned to</span>
              <span className="font-medium">{issue.assignee.name || issue.assignee.email}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column - Description & Comments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Description</h3>
            {issue.description ? (
              <div className="prose prose-sm max-w-none">
                {/* Simple description renderer - in real app, use a proper editor renderer */}
                <p className="text-gray-600">
                  {JSON.stringify(issue.description).slice(0, 200)}...
                </p>
              </div>
            ) : (
              <p className="text-gray-400 italic">No description provided</p>
            )}
          </div>

          {/* Comments */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Comments ({issue.comments.length})
            </h3>

            {/* Comment list */}
            <div className="space-y-4 mb-6">
              <AnimatePresence>
                {issue.comments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      {comment.creator.image ? (
                        <img 
                          src={comment.creator.image} 
                          alt={comment.creator.name || ''}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <span className="text-sm font-medium">
                          {(comment.creator.name || '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{comment.creator.name || 'Unknown'}</span>
                          <span className="text-xs text-gray-400">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm">{comment.content}</p>
                      </div>

                      {/* Reactions */}
                      <div className="flex items-center gap-2 mt-2">
                        {comment.reactions.map((reaction) => (
                          <button
                            key={reaction.id}
                            className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm transition-colors"
                            title={reaction.user.name}
                          >
                            <span>{reaction.emoji}</span>
                          </button>
                        ))}
                        
                        <div className="relative">
                          <button
                            onClick={() => setShowEmojiPicker(showEmojiPicker === comment.id ? null : comment.id)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            <Smile className="w-4 h-4 text-gray-400" />
                          </button>
                          
                          <AnimatePresence>
                            {showEmojiPicker === comment.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-lg border border-gray-200 p-2 z-10"
                              >
                                <div className="flex gap-1">
                                  {['👍', '👎', '😄', '🎉', '😕', '❤️', '🚀', '👀'].map((emoji) => (
                                    <button
                                      key={emoji}
                                      onClick={() => addReactionMutation.mutate({ commentId: comment.id, emoji })}
                                      className="p-1 hover:bg-gray-100 rounded text-lg"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Add comment */}
            <form onSubmit={handleSubmitComment} className="flex gap-3">
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-medium">
                {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <textarea
                  ref={commentInputRef}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  rows={3}
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={!commentText.trim() || addCommentMutation.isPending}
                    className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    {addCommentMutation.isPending ? (
                      'Sending...'
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Comment
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Right column - Sidebar */}
        <div className="space-y-4">
          {/* Status card */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Status</h4>
            <select 
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              defaultValue={issue.state}
            >
              <option value="BACKLOG">Backlog</option>
              <option value="TODO">Todo</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="DONE">Done</option>
            </select>
          </div>

          {/* Assignee card */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Assignee</h4>
            {issue.assignee ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  {(issue.assignee.name || issue.assignee.email || '?').charAt(0).toUpperCase()}
                </div>
                <span className="text-sm">{issue.assignee.name || issue.assignee.email}</span>
              </div>
            ) : (
              <button className="text-primary-500 hover:text-primary-600 text-sm">
                + Assign someone
              </button>
            )}
          </div>

          {/* Labels card */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Labels</h4>
            {issue.labels.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {issue.labels.map((label) => (
                  <span
                    key={label.id}
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{ 
                      backgroundColor: `${label.color}20`,
                      color: label.color,
                    }}
                  >
                    {label.name}
                  </span>
                ))}
              </div>
            ) : (
              <button className="text-primary-500 hover:text-primary-600 text-sm">
                + Add labels
              </button>
            )}
          </div>

          {/* Team card */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Team</h4>
            <div 
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: issue.team.color }}
            >
              {issue.team.key}
            </div>
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}
