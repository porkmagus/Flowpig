import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Settings,
  Users, 
  Palette, 
  Bell,
  Shield,
  Key,
  Webhook,
  Database,
  Save,
  Check,
  Loader2,
  Trash2,
  Moon,
  Sun,
  Monitor,
  Link,
  ChevronRight,
  Plus,
  X,
  CreditCard,
  Zap,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
  Copy,
} from 'lucide-react';
import { API_URL } from '~/lib/api';
import { useAuth } from '~/lib/auth-client';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { Skeleton, SkeletonText, SkeletonCard } from '~/components/ui/skeleton';
import { Input } from '~/components/ui/input';
import { Select } from '~/components/ui/select';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { FadeIn } from '~/components/ui/motion';

interface WorkspaceSettings {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  icon: string | null;
  ownerId: string;
  settings: {
    defaultIssueState?: string;
    allowGuests?: boolean;
    requireApproval?: boolean;
    appearance?: {
      theme?: 'light' | 'dark' | 'system';
    };
    notifications?: {
      emailEnabled?: boolean;
      desktopEnabled?: boolean;
      issueAssigned?: boolean;
      issueMentioned?: boolean;
      issueCommented?: boolean;
      cycleUpdates?: boolean;
      weeklyDigest?: boolean;
    };
  };
}

interface WorkspaceMemberRecord {
  id: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface PendingInvitationRecord {
  id: string;
  email: string;
  role: 'ADMIN' | 'MEMBER' | 'GUEST';
  status: 'PENDING';
  createdAt: string;
  expiresAt: string;
  acceptUrl: string;
  invitedBy: {
    id: string;
    name: string | null;
    email: string;
  };
}

export default function SettingsPage() {
  const { workspace } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['workspace-settings', workspace],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to load workspace');
      return response.json() as Promise<{ workspace: WorkspaceSettings }>;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<WorkspaceSettings>) => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updates),
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || payload?.error || 'Failed to update workspace');
      return payload as { workspace: WorkspaceSettings };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-settings'] });
      setFeedback({ type: 'success', message: 'Workspace settings saved.' });
      if (variables.slug && result.workspace.slug !== workspace) {
        navigate(`/${result.workspace.slug}/settings`, { replace: true });
      }
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: error.message });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/export`, {
        credentials: 'include',
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'Failed to export workspace');
      }

      const blob = await response.blob();
      const header = response.headers.get('Content-Disposition') || '';
      const match = header.match(/filename="([^"]+)"/i);
      const filename = match?.[1] || `${workspace}-export.json`;
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = filename;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Workspace export downloaded.' });
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (confirmation: string) => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirmation }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'Failed to delete workspace');
      }
    },
    onSuccess: () => {
      if (typeof window !== 'undefined') {
        const lastWorkspace = window.localStorage.getItem('flowpig:last-workspace');
        if (lastWorkspace === workspace) {
          window.localStorage.removeItem('flowpig:last-workspace');
        }
      }
      navigate('/onboarding', { replace: true });
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: error.message });
    },
  });

  const workspaceData: WorkspaceSettings | undefined = data?.workspace;
  const canDeleteWorkspace = !!workspaceData && user?.id === workspaceData.ownerId;

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'integrations', label: 'Integrations', icon: Key },
    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
    { id: 'data', label: 'Data', icon: Database },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ];

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <FadeIn>
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-linear-text tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-linear-accent" />
            Settings
          </h1>
          <p className="text-sm text-linear-text-secondary mt-0.5">
            Manage your workspace configuration
          </p>
          {feedback && (
            <div className={cn(
              'mt-4 rounded-lg px-3 py-2 text-sm',
              feedback.type === 'success'
                ? 'border border-linear-accent/30 bg-linear-accent-light text-linear-text'
                : 'border border-linear-error/30 bg-linear-error/10 text-linear-error'
            )}>
              {feedback.message}
            </div>
          )}
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <FadeIn delay={0.05}>
          <div className="space-y-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
                  activeTab === tab.id
                    ? "bg-linear-accent-light text-linear-accent"
                    : "text-linear-text-secondary hover:bg-linear-surface hover:text-linear-text"
                )}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </FadeIn>

        {/* Content */}
        <div className="md:col-span-3">
          <FadeIn key={activeTab} delay={0.1}>
            {activeTab === 'general' && workspaceData && (
              <GeneralSettings 
                workspace={workspaceData} 
                onUpdate={(updates) => updateMutation.mutate(updates)}
                isUpdating={updateMutation.isPending}
              />
            )}
            {activeTab === 'members' && (
              <MemberSettings workspace={workspace} />
            )}
            {activeTab === 'appearance' && workspaceData && (
              <AppearanceSettings 
                workspace={workspaceData}
                onUpdate={(updates) => updateMutation.mutate(updates)}
                isUpdating={updateMutation.isPending}
              />
            )}
            {activeTab === 'notifications' && workspaceData && (
              <NotificationSettings
                workspace={workspaceData}
                onUpdate={(updates) => updateMutation.mutate(updates)}
                isUpdating={updateMutation.isPending}
              />
            )}
            {activeTab === 'integrations' && (
              <IntegrationSettings />
            )}
            {activeTab === 'data' && workspaceData && (
              <DataSettings
                workspace={workspaceData}
                canDelete={canDeleteWorkspace}
                onExport={() => exportMutation.mutate()}
                isExporting={exportMutation.isPending}
                onDelete={(confirmation) => deleteMutation.mutate(confirmation)}
                isDeleting={deleteMutation.isPending}
              />
            )}
            {activeTab === 'billing' && (
              <BillingSettings workspaceId={workspace || ''} />
            )}
            {['security', 'webhooks'].includes(activeTab) && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-linear-text-secondary">Coming soon</p>
                </CardContent>
              </Card>
            )}
          </FadeIn>
        </div>
      </div>
    </div>
  );
}

function GeneralSettings({ 
  workspace, 
  onUpdate,
  isUpdating 
}: { 
  workspace: WorkspaceSettings;
  onUpdate: (updates: Partial<WorkspaceSettings>) => void;
  isUpdating: boolean;
}) {
  const [name, setName] = useState(workspace.name);
  const [slug, setSlug] = useState(workspace.slug);
  const [description, setDescription] = useState(workspace.description || '');

  useEffect(() => {
    setName(workspace.name);
    setSlug(workspace.slug);
    setDescription(workspace.description || '');
  }, [workspace]);

  const isDirty = name !== workspace.name || slug !== workspace.slug || description !== (workspace.description || '');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">General Settings</CardTitle>
        <CardDescription>
          Configure your workspace name, URL, and public information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-linear-text mb-1.5">
            Workspace Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Workspace"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-linear-text mb-1.5">
            URL Slug
          </label>
          <div className="flex items-center gap-2 px-3 py-2 bg-linear-surface border border-linear-border rounded-lg">
            <span className="text-sm text-linear-text-secondary">flowpig.app/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="flex-1 bg-transparent text-sm text-linear-text focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-linear-text mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-linear-surface border border-linear-border rounded-lg text-sm text-linear-text focus:outline-none focus:ring-2 focus:ring-linear-accent resize-none"
            placeholder="What does this workspace do?"
          />
        </div>

        <div className="pt-2">
          <Button 
            onClick={() => onUpdate({ name: name.trim(), slug: slug.trim(), description: description.trim() || '' })}
            disabled={isUpdating || !name.trim() || !slug.trim() || !isDirty}
            className="gap-1.5"
          >
            {isUpdating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MemberSettings({ workspace }: { workspace?: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'GUEST'>('MEMBER');
  const [message, setMessage] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['workspace-members', workspace],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/members`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to load members');
      const payload = await response.json() as { members: WorkspaceMemberRecord[] };
      return payload.members || [];
    },
    enabled: !!workspace,
  });

  const members = data || [];
  const canManageInvites = members.some(
    (member) => member.userId === user?.id && ['OWNER', 'ADMIN'].includes(member.role)
  );

  const { data: invitationData, isLoading: isInvitationsLoading } = useQuery({
    queryKey: ['workspace-invitations', workspace],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/invitations`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to load invitations');
      return response.json() as Promise<{ invitations: PendingInvitationRecord[] }>;
    },
    enabled: !!workspace && canManageInvites,
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.message || json.error || 'Failed to send invitation');
      }

      return json as {
        status: 'member-added' | 'invitation-created';
        message?: string;
        invitation?: {
          acceptUrl?: string;
        };
      };
    },
    onSuccess: (result) => {
      setInviteEmail('');
      setInviteRole('MEMBER');
      setInviteLink(result.invitation?.acceptUrl ?? null);
      setMessage(
        result.status === 'member-added'
          ? 'Member added to the workspace.'
          : result.message || 'Invitation created.'
      );
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspace] });
      queryClient.invalidateQueries({ queryKey: ['workspace-invitations', workspace] });
    },
  });

  const revokeInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/invitations/${invitationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.message || json.error || 'Failed to revoke invitation');
      }

      return json as { message?: string };
    },
    onSuccess: (result) => {
      setInviteLink(null);
      setMessage(result.message || 'Invitation revoked.');
      queryClient.invalidateQueries({ queryKey: ['workspace-invitations', workspace] });
    },
  });

  const invitations = invitationData?.invitations || [];

  function copyInviteLink(acceptUrl: string) {
    void navigator.clipboard.writeText(acceptUrl);
    setInviteLink(acceptUrl);
    setMessage('Invite link copied.');
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Member Settings</CardTitle>
          <CardDescription>
            Manage workspace access, invite teammates, and verify current membership.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <div className="rounded-md border border-linear-accent/30 bg-linear-accent-light px-3 py-2 text-sm text-linear-text">
              {message}
              {inviteLink && (
                <div className="mt-2 text-xs text-linear-text-secondary">
                  Share this invite link until email delivery is wired up:{' '}
                  <a
                    href={inviteLink}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-linear-accent hover:text-linear-accent-hover"
                  >
                    {inviteLink}
                  </a>
                </div>
              )}
            </div>
          )}

          {canManageInvites ? (
            <>
              <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
                <Input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  type="email"
                />
                <Select
                  value={inviteRole}
                  onChange={(v) => setInviteRole(v as 'ADMIN' | 'MEMBER' | 'GUEST')}
                  options={[
                    { value: 'MEMBER', label: 'Member' },
                    { value: 'ADMIN', label: 'Admin' },
                    { value: 'GUEST', label: 'Guest' },
                  ]}
                />
                <Button
                  onClick={() => {
                    setMessage(null);
                    setInviteLink(null);
                    inviteMutation.mutate();
                  }}
                  disabled={inviteMutation.isPending || !inviteEmail.trim()}
                  className="gap-1.5"
                >
                  {inviteMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  Invite
                </Button>
              </div>

              {inviteMutation.error && (
                <div className="rounded-md border border-linear-error/30 bg-linear-error/10 px-3 py-2 text-sm text-linear-error">
                  {inviteMutation.error.message}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-md border border-linear-border bg-linear-surface px-3 py-3 text-sm text-linear-text-secondary">
              Only workspace owners and admins can manage invitations.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Members</CardTitle>
          <CardDescription>
            {members.length} member{members.length === 1 ? '' : 's'} currently have access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-linear-text-secondary">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading members...
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border border-linear-border bg-linear-surface px-3 py-3"
                >
                  <div>
                    <div className="font-medium text-sm text-linear-text">
                      {member.user.name || member.user.email}
                    </div>
                    <div className="text-xs text-linear-text-secondary">
                      {member.user.email}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-linear-text-secondary">
                    <Badge variant="outline">{member.role}</Badge>
                    <span>Joined {new Date(member.joinedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {canManageInvites && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Invitations</CardTitle>
            <CardDescription>
              Review open invites, copy links, and revoke requests that should no longer stay active.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isInvitationsLoading ? (
              <div className="flex items-center gap-2 text-sm text-linear-text-secondary">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading invitations...
              </div>
            ) : invitations.length === 0 ? (
              <div className="rounded-lg border border-dashed border-linear-border bg-linear-surface px-3 py-4 text-sm text-linear-text-secondary">
                No pending invitations.
              </div>
            ) : (
              <div className="space-y-2">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex flex-col gap-3 rounded-lg border border-linear-border bg-linear-surface px-3 py-3 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-linear-text">
                        {invitation.email}
                        <Badge variant="outline">{invitation.role}</Badge>
                      </div>
                      <div className="mt-1 text-xs text-linear-text-secondary">
                        Invited by {invitation.invitedBy.name || invitation.invitedBy.email} · Expires{' '}
                        {new Date(invitation.expiresAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyInviteLink(invitation.acceptUrl)}
                        className="gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy link
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => revokeInvitationMutation.mutate(invitation.id)}
                        disabled={revokeInvitationMutation.isPending}
                        className="gap-1.5 border-linear-error/30 text-linear-error hover:bg-linear-error/10 hover:text-linear-error"
                      >
                        {revokeInvitationMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        Revoke
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function applyThemeToDom(theme: 'light' | 'dark' | 'system') {
  if (theme === 'light') {
    document.documentElement.classList.add('light');
  } else if (theme === 'dark') {
    document.documentElement.classList.remove('light');
  } else if (theme === 'system') {
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    document.documentElement.classList.toggle('light', prefersLight);
  }
  localStorage.setItem('flowpig:theme', theme);
}

function AppearanceSettings({ 
  workspace,
  onUpdate,
  isUpdating
}: { 
  workspace: WorkspaceSettings;
  onUpdate: (updates: Partial<WorkspaceSettings>) => void;
  isUpdating: boolean;
}) {
  const colors = [
    '#5E6AD2', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', 
    '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'
  ];

  const currentColor = workspace.color || '#5E6AD2';
  const currentTheme = workspace.settings?.appearance?.theme || 'system';

  const [selectedColor, setSelectedColor] = useState(currentColor);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(currentTheme);

  useEffect(() => {
    setSelectedColor(workspace.color || '#5E6AD2');
    setTheme(workspace.settings?.appearance?.theme || 'system');
  }, [workspace]);

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    if (color !== currentColor) {
      onUpdate({ color });
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    applyThemeToDom(newTheme);
    if (newTheme !== currentTheme) {
      onUpdate({ settings: { appearance: { theme: newTheme } } });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workspace Color</CardTitle>
          <CardDescription>
            Choose a color that represents your workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => handleColorChange(color)}
                disabled={isUpdating}
                className={cn(
                  "w-10 h-10 rounded-lg transition-all disabled:opacity-50",
                  selectedColor === color && "ring-2 ring-offset-2 ring-linear-accent scale-110"
                )}
                style={{ backgroundColor: color }}
              >
                {selectedColor === color && <Check className="w-5 h-5 text-white mx-auto" />}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Theme</CardTitle>
          <CardDescription>
            Choose your preferred appearance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleThemeChange('light')}
              disabled={isUpdating}
              className={cn(
                "p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all disabled:opacity-50",
                theme === 'light' 
                  ? "border-linear-accent bg-linear-accent-light" 
                  : "border-linear-border hover:border-linear-border-hover"
              )}
            >
              <Sun className="w-5 h-5 text-linear-accent" />
              <span className="text-sm font-medium">Light</span>
            </button>
            <button
              onClick={() => handleThemeChange('dark')}
              disabled={isUpdating}
              className={cn(
                "p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all disabled:opacity-50",
                theme === 'dark' 
                  ? "border-linear-accent bg-linear-accent-light" 
                  : "border-linear-border hover:border-linear-border-hover"
              )}
            >
              <Moon className="w-5 h-5 text-linear-accent" />
              <span className="text-sm font-medium">Dark</span>
            </button>
            <button
              onClick={() => handleThemeChange('system')}
              disabled={isUpdating}
              className={cn(
                "p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all disabled:opacity-50",
                theme === 'system' 
                  ? "border-linear-accent bg-linear-accent-light" 
                  : "border-linear-border hover:border-linear-border-hover"
              )}
            >
              <Monitor className="w-5 h-5 text-linear-accent" />
              <span className="text-sm font-medium">System</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationSettings({
  workspace,
  onUpdate,
  isUpdating,
}: {
  workspace: WorkspaceSettings;
  onUpdate: (updates: Partial<WorkspaceSettings>) => void;
  isUpdating: boolean;
}) {
  const defaults = {
    emailEnabled: workspace.settings.notifications?.emailEnabled ?? true,
    desktopEnabled: workspace.settings.notifications?.desktopEnabled ?? true,
    issueAssigned: workspace.settings.notifications?.issueAssigned ?? true,
    issueMentioned: workspace.settings.notifications?.issueMentioned ?? true,
    issueCommented: workspace.settings.notifications?.issueCommented ?? true,
    cycleUpdates: workspace.settings.notifications?.cycleUpdates ?? false,
    weeklyDigest: workspace.settings.notifications?.weeklyDigest ?? true,
  };

  const [preferences, setPreferences] = useState(defaults);

  useEffect(() => {
    setPreferences(defaults);
  }, [workspace]);

  const isDirty = JSON.stringify(preferences) !== JSON.stringify(defaults);

  const togglePreference = (key: keyof typeof preferences) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notification Preferences</CardTitle>
        <CardDescription>
          Choose what you want to be notified about
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          {[
            { key: 'emailEnabled', label: 'Email delivery', desc: 'Send email when notifications are enabled.' },
            { key: 'desktopEnabled', label: 'Desktop alerts', desc: 'Show browser notifications for active workspace events.' },
          ].map((pref) => (
            <button
              key={pref.key}
              onClick={() => togglePreference(pref.key as keyof typeof preferences)}
              className={cn(
                'rounded-lg border p-3 text-left transition-colors',
                preferences[pref.key as keyof typeof preferences]
                  ? 'border-linear-accent/30 bg-linear-accent-light'
                  : 'border-linear-border bg-linear-surface hover:border-linear-border-hover'
              )}
            >
              <div className="text-sm font-medium text-linear-text">{pref.label}</div>
              <div className="mt-1 text-xs text-linear-text-secondary">{pref.desc}</div>
            </button>
          ))}
        </div>

        {[
          { id: 'issueAssigned', label: 'Issue Assigned', desc: 'When someone assigns you an issue' },
          { id: 'issueMentioned', label: 'Mentioned', desc: 'When someone mentions you in a comment' },
          { id: 'issueCommented', label: 'New Comments', desc: 'When someone comments on an issue you follow' },
          { id: 'cycleUpdates', label: 'Cycle Updates', desc: 'Updates about active sprint cycles' },
          { id: 'weeklyDigest', label: 'Weekly Digest', desc: 'Weekly summary of your workspace activity' },
        ].map((pref) => (
          <div key={pref.id} className="flex items-center justify-between p-3 bg-linear-surface rounded-lg">
            <div>
              <h3 className="font-medium text-linear-text text-sm">{pref.label}</h3>
              <p className="text-xs text-linear-text-secondary">{pref.desc}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={preferences[pref.id as keyof typeof preferences]}
                onChange={() => togglePreference(pref.id as keyof typeof preferences)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-linear-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-linear-surface after:border-linear-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-linear-accent"></div>
            </label>
          </div>
        ))}
        <div>
          <Button
            onClick={() => onUpdate({ settings: { notifications: preferences } })}
            disabled={isUpdating || !isDirty}
            className="gap-1.5"
          >
            {isUpdating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function IntegrationSettings() {
  const integrations = [
    { name: 'GitHub', icon: Link, description: 'Sync issues with GitHub repositories', connected: true, color: '#24292e' },
    { name: 'Slack', icon: Bell, description: 'Get notifications in Slack channels', connected: false, color: '#4A154B' },
    { name: 'Figma', icon: Palette, description: 'Embed Figma designs in issues', connected: false, color: '#F24E1E' },
    { name: 'GitLab', icon: Link, description: 'Sync issues with GitLab projects', connected: false, color: '#FC6D26' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Integrations</CardTitle>
        <CardDescription>
          Connect third-party services to your workspace
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {integrations.map((integration) => (
          <div 
            key={integration.name} 
            className="flex items-center gap-3 p-3 bg-linear-surface rounded-lg"
          >
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: integration.color }}
            >
              <integration.icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-linear-text text-sm">{integration.name}</h3>
              <p className="text-xs text-linear-text-secondary">{integration.description}</p>
            </div>
            <Button
              variant={integration.connected ? "outline" : "default"}
              size="sm"
            >
              {integration.connected ? 'Manage' : 'Connect'}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function DataSettings({
  workspace,
  canDelete,
  onExport,
  isExporting,
  onDelete,
  isDeleting,
}: {
  workspace: WorkspaceSettings;
  canDelete: boolean;
  onExport: () => void;
  isExporting: boolean;
  onDelete: (confirmation: string) => void;
  isDeleting: boolean;
}) {
  const [confirmation, setConfirmation] = useState('');

  useEffect(() => {
    setConfirmation('');
  }, [workspace.id]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Management</CardTitle>
          <CardDescription>
            Export or import your workspace data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-linear-surface rounded-lg">
            <div>
              <h3 className="font-medium text-linear-text text-sm">Export Data</h3>
              <p className="text-xs text-linear-text-secondary">Download all your workspace data in JSON format</p>
            </div>
            <Button variant="outline" size="sm" onClick={onExport} disabled={isExporting}>
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Export JSON'}
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 bg-linear-surface rounded-lg">
            <div>
              <h3 className="font-medium text-linear-text text-sm">Import Data</h3>
              <p className="text-xs text-linear-text-secondary">Import from Linear, Jira, GitHub Issues, or CSV</p>
            </div>
            <Button variant="outline" size="sm" disabled>Coming soon</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-priority-urgent/30">
        <CardHeader>
          <CardTitle className="text-base text-priority-urgent">Danger Zone</CardTitle>
          <CardDescription>
            Destructive actions that cannot be undone
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 rounded-lg bg-priority-urgent/5 p-3">
            <div>
              <h3 className="font-medium text-priority-urgent text-sm">Delete workspace</h3>
              <p className="text-xs text-priority-urgent/70">
                Permanently delete this workspace and all its data. Type <span className="font-semibold">{workspace.slug}</span> to confirm.
              </p>
            </div>
            <Input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={`Type ${workspace.slug}`}
              disabled={!canDelete || isDeleting}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-priority-urgent/70">
                {canDelete ? 'Only the workspace owner can delete this workspace.' : 'You must be the workspace owner to delete this workspace.'}
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(confirmation)}
                disabled={!canDelete || isDeleting || confirmation.trim() !== workspace.slug}
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const PLANS = [
  {
    id: 'FREE',
    name: 'Free',
    price: '$0',
    interval: 'forever',
    description: 'For individuals and small teams getting started.',
    features: ['Up to 5 members', '500 issues', '1 GB storage', '50 AI requests/month', 'Core features'],
    cta: null,
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: '$12',
    interval: '/seat/month',
    description: 'For growing teams that need more power and fewer limits.',
    features: ['Up to 25 members', '10,000 issues', '20 GB storage', '500 AI requests/month', 'Advanced analytics', 'Priority support'],
    cta: 'Upgrade to Pro',
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: 'Custom',
    interval: '',
    description: 'For large teams with custom needs.',
    features: ['Unlimited members', 'Unlimited issues', 'Unlimited storage', 'Unlimited AI', 'SSO/SAML', 'Dedicated support', 'Custom contracts'],
    cta: 'Contact Sales',
  },
];

function BillingSettings({ workspaceId }: { workspaceId: string }) {
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['billing', workspaceId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/workspaces/${workspaceId}/billing`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load billing');
      return res.json();
    },
  });

  async function handleUpgrade(plan: string) {
    setIsUpgrading(plan);
    try {
      const res = await fetch(`${API_URL}/workspaces/${workspaceId}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan, interval: 'monthly' }),
      });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      } else {
        // Stripe not configured — show message
        alert(json.message || 'Billing not configured on this server.');
      }
    } catch {
      alert('Could not start checkout. Please try again.');
    } finally {
      setIsUpgrading(null);
    }
  }

  async function handleManageBilling() {
    try {
      const res = await fetch(`${API_URL}/workspaces/${workspaceId}/billing/portal`, {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
    } catch {
      alert('Could not open billing portal.');
    }
  }

  const billing = data?.billing;
  const usage = data?.usage;
  const limits = data?.limits;
  const invoices: any[] = data?.invoices || [];
  const currentPlan = billing?.plan || 'FREE';
  const stripeConfigured = data?.stripeConfigured ?? false;

  return (
    <div className="space-y-6">
      {/* Current plan banner */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-linear-accent" />
                Current Plan
              </CardTitle>
              <CardDescription>
                {isLoading ? 'Loading...' : `You are on the ${currentPlan} plan`}
              </CardDescription>
            </div>
            {billing?.hasStripeSubscription && (
              <Button variant="outline" size="sm" onClick={handleManageBilling} className="gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" />
                Manage billing
              </Button>
            )}
          </div>
        </CardHeader>
        {usage && limits && (
          <CardContent className="space-y-3">
            {!stripeConfigured && (
              <div className="flex items-center gap-2 rounded-md border border-linear-warning/30 bg-linear-warning-light p-3 text-sm text-linear-warning">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Billing is not configured on this server yet. Add Stripe environment variables to enable upgrades.
              </div>
            )}
            {billing?.cancelAtPeriodEnd && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-linear-warning-light border border-linear-warning/30 text-sm text-linear-warning">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Your plan will cancel at the end of the billing period.
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Members', used: usage.members, max: limits.members },
                { label: 'Issues', used: usage.issues, max: limits.issues },
              ].map(({ label, used, max }) => (
                <div key={label} className="p-3 bg-linear-surface rounded-md">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-linear-text-secondary">{label}</span>
                    <span className="text-xs text-linear-text-tertiary">
                      {used}{max ? ` / ${max}` : ''}
                    </span>
                  </div>
                  {max && (
                    <div className="h-1 bg-linear-border rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          used / max > 0.9 ? "bg-linear-error" :
                          used / max > 0.7 ? "bg-linear-warning" : "bg-linear-accent"
                        )}
                        style={{ width: `${Math.min(100, (used / max) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {billing?.currentPeriodEnd && (
              <p className="text-xs text-linear-text-tertiary">
                Billing period ends {new Date(billing.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Plan comparison */}
      <div className="grid gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          return (
            <div
              key={plan.id}
              className={cn(
                "rounded-lg border p-5 flex flex-col gap-4 transition-all",
                isCurrent
                  ? "border-linear-accent bg-linear-accent-light"
                  : "border-linear-border bg-linear-surface hover:border-linear-border-hover"
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-linear-text">{plan.name}</h3>
                  {isCurrent && (
                    <Badge variant="accent" className="text-[10px]">Current</Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold text-linear-text">{plan.price}</span>
                  {plan.interval && (
                    <span className="text-xs text-linear-text-tertiary">{plan.interval}</span>
                  )}
                </div>
                <p className="mt-2 text-xs text-linear-text-secondary">{plan.description}</p>
              </div>

              <ul className="space-y-1.5 flex-1">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2 text-xs text-linear-text-secondary">
                    <CheckCircle2 className="w-3.5 h-3.5 text-linear-success shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>

              {plan.cta && !isCurrent && (
                <Button
                  size="sm"
                  disabled={!!isUpgrading || !stripeConfigured}
                  onClick={() => handleUpgrade(plan.id)}
                  className="w-full gap-1.5"
                >
                  {isUpgrading === plan.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  {plan.cta}
                </Button>
              )}
              {isCurrent && (
                <div className="text-xs text-center text-linear-accent font-medium py-1">
                  Active plan
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Invoice history */}
      {invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-linear-surface rounded-md text-sm">
                <div>
                  <span className="font-medium text-linear-text">
                    ${(inv.amount / 100).toFixed(2)} {inv.currency}
                  </span>
                  <span className="ml-3 text-linear-text-secondary">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={inv.status === 'PAID' ? 'success' : 'warning'} className="text-[10px]">
                    {inv.status}
                  </Badge>
                  {inv.pdfUrl && (
                    <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-linear-accent hover:text-linear-accent-hover">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
