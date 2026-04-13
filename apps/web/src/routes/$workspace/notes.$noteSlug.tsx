import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '~/lib/api';
import { useAuth } from '~/lib/auth-client';
import { AnimatedPage } from '@flowpigdev/ui';
import { RichTextEditor } from '~/components/rich-text-editor';
import { FileUploader } from '~/components/file-uploader';
import {
  ArrowLeft,
  MessageSquare,
  Send,
  Smile,
  MoreHorizontal,
  Plus,
  Trash2,
  Archive,
  Share2,
  ChevronRight,
  Clock,
  Edit3,
  History,
} from 'lucide-react';
import { NoteHistory } from '~/components/note-history';

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
}

interface NoteChild {
  id: string;
  title: string;
  slug: string;
  emoji: string | null;
  updatedAt: string;
}

interface Note {
  id: string;
  title: string;
  slug: string;
  content: Record<string, unknown> | null;
  emoji: string | null;
  coverImage: string | null;
  isArchived: boolean;
  isPublished: boolean;
  accessSettings: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    name: string | null;
    image: string | null;
    email: string;
  };
  lastEditor: {
    id: string;
    name: string | null;
    image: string | null;
    email: string;
  };
  parent: {
    id: string;
    title: string;
    slug: string;
  } | null;
  children: NoteChild[];
  comments: Comment[];
  isSubscribed: boolean;
}

export default function NoteDetailRoute() {
  const { workspace, noteSlug } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState<Record<string, unknown> | null>(null);
  const [editEmoji, setEditEmoji] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [showNewSubpage, setShowNewSubpage] = useState(false);
  const [newSubpageTitle, setNewSubpageTitle] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['note', workspace, noteSlug],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/notes/${noteSlug}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to load note');
      return response.json();
    },
  });

  const note: Note | undefined = data?.note;

  // Initialize edit state when note loads
  useEffect(() => {
    if (note && !isEditing) {
      setEditTitle(note.title);
      setEditContent(note.content);
      setEditEmoji(note.emoji);
    }
  }, [note, isEditing]);

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Note>) => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/notes/${note!.slug}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updates),
        }
      );
      if (!response.ok) throw new Error('Failed to update note');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['note', workspace, noteSlug] });
      queryClient.invalidateQueries({ queryKey: ['notes', workspace] });
      // If slug changed, navigate to new URL
      if (data.note.slug !== noteSlug) {
        navigate(`/${workspace}/notes/${data.note.slug}`, { replace: true });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/notes/${note!.slug}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to delete note');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', workspace] });
      navigate(`/${workspace}/notes`);
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/notes/${note!.id}/comments`,
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
      queryClient.invalidateQueries({ queryKey: ['note', workspace, noteSlug] });
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
      queryClient.invalidateQueries({ queryKey: ['note', workspace, noteSlug] });
      setShowEmojiPicker(null);
    },
  });

  const createSubpageMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/notes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            title,
            parentId: note!.id,
            emoji: '📄',
          }),
        }
      );
      if (!response.ok) throw new Error('Failed to create subpage');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['note', workspace, noteSlug] });
      queryClient.invalidateQueries({ queryKey: ['notes', workspace] });
      navigate(`/${workspace}/notes/${data.note.slug}`);
      setShowNewSubpage(false);
      setNewSubpageTitle('');
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      title: editTitle,
      content: editContent,
      emoji: editEmoji,
    });
    setIsEditing(false);
  };

  const handleArchive = () => {
    updateMutation.mutate({ isArchived: !note?.isArchived });
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this note?')) {
      deleteMutation.mutate();
    }
  };

  const handleContentChange = useCallback((content: Record<string, unknown>) => {
    setEditContent(content);
  }, []);

  const handleAddComment = (e: React.FormEvent) => {
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

  if (error || !note) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold text-gray-900">Note not found</h2>
        <Link to={`/${workspace}/notes`} className="text-primary-500 hover:text-primary-600 mt-4 inline-block">
          Back to notes
        </Link>
      </div>
    );
  }

  return (
    <AnimatedPage className="max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to={`/${workspace}/notes`} className="hover:text-gray-700">
          Notes
        </Link>
        {note.parent && (
          <>
            <ChevronRight className="w-4 h-4" />
            <Link to={`/${workspace}/notes/${note.parent.slug}`} className="hover:text-gray-700">
              {note.parent.title}
            </Link>
          </>
        )}
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium truncate">{note.title}</span>
      </div>

      {/* Cover Image */}
      {note.coverImage && (
        <div className="mb-8 rounded-xl overflow-hidden h-64 bg-gray-100">
          <img src={note.coverImage} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        {isEditing ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const emojis = ['📄', '📝', '📋', '📊', '🎯', '💡', '🚀', '📚', '🔧', '🎨', '📱', '💻'];
                  const currentIndex = emojis.indexOf(editEmoji || '📄');
                  const nextEmoji = emojis[(currentIndex + 1) % emojis.length];
                  setEditEmoji(nextEmoji);
                }}
                className="text-4xl hover:scale-110 transition-transform p-2 rounded-lg hover:bg-gray-100"
              >
                {editEmoji || '📄'}
              </button>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="flex-1 text-3xl font-bold border-b-2 border-gray-200 focus:border-primary-500 outline-none py-2 bg-transparent"
                placeholder="Note title"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditTitle(note.title);
                  setEditContent(note.content);
                  setEditEmoji(note.emoji);
                }}
                className="text-gray-600 hover:text-gray-900 px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="group">
            <div className="flex items-start gap-4">
              <span className="text-4xl">{note.emoji || '📄'}</span>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{note.title}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>Created by {note.creator.name || note.creator.email}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Edited {new Date(note.updatedAt).toLocaleDateString()}
                  </span>
                  {note.isPublished && (
                    <>
                      <span>•</span>
                      <span className="text-green-600">Published</span>
                    </>
                  )}
                  {note.isArchived && (
                    <>
                      <span>•</span>
                      <span className="text-orange-600">Archived</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowActions(!showActions)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  <AnimatePresence>
                    {showActions && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute right-0 top-full mt-1 bg-white shadow-lg rounded-lg border border-gray-200 py-1 w-48 z-10"
                      >
                        <button
                          onClick={() => {
                            handleArchive();
                            setShowActions(false);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                        >
                          <Archive className="w-4 h-4" />
                          {note.isArchived ? 'Unarchive' : 'Archive'}
                        </button>
                        <button
                          onClick={() => {
                            setShowHistory(true);
                            setShowActions(false);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                        >
                          <History className="w-4 h-4" />
                          Version History
                        </button>
                        <button
                          onClick={() => {
                            setShowActions(false);
                            // Share functionality
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                        >
                          <Share2 className="w-4 h-4" />
                          Share
                        </button>
                        <div className="border-t border-gray-100 my-1" />
                        <button
                          onClick={() => {
                            handleDelete();
                            setShowActions(false);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column - Content & Comments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Content */}
          <div className="bg-white rounded-xl border border-gray-200">
            {isEditing ? (
              <div className="p-6">
                <RichTextEditor
                  content={editContent || { type: 'doc', content: [] }}
                  onChange={handleContentChange}
                  placeholder="Start typing..."
                />
              </div>
            ) : (
              <div className="p-6">
                {note.content ? (
                  <div className="prose prose-lg max-w-none">
                    {/* Render content - simplified for now */}
                    <RichTextEditor
                      content={note.content}
                      onChange={() => {}}
                      readOnly
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-gray-400 hover:text-gray-600 italic"
                  >
                    Click to add content...
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Comments ({note.comments.length})
            </h3>

            {/* Comment list */}
            <div className="space-y-4 mb-6">
              <AnimatePresence>
                {note.comments.map((comment) => (
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
            <form onSubmit={handleAddComment} className="flex gap-3">
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-medium">
                {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <textarea
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
          {/* Subpages */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Subpages</h4>
              <button
                onClick={() => setShowNewSubpage(true)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <Plus className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <AnimatePresence>
              {showNewSubpage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3"
                >
                  <input
                    type="text"
                    value={newSubpageTitle}
                    onChange={(e) => setNewSubpageTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newSubpageTitle.trim()) {
                        createSubpageMutation.mutate(newSubpageTitle);
                      }
                      if (e.key === 'Escape') {
                        setShowNewSubpage(false);
                      }
                    }}
                    placeholder="New subpage title..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                    autoFocus
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => createSubpageMutation.mutate(newSubpageTitle)}
                      disabled={!newSubpageTitle.trim() || createSubpageMutation.isPending}
                      className="text-xs bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white px-3 py-1 rounded transition-colors"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setShowNewSubpage(false);
                        setNewSubpageTitle('');
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {note.children.length > 0 ? (
              <div className="space-y-2">
                {note.children.map((child) => (
                  <Link
                    key={child.id}
                    to={`/${workspace}/notes/${child.slug}`}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors text-sm"
                  >
                    <span>{child.emoji || '📄'}</span>
                    <span className="flex-1 truncate">{child.title}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No subpages yet</p>
            )}
          </div>

          {/* Subscribe */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Notifications</h4>
            <button
              onClick={() => updateMutation.mutate({ isSubscribed: !note.isSubscribed })}
              className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                note.isSubscribed
                  ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {note.isSubscribed ? 'Subscribed' : 'Subscribe'}
            </button>
          </div>

          {/* File Uploads */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Attachments</h4>
            <FileUploader
              workspaceId={workspace!}
              noteId={note.id}
              onUploadComplete={() => {
                queryClient.invalidateQueries({ queryKey: ['note', workspace, noteSlug] });
              }}
            />
          </div>
        </div>
      </div>

      {/* History Panel */}
      <NoteHistory
        workspaceId={workspace!}
        noteId={note.id}
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </AnimatedPage>
  );
}
