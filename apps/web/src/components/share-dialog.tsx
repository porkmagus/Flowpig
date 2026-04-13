import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '~/lib/api';
import { 
  Share2, 
  Link, 
  Copy, 
  Check, 
  Globe, 
  Lock, 
  Eye, 
  MessageSquare, 
  Edit3,
  X,
  Mail,
  UserPlus,
  Trash2,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ShareDialogProps {
  noteId: string;
  workspace: string;
  onClose: () => void;
}

interface ShareData {
  note: {
    id: string;
    title: string;
    slug: string;
    publicAccess: 'PRIVATE' | 'READONLY' | 'COMMENT' | 'EDIT';
    shareToken: string | null;
    publicUrl: string | null;
  };
  shares: Array<{
    id: string;
    permission: 'VIEW' | 'COMMENT' | 'EDIT';
    email: string | null;
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    } | null;
    invitedBy: {
      id: string;
      name: string | null;
    };
    createdAt: string;
    acceptedAt: string | null;
  }>;
}

const accessLevels = [
  { value: 'PRIVATE', label: 'Private', icon: Lock, description: 'Only invited people can access' },
  { value: 'READONLY', label: 'Anyone with link', icon: Globe, description: 'Anyone with the link can view' },
  { value: 'COMMENT', label: 'Anyone can comment', icon: MessageSquare, description: 'Anyone with the link can comment' },
  { value: 'EDIT', label: 'Anyone can edit', icon: Edit3, description: 'Anyone with the link can edit' },
];

const permissions = [
  { value: 'VIEW', label: 'Can view', icon: Eye },
  { value: 'COMMENT', label: 'Can comment', icon: MessageSquare },
  { value: 'EDIT', label: 'Can edit', icon: Edit3 },
];

export function ShareDialog({ noteId, workspace, onClose }: ShareDialogProps) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [selectedPermission, setSelectedPermission] = useState<'VIEW' | 'COMMENT' | 'EDIT'>('VIEW');

  const { data, isLoading } = useQuery({
    queryKey: ['note-sharing', noteId],
    queryFn: async (): Promise<ShareData> => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/notes/${noteId}/sharing`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to load sharing settings');
      return response.json();
    },
  });

  const updatePublicAccess = useMutation({
    mutationFn: async (publicAccess: string) => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/notes/${noteId}/sharing/public`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ publicAccess }),
        }
      );
      if (!response.ok) throw new Error('Failed to update access');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note-sharing', noteId] });
      toast.success('Access updated');
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ email, permission }: { email: string; permission: string }) => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/notes/${noteId}/sharing/invite`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, permission }),
        }
      );
      if (!response.ok) throw new Error('Failed to invite');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note-sharing', noteId] });
      setEmailInput('');
      toast.success('Invitation sent');
    },
    onError: () => {
      toast.error('Failed to send invitation');
    },
  });

  const removeShareMutation = useMutation({
    mutationFn: async (shareId: string) => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/notes/${noteId}/sharing/${shareId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to remove share');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note-sharing', noteId] });
      toast.success('Access removed');
    },
  });

  const copyLink = () => {
    if (data?.note.publicUrl) {
      navigator.clipboard.writeText(data.note.publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Link copied');
    }
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) {
      inviteMutation.mutate({ email: emailInput.trim(), permission: selectedPermission });
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-linear-surface rounded-xl p-6 w-full max-w-lg">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-linear-elevated rounded w-1/3" />
            <div className="h-8 bg-linear-elevated rounded" />
            <div className="h-8 bg-linear-elevated rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-linear-surface rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-linear-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Share2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-linear-text">Share</h2>
              <p className="text-sm text-linear-text-secondary">{data?.note.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-linear-elevated rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-linear-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh]">
          {/* Public Access Selector */}
          <div className="p-4 space-y-3">
            <label className="text-sm font-medium text-linear-text-secondary">Who can access</label>
            <div className="space-y-2">
              {accessLevels.map((level) => {
                const Icon = level.icon;
                return (
                  <button
                    key={level.value}
                    onClick={() => updatePublicAccess.mutate(level.value)}
                    disabled={updatePublicAccess.isPending}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-all ${
                      data?.note.publicAccess === level.value
                        ? 'border-linear-accent bg-linear-accent/10'
                        : 'border-linear-border hover:border-linear-border-hover'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mt-0.5 ${
                      data?.note.publicAccess === level.value ? 'text-linear-accent' : 'text-linear-text-secondary'
                    }`} />
                    <div className="text-left">
                      <div className={`font-medium ${
                        data?.note.publicAccess === level.value ? 'text-linear-accent' : 'text-linear-text'
                      }`}>
                        {level.label}
                      </div>
                      <div className="text-sm text-linear-text-secondary">{level.description}</div>
                    </div>
                    {data?.note.publicAccess === level.value && (
                      <Check className="w-5 h-5 text-linear-accent ml-auto" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Share Link */}
          {data?.note.publicAccess !== 'PRIVATE' && data?.note.publicUrl && (
            <div className="px-4 pb-4">
              <label className="text-sm font-medium text-linear-text-secondary">Share link</label>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-linear-elevated/50 border border-linear-border rounded-lg">
                  <Link className="w-4 h-4 text-linear-text-tertiary" />
                  <input
                    type="text"
                    value={data.note.publicUrl}
                    readOnly
                    className="flex-1 bg-transparent text-sm text-linear-text-secondary outline-none"
                  />
                </div>
                <button
                  onClick={copyLink}
                  className="flex items-center gap-2 px-4 py-2 bg-linear-accent text-white rounded-lg hover:bg-linear-accent/80 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Invite People */}
          <div className="border-t border-linear-border p-4">
            <label className="text-sm font-medium text-linear-text-secondary">Invite people</label>
            <form onSubmit={handleInvite} className="mt-2 space-y-2">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-linear-text-tertiary" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Enter email address..."
                    className="w-full pl-10 pr-4 py-2 border border-linear-border rounded-lg focus:outline-none focus:ring-2 focus:ring-linear-accent/40"
                  />
                </div>
                <select
                  value={selectedPermission}
                  onChange={(e) => setSelectedPermission(e.target.value as any)}
                  className="px-3 py-2 border border-linear-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-linear-accent/40"
                >
                  {permissions.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={!emailInput.trim() || inviteMutation.isPending}
                  className="px-4 py-2 bg-linear-accent text-white rounded-lg hover:bg-linear-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Shared With List */}
            {data?.shares && data.shares.length > 0 && (
              <div className="mt-4 space-y-2">
                <label className="text-sm font-medium text-linear-text-secondary">
                  Shared with {data.shares.length} people
                </label>
                <div className="space-y-1">
                  {data.shares.map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between p-2 hover:bg-linear-elevated/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-linear-elevated rounded-full flex items-center justify-center">
                          {share.user?.image ? (
                            <img
                              src={share.user.image}
                              alt={share.user.name || ''}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <span className="text-sm font-medium">
                              {(share.user?.name?.[0] || share.email?.[0] || '?').toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-linear-text">
                            {share.user?.name || share.email}
                          </div>
                          <div className="text-xs text-linear-text-secondary">
                            {permissions.find(p => p.value === share.permission)?.label}
                            {!share.user && <span className="ml-2">(pending)</span>}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeShareMutation.mutate(share.id)}
                        disabled={removeShareMutation.isPending}
                        className="p-2 hover:bg-red-100 rounded-lg text-linear-text-tertiary hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
