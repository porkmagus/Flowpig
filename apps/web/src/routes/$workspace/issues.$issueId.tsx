import { useState, useRef, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft,
  MoreHorizontal,
  Link as LinkIcon,
  Copy,
  Trash2,
  Archive,
  Clock,
  Calendar,
  Flag,
  User,
  Tag,
  FolderKanban,
  Layers,
  GitBranch,
  CheckCircle2,
  CircleDot,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  MessageSquare,
  Paperclip,
  Edit3,
  X,
  Check,
  Plus,
  ChevronDown,
  History,
  CornerUpRight,
  Loader2,
  MoveRight,
  Pencil,
  UserPlus,
  UserMinus,
  Trash,
  MessageCircle,
  GitCommit
} from 'lucide-react';
import { API_URL } from '~/lib/api';
import { useAuth } from '~/lib/auth-client';
import { cn } from '~/lib/utils';
import { FileAttachments } from '~/components/file-attachments';
import { GitIntegrationPanel } from '~/components/git-integration';
import { CreateIssueModal, useCreateIssueModal } from '~/components/create-issue-modal';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Input } from '~/components/ui/input';
import { FadeIn, StaggerContainer, StaggerItem } from '~/components/ui/motion';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  reactions: Reaction[];
}

interface Reaction {
  id: string;
  emoji: string;
  userId: string;
}

interface RelatedIssue {
  id: string;
  identifier: string;
  title: string;
  state: string;
  type: 'blocks' | 'blocked_by' | 'relates_to' | 'duplicates' | 'duplicated_by';
}

interface Label {
  id: string;
  name: string;
  color: string;
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  metadata: Record<string, any>;
  createdAt: string;
  actor: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
}

const priorities = [
  { id: 'URGENT', label: 'Urgent', color: 'text-priority-urgent', bg: 'bg-priority-urgent', icon: AlertTriangle },
  { id: 'HIGH', label: 'High', color: 'text-priority-high', bg: 'bg-priority-high', icon: Flag },
  { id: 'MEDIUM', label: 'Medium', color: 'text-priority-medium', bg: 'bg-priority-medium', icon: Flag },
  { id: 'LOW', label: 'Low', color: 'text-priority-low', bg: 'bg-priority-low', icon: Flag },
  { id: 'NO_PRIORITY', label: 'No priority', color: 'text-priority-none', bg: 'bg-linear-border', icon: CircleDot },
];

const states = [
  { id: 'BACKLOG', label: 'Backlog', color: '#6E6E6E' },
  { id: 'TODO', label: 'Todo', color: '#6E6E6E' },
  { id: 'IN_PROGRESS', label: 'In progress', color: '#F2A50C' },
  { id: 'DONE', label: 'Done', color: '#0D9B6A' },
  { id: 'CANCELED', label: 'Canceled', color: '#D13B3B' },
];

const reactions = ['👍', '👎', '❤️', '🎉', '😕', '👀', '🚀'];

export default function IssueDetail() {
  const { workspace, issueId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const createIssueModal = useCreateIssueModal();
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // UI State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [newComment, setNewComment] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'comments' | 'activity' | 'git'>('comments');
  const [showPropertyDropdown, setShowPropertyDropdown] = useState<string | null>(null);

  // Fetch issue
  const { data: issue, isLoading } = useQuery({
    queryKey: ['issue', issueId],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/issues/${issueId}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to fetch issue');
      return response.json();
    },
  });

  // Fetch activities
  const { data: activitiesData } = useQuery({
    queryKey: ['issue-activities', issueId],
    enabled: activeTab === 'activity',
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/issues/${issueId}/activities`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to fetch activities');
      return response.json() as Promise<{ activities: ActivityItem[] }>;
    },
  });

  // Fetch workspace data for dropdowns
  const { data: workspaceUsers } = useQuery({
    queryKey: ['workspace-users', workspace],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/members`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      const payload = await response.json() as {
        members: Array<{
          user: {
            id: string;
            name: string | null;
            email: string;
            image: string | null;
          };
        }>;
      };
      return payload.members.map((member) => member.user);
    },
  });

  const { data: teams } = useQuery({
    queryKey: ['teams', workspace],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/teams`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      const payload = await response.json() as { teams: any[] };
      return payload.teams || [];
    },
  });

  const { data: projects } = useQuery({
    queryKey: ['projects', workspace],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/projects`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      const payload = await response.json() as { projects: any[] };
      return payload.projects || [];
    },
  });

  const { data: labels } = useQuery({
    queryKey: ['labels', workspace],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/labels`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      const payload = await response.json().catch(() => ({ labels: [] })) as { labels?: any[] };
      return payload.labels || [];
    },
  });

  // Mutations
  const updateIssueMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/issues/${issueId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) throw new Error('Failed to update issue');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', issueId] });
      queryClient.invalidateQueries({ queryKey: ['issues', workspace] });
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ['issue', issueId] });
      setNewComment('');
    },
  });

  const addReactionMutation = useMutation({
    mutationFn: async ({ commentId, emoji }: { commentId: string; emoji: string }) => {
      const response = await fetch(
        `${API_URL}/comments/${commentId}/reactions`,
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
      queryClient.invalidateQueries({ queryKey: ['issue', issueId] });
      setShowEmojiPicker(null);
    },
  });

  const deleteIssueMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/issues/${issueId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to delete issue');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues', workspace] });
      navigate(`/${workspace}/issues`);
    },
  });

  // Handlers
  const startEditingTitle = () => {
    setEditTitle(issue?.title || '');
    setIsEditingTitle(true);
  };

  const saveTitle = () => {
    if (editTitle.trim() && editTitle !== issue?.title) {
      updateIssueMutation.mutate({ title: editTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const startEditingDescription = () => {
    setEditDescription(issue?.description || '');
    setIsEditingDescription(true);
  };

  const saveDescription = () => {
    if (editDescription !== issue?.description) {
      updateIssueMutation.mutate({ description: editDescription });
    }
    setIsEditingDescription(false);
  };

  const handleStatusChange = (newState: string) => {
    updateIssueMutation.mutate({ state: newState });
    setShowPropertyDropdown(null);
  };

  const handlePriorityChange = (newPriority: string) => {
    updateIssueMutation.mutate({ priority: newPriority });
    setShowPropertyDropdown(null);
  };

  const handleAssigneeChange = (userId: string | null) => {
    updateIssueMutation.mutate({ assigneeId: userId });
    setShowPropertyDropdown(null);
  };

  const copyIssueLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  const teamIssueNumber = issue?.team && issue.identifier.startsWith(`${issue.team.key}-`)
    ? Number.parseInt(issue.identifier.split('-')[1] || '0', 10)
    : 0;

  const selectedPriority = priorities.find(p => p.id === issue?.priority);
  const PriorityIcon = selectedPriority?.icon || CircleDot;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-linear-accent animate-spin" />
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="text-center py-16">
        <h3 className="text-base font-medium text-linear-text">Issue not found</h3>
        <Link to={`/${workspace}/issues`} className="text-linear-accent hover:text-linear-accent-hover text-sm mt-2 inline-block">
          Back to issues
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <FadeIn>
        <div className="flex items-center gap-2 mb-4">
          <Link 
            to={`/${workspace}/issues`}
            className="flex items-center gap-1 text-sm text-linear-text-secondary hover:text-linear-text transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Issues
          </Link>
          <span className="text-linear-text-tertiary">/</span>
          <span className="text-sm text-linear-text-tertiary">{issue.identifier}</span>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title section */}
          <div className="bg-linear-elevated rounded-lg border border-linear-border p-4">
            {isEditingTitle ? (
              <div className="flex items-start gap-2">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 text-lg font-semibold"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveTitle();
                    if (e.key === 'Escape') setIsEditingTitle(false);
                  }}
                />
                <Button size="sm" onClick={saveTitle}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditingTitle(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-start gap-3 group">
                <h1 
                  className="text-xl font-semibold text-linear-text flex-1 cursor-text"
                  onClick={startEditingTitle}
                >
                  {issue.title}
                </h1>
                <button 
                  onClick={startEditingTitle}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-linear-surface rounded transition-all"
                >
                  <Edit3 className="w-4 h-4 text-linear-text-secondary" />
                </button>
              </div>
            )}

            {/* Meta info */}
            <div className="flex items-center gap-4 mt-3 text-sm text-linear-text-secondary">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Created {new Date(issue.createdAt).toLocaleDateString()}
              </span>
              {issue.completedAt && (
                <span className="flex items-center gap-1.5 text-linear-success">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Completed {new Date(issue.completedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="bg-linear-elevated rounded-lg border border-linear-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-linear-text">Description</h3>
              {!isEditingDescription && (
                <button 
                  onClick={startEditingDescription}
                  className="text-xs text-linear-text-secondary hover:text-linear-text flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  Edit
                </button>
              )}
            </div>
            
            {isEditingDescription ? (
              <div className="space-y-3">
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={10}
                  className="w-full bg-linear-surface border border-linear-border rounded-lg px-3 py-2 text-sm text-linear-text focus:outline-none focus:ring-2 focus:ring-linear-accent resize-none"
                  placeholder="Add a description..."
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={saveDescription}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditingDescription(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none text-linear-text-secondary">
                {issue.description ? (
                  <div className="whitespace-pre-wrap">{issue.description}</div>
                ) : (
                  <p className="text-linear-text-tertiary italic">No description provided</p>
                )}
              </div>
            )}
          </div>

          {/* Sub-issues */}
          {(issue.parent || (issue.children && issue.children.length > 0)) && (
            <div className="bg-linear-elevated rounded-lg border border-linear-border p-4">
              {issue.parent && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-linear-text-secondary uppercase tracking-wider mb-2">Parent issue</p>
                  <Link
                    to={`/${workspace}/issues/${issue.parent.id}`}
                    className="flex items-center gap-2 text-sm text-linear-text hover:text-linear-accent transition-colors"
                  >
                    <span className="text-linear-text-secondary">{issue.parent.identifier}</span>
                    <span>{issue.parent.title}</span>
                  </Link>
                </div>
              )}
              {issue.children && issue.children.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-linear-text-secondary uppercase tracking-wider">
                      Sub-issues ({issue.children.length})
                    </p>
                  </div>
                  <div className="space-y-1">
                    {issue.children.map((child: any) => (
                      <Link
                        key={child.id}
                        to={`/${workspace}/issues/${child.id}`}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-linear-surface text-sm transition-colors"
                      >
                        <CircleDot className="w-3.5 h-3.5 text-linear-text-tertiary" />
                        <span className="text-linear-text-secondary">{child.identifier}</span>
                        <span className="text-linear-text">{child.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Create sub-issue button */}
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5"
              onClick={() =>
                createIssueModal.open({
                  teamId: issue.team?.id,
                  projectId: issue.project?.id,
                  parentId: issue.id,
                })
              }
            >
              <Plus className="w-3.5 h-3.5" />
              Add sub-issue
            </Button>
          </div>

          {/* Tabs */}
          <div className="bg-linear-elevated rounded-lg border border-linear-border">
            {/* Tab headers */}
            <div className="flex items-center gap-1 px-4 border-b border-linear-border">
              {[
                { id: 'comments', label: 'Comments', count: issue.comments?.length || 0 },
                { id: 'activity', label: 'Activity', icon: History, count: activitiesData?.activities?.length || 0 },
                { id: 'git', label: 'Git', icon: GitBranch },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors",
                    activeTab === tab.id
                      ? "border-linear-accent text-linear-accent"
                      : "border-transparent text-linear-text-secondary hover:text-linear-text"
                  )}
                >
                  {tab.icon && <tab.icon className="w-4 h-4" />}
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">
                      {tab.count}
                    </Badge>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-4">
              {activeTab === 'comments' && (
                <div className="space-y-4">
                  {/* Comment input */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-linear-accent text-white flex items-center justify-center text-xs font-medium shrink-0">
                      {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                      <textarea
                        ref={commentInputRef}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        rows={3}
                        className="w-full bg-linear-surface border border-linear-border rounded-lg px-3 py-2 text-sm text-linear-text placeholder:text-linear-text-tertiary focus:outline-none focus:ring-2 focus:ring-linear-accent resize-none"
                      />
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-linear-text-tertiary">
                          Markdown supported
                        </span>
                        <Button 
                          size="sm" 
                          disabled={!newComment.trim() || addCommentMutation.isPending}
                          onClick={() => addCommentMutation.mutate(newComment)}
                        >
                          {addCommentMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                              Comment
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Comments list */}
                  <div className="space-y-4">
                    {issue.comments?.map((comment: Comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-linear-surface border border-linear-border flex items-center justify-center text-xs font-medium text-linear-text-secondary shrink-0">
                          {comment.creator.name?.[0]?.toUpperCase() || comment.creator.email[0].toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm text-linear-text">
                              {comment.creator.name || comment.creator.email}
                            </span>
                            <span className="text-xs text-linear-text-tertiary">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-sm text-linear-text-secondary whitespace-pre-wrap">
                            {comment.content}
                          </div>
                          
                          {/* Reactions */}
                          <div className="flex items-center gap-1 mt-2">
                            {comment.reactions?.map((reaction: Reaction) => (
                              <button
                                key={reaction.id}
                                className="px-1.5 py-0.5 bg-linear-surface hover:bg-linear-border rounded text-sm transition-colors"
                              >
                                {reaction.emoji} 1
                              </button>
                            ))}
                            
                            <div className="relative">
                              <button
                                onClick={() => setShowEmojiPicker(showEmojiPicker === comment.id ? null : comment.id)}
                                className="p-1 text-linear-text-tertiary hover:text-linear-text hover:bg-linear-surface rounded transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              
                              {showEmojiPicker === comment.id && (
                                <div className="absolute bottom-full left-0 mb-1 p-1.5 bg-linear-elevated border border-linear-border rounded-lg shadow-elevation-2 flex gap-0.5">
                                  {reactions.map((emoji) => (
                                    <button
                                      key={emoji}
                                      onClick={() => addReactionMutation.mutate({ commentId: comment.id, emoji })}
                                      className="p-1 hover:bg-linear-surface rounded transition-colors text-lg"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-3">
                  {!activitiesData?.activities?.length ? (
                    <p className="text-sm text-linear-text-secondary text-center py-4">No activity yet</p>
                  ) : (
                    activitiesData.activities.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-linear-surface flex items-center justify-center shrink-0">
                          {activity.type === 'ISSUE_CREATED' && <CircleDot className="w-4 h-4 text-linear-accent" />}
                          {activity.type === 'ISSUE_STATE_CHANGED' && <MoveRight className="w-4 h-4 text-priority-high" />}
                          {activity.type === 'ISSUE_PRIORITY_CHANGED' && <Flag className="w-4 h-4 text-priority-urgent" />}
                          {activity.type === 'ISSUE_ASSIGNED' && <UserPlus className="w-4 h-4 text-linear-accent" />}
                          {activity.type === 'ISSUE_UPDATED' && <Pencil className="w-4 h-4 text-linear-text-secondary" />}
                          {activity.type === 'ISSUE_DELETED' && <Trash className="w-4 h-4 text-priority-urgent" />}
                          {activity.type === 'COMMENT_ADDED' && <MessageCircle className="w-4 h-4 text-linear-success" />}
                          {activity.type === 'ISSUE_RELATED' && <GitCommit className="w-4 h-4 text-linear-text-secondary" />}
                        </div>
                        <div>
                          <p className="text-sm text-linear-text">
                            <span className="font-medium">{activity.actor?.name || 'Someone'}</span>{' '}
                            {activity.description}
                          </p>
                          {activity.metadata && activity.type === 'ISSUE_STATE_CHANGED' && (
                            <p className="text-xs text-linear-text-secondary mt-0.5">
                              {activity.metadata.from} → {activity.metadata.to}
                            </p>
                          )}
                          <p className="text-xs text-linear-text-tertiary mt-0.5">
                            {new Date(activity.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'git' && (
                <GitIntegrationPanel
                  workspace={workspace || ''}
                  issueId={issue.id}
                  teamKey={issue.team?.key || ''}
                  issueNumber={teamIssueNumber}
                  issueTitle={issue.title}
                />
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <div className="bg-linear-elevated rounded-lg border border-linear-border p-3">
            <label className="text-xs font-medium text-linear-text-secondary uppercase tracking-wider mb-2 block">
              Status
            </label>
            <div className="relative">
              <button
                onClick={() => setShowPropertyDropdown(showPropertyDropdown === 'status' ? null : 'status')}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium border transition-colors",
                  issue.workflowState?.category === 'DONE' || issue.state === 'DONE'
                    ? "bg-linear-success/10 border-linear-success/30 text-linear-success"
                    : "bg-linear-surface border-linear-border hover:border-linear-border-hover"
                )}
              >
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: issue.workflowState?.color || '#6E6E6E' }}
                />
                <span className="flex-1 text-left">
                  {issue.workflowState?.name || issue.state}
                </span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              
              {showPropertyDropdown === 'status' && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-linear-elevated border border-linear-border rounded-lg shadow-elevation-2 z-50 py-1">
                  {states.map((state) => (
                    <button
                      key={state.id}
                      onClick={() => handleStatusChange(state.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-linear-surface transition-colors text-left"
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: state.color }} />
                      <span>{state.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Priority */}
          <div className="bg-linear-elevated rounded-lg border border-linear-border p-3">
            <label className="text-xs font-medium text-linear-text-secondary uppercase tracking-wider mb-2 block">
              Priority
            </label>
            <div className="relative">
              <button
                onClick={() => setShowPropertyDropdown(showPropertyDropdown === 'priority' ? null : 'priority')}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium border transition-colors",
                  selectedPriority?.bg.replace('/10', '/20'),
                  selectedPriority?.color
                )}
              >
                <PriorityIcon className="w-3.5 h-3.5" />
                <span className="flex-1 text-left">{selectedPriority?.label}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              
              {showPropertyDropdown === 'priority' && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-linear-elevated border border-linear-border rounded-lg shadow-elevation-2 z-50 py-1">
                  {priorities.map((priority) => (
                    <button
                      key={priority.id}
                      onClick={() => handlePriorityChange(priority.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-linear-surface transition-colors text-left",
                        priority.color
                      )}
                    >
                      <priority.icon className="w-3.5 h-3.5" />
                      <span>{priority.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Assignee */}
          <div className="bg-linear-elevated rounded-lg border border-linear-border p-3">
            <label className="text-xs font-medium text-linear-text-secondary uppercase tracking-wider mb-2 block">
              Assignee
            </label>
            <div className="relative">
              <button
                onClick={() => setShowPropertyDropdown(showPropertyDropdown === 'assignee' ? null : 'assignee')}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium border border-linear-border bg-linear-surface hover:border-linear-border-hover transition-colors"
              >
                {issue.assignee ? (
                  <>
                    <div className="w-5 h-5 rounded-full bg-linear-accent text-white flex items-center justify-center text-[10px] font-medium">
                      {issue.assignee.name?.[0]?.toUpperCase() || issue.assignee.email[0].toUpperCase()}
                    </div>
                    <span className="flex-1 text-left">{issue.assignee.name || issue.assignee.email}</span>
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4 text-linear-text-tertiary" />
                    <span className="flex-1 text-left text-linear-text-secondary">No assignee</span>
                  </>
                )}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              
              {showPropertyDropdown === 'assignee' && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-linear-elevated border border-linear-border rounded-lg shadow-elevation-2 z-50 py-1">
                  <button
                    onClick={() => handleAssigneeChange(null)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-linear-surface transition-colors text-left text-linear-text-secondary"
                  >
                    <X className="w-4 h-4" />
                    <span>No assignee</span>
                  </button>
                  {workspaceUsers?.map((user: any) => (
                    <button
                      key={user.id}
                      onClick={() => handleAssigneeChange(user.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-linear-surface transition-colors text-left"
                    >
                      <div className="w-5 h-5 rounded-full bg-linear-accent text-white flex items-center justify-center text-[10px] font-medium">
                        {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                      </div>
                      <span>{user.name || user.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Labels */}
          <div className="bg-linear-elevated rounded-lg border border-linear-border p-3">
            <label className="text-xs font-medium text-linear-text-secondary uppercase tracking-wider mb-2 block">
              Labels
            </label>
            <div className="flex flex-wrap gap-1">
              {issue.labels.length === 0 ? (
                <span className="text-sm text-linear-text-tertiary">None</span>
              ) : (
                issue.labels.map((label: Label) => (
                  <Badge
                    key={label.id}
                    variant="outline"
                    className="text-[10px]"
                    style={{
                      borderColor: label.color + '40',
                      backgroundColor: label.color + '15',
                      color: label.color
                    }}
                  >
                    {label.name}
                  </Badge>
                ))
              )}
            </div>
          </div>

          {(issue.project || issue.cycle) && (
            <div className="bg-linear-elevated rounded-lg border border-linear-border p-3 space-y-3">
              {issue.project && (
                <div>
                  <label className="text-xs font-medium text-linear-text-secondary uppercase tracking-wider mb-2 block">
                    Project
                  </label>
                  <Link
                    to={`/${workspace}/projects/${issue.project.id}`}
                    className="flex items-center gap-2 text-sm text-linear-text hover:text-linear-accent transition-colors"
                  >
                    <FolderKanban className="w-4 h-4 text-linear-text-tertiary" />
                    {issue.project.name}
                  </Link>
                </div>
              )}

              {issue.cycle && (
                <div>
                  <label className="text-xs font-medium text-linear-text-secondary uppercase tracking-wider mb-2 block">
                    Cycle
                  </label>
                  <Link
                    to={`/${workspace}/cycles/${issue.cycle.id}`}
                    className="flex items-center gap-2 text-sm text-linear-text hover:text-linear-accent transition-colors"
                  >
                    <Layers className="w-4 h-4 text-linear-text-tertiary" />
                    <span>{issue.cycle.name || `Cycle ${issue.cycle.number}`}</span>
                    {issue.cycle.isActive && (
                      <Badge variant="success" className="text-[10px] px-1.5 py-0 h-4">
                        Active
                      </Badge>
                    )}
                  </Link>
                </div>
              )}
            </div>
          )}

          <div className="bg-linear-elevated rounded-lg border border-linear-border p-3">
            <FileAttachments workspace={workspace || ''} issueId={issue.id} />
          </div>

          {/* Related issues */}
          {issue.relatedIssues && issue.relatedIssues.length > 0 && (
            <div className="bg-linear-elevated rounded-lg border border-linear-border p-3">
              <label className="text-xs font-medium text-linear-text-secondary uppercase tracking-wider mb-2 block">
                Related
              </label>
              <div className="space-y-2">
                {issue.relatedIssues.map((related: RelatedIssue) => (
                  <Link
                    key={related.id}
                    to={`/${workspace}/issues/${related.id}`}
                    className="flex items-center gap-2 text-sm hover:text-linear-accent transition-colors"
                  >
                    {related.type === 'blocks' && <CornerUpRight className="w-3.5 h-3.5 text-priority-urgent" />}
                    {related.type === 'blocked_by' && <CornerUpRight className="w-3.5 h-3.5 text-priority-urgent rotate-180" />}
                    {(related.type === 'relates_to' || related.type === 'duplicates' || related.type === 'duplicated_by') && (
                      <LinkIcon className="w-3.5 h-3.5 text-linear-text-tertiary" />
                    )}
                    <span className="text-linear-text-tertiary">{related.identifier}</span>
                    <span className="truncate">{related.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bg-linear-elevated rounded-lg border border-linear-border p-3 space-y-2">
            <button
              onClick={copyIssueLink}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-linear-text-secondary hover:text-linear-text hover:bg-linear-surface rounded-md transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy link
            </button>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this issue?')) {
                  deleteIssueMutation.mutate();
                }
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-priority-urgent hover:bg-priority-urgent/10 rounded-md transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete issue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
