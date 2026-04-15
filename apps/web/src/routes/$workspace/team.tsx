import { useState } from 'react';
import { useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { API_URL } from '~/lib/api';
import { useAuth } from '~/lib/auth-client';
import { AnimatedList, AnimatedItem, AnimatedCard } from '@flowpigdev/ui';
import { 
  Users, 
  Plus, 
  Mail,
  Shield,
  Copy,
  Loader2,
  Trash2,
  X,
  Check,
} from 'lucide-react';

interface WorkspaceMember {
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

interface PendingInvitation {
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

export default function TeamRoute() {
  const { workspace } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const { data: membersData, isLoading } = useQuery({
    queryKey: ['workspace-members', workspace],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/members`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to load members');
      return response.json();
    },
  });

  const { data: teamsData } = useQuery({
    queryKey: ['teams', workspace],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/teams`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to load teams');
      const payload = await response.json() as { teams: any[] };
      return payload.teams;
    },
  });

  const canManageInvites = (membersData?.members as WorkspaceMember[] | undefined)?.some(
    (member) => member.userId === user?.id && ['OWNER', 'ADMIN'].includes(member.role)
  ) ?? false;

  const { data: invitationsData, isLoading: isInvitationsLoading } = useQuery({
    queryKey: ['workspace-invitations', workspace],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/invitations`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load invitations');
      }

      return response.json() as Promise<{ invitations: PendingInvitation[] }>;
    },
    enabled: !!workspace && canManageInvites,
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/invitations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, role }),
        }
      );
      if (!response.ok) throw new Error('Failed to send invitation');
      return response.json() as Promise<{
        status: 'member-added' | 'invitation-created';
        message?: string;
        invitation?: {
          acceptUrl?: string;
        };
      }>;
    },
    onSuccess: (result) => {
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('MEMBER');
      setInviteLink(result.invitation?.acceptUrl ?? null);
      setInviteMessage(
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
      setInviteMessage(result.message || 'Invitation revoked.');
      queryClient.invalidateQueries({ queryKey: ['workspace-invitations', workspace] });
    },
  });

  const members: WorkspaceMember[] = membersData?.members || [];
  const teams = teamsData || [];
  const invitations = invitationsData?.invitations || [];

  function copyInviteLink(acceptUrl: string) {
    void navigator.clipboard.writeText(acceptUrl);
    setInviteLink(acceptUrl);
    setInviteMessage('Invite link copied.');
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'OWNER':
        return <Shield className="w-4 h-4 text-yellow-500" />;
      case 'ADMIN':
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <Users className="w-4 h-4 text-linear-text-tertiary" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-amber-500/10 text-amber-300';
      case 'ADMIN':
        return 'bg-sky-500/10 text-sky-300';
      case 'GUEST':
        return 'bg-linear-elevated text-linear-text-secondary';
      default:
        return 'bg-linear-elevated text-linear-text-secondary';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-linear-text">Team</h1>
          <p className="text-linear-text-secondary mt-1">
            {members.length} member{members.length !== 1 ? 's' : ''} in this workspace
          </p>
        </div>
        {canManageInvites && (
          <button 
            onClick={() => {
              setInviteMessage(null);
              setInviteLink(null);
              setShowInviteModal(true);
            }}
            className="flex items-center gap-2 bg-linear-accent hover:bg-linear-accent/80 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Invite member
          </button>
        )}
      </div>

      {inviteMessage && (
        <div className="mb-6 rounded-lg border border-linear-accent/30 bg-linear-accent-light px-4 py-3 text-sm text-linear-text">
          <div>{inviteMessage}</div>
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

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-linear-surface p-4 rounded-xl border border-linear-border">
          <div className="text-3xl font-bold text-linear-text">
            {members.filter(m => m.role === 'OWNER' || m.role === 'ADMIN').length}
          </div>
          <div className="text-sm text-linear-text-secondary">Admins</div>
        </div>
        <div className="bg-linear-surface p-4 rounded-xl border border-linear-border">
          <div className="text-3xl font-bold text-linear-text">
            {members.filter(m => m.role === 'MEMBER').length}
          </div>
          <div className="text-sm text-linear-text-secondary">Members</div>
        </div>
        <div className="bg-linear-surface p-4 rounded-xl border border-linear-border">
          <div className="text-3xl font-bold text-linear-text">
            {members.filter(m => m.role === 'GUEST').length}
          </div>
          <div className="text-sm text-linear-text-secondary">Guests</div>
        </div>
        <div className="bg-linear-surface p-4 rounded-xl border border-linear-border">
          <div className="text-3xl font-bold text-linear-text">{teams.length}</div>
          <div className="text-sm text-linear-text-secondary">Teams</div>
        </div>
      </div>

      {canManageInvites && (
        <div className="bg-linear-surface rounded-xl border border-linear-border overflow-hidden mb-8">
          <div className="flex items-center justify-between p-4 border-b border-linear-border bg-linear-elevated/40">
            <div>
              <h2 className="font-semibold text-linear-text">Pending Invitations</h2>
              <p className="mt-1 text-sm text-linear-text-secondary">
                Track open invites, copy access links, and revoke stale requests.
              </p>
            </div>
            <div className="text-sm text-linear-text-tertiary">
              {invitations.length} pending
            </div>
          </div>

          <div className="p-4">
            {isInvitationsLoading ? (
              <div className="flex items-center gap-2 text-sm text-linear-text-secondary">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading invitations...
              </div>
            ) : invitations.length === 0 ? (
              <div className="rounded-lg border border-dashed border-linear-border bg-linear-elevated/30 px-4 py-5 text-sm text-linear-text-secondary">
                No pending invites right now.
              </div>
            ) : (
              <div className="space-y-3">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex flex-col gap-3 rounded-xl border border-linear-border bg-linear-elevated/30 px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-linear-text">
                        <Mail className="w-4 h-4 text-linear-accent" />
                        {invitation.email}
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${getRoleBadgeColor(invitation.role)}`}>
                          {invitation.role}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-linear-text-secondary">
                        Invited by {invitation.invitedBy.name || invitation.invitedBy.email} · Expires{' '}
                        {new Date(invitation.expiresAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyInviteLink(invitation.acceptUrl)}
                        className="inline-flex items-center gap-2 rounded-lg border border-linear-border px-3 py-2 text-sm text-linear-text-secondary transition-colors hover:bg-linear-surface hover:text-linear-text"
                      >
                        <Copy className="w-4 h-4" />
                        Copy link
                      </button>
                      <button
                        type="button"
                        onClick={() => revokeInvitationMutation.mutate(invitation.id)}
                        disabled={revokeInvitationMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-lg border border-linear-error/30 px-3 py-2 text-sm text-linear-error transition-colors hover:bg-linear-error/10 disabled:opacity-60"
                      >
                        {revokeInvitationMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Members List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-linear-accent/30 border-t-linear-accent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-linear-surface rounded-xl border border-linear-border overflow-hidden">
          <div className="p-4 border-b border-linear-border bg-linear-elevated/40">
            <h2 className="font-semibold text-linear-text">Workspace Members</h2>
          </div>
          <AnimatedList>
            {members.map((member) => (
              <AnimatedItem key={member.id}>
                <div className="flex items-center justify-between p-4 border-b border-linear-border hover:bg-linear-elevated transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-linear-elevated rounded-full flex items-center justify-center border border-linear-border">
                      {member.user.image ? (
                        <img 
                          src={member.user.image} 
                          alt={member.user.name || ''}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <span className="text-lg font-medium text-linear-text">
                          {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                          <span className="font-medium text-linear-text">
                          {member.user.name || member.user.email}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                          {member.role}
                        </span>
                      </div>
                      <div className="text-sm text-linear-text-secondary">
                        {member.user.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-linear-text-tertiary">
                      Joined {new Date(member.joinedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </AnimatedItem>
            ))}
          </AnimatedList>
        </div>
      )}

      {/* Teams Section */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-linear-text mb-4">Teams</h2>
        <AnimatedList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team: any) => (
            <AnimatedItem key={team.id}>
              <AnimatedCard className="bg-linear-surface p-4 rounded-xl border border-linear-border hover:border-linear-border-hover transition-colors">
                <div className="flex items-start gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: team.color }}
                  >
                    {team.key}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-linear-text">{team.name}</h3>
                    <p className="text-sm text-linear-text-secondary">{team.issueCount} issues</p>
                    <p className="text-sm text-linear-text-secondary">{team.members?.length || 0} members</p>
                  </div>
                </div>
              </AnimatedCard>
            </AnimatedItem>
          ))}
        </AnimatedList>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-linear-surface rounded-xl p-6 w-full max-w-md border border-linear-border shadow-2xl shadow-black/30"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-linear-text">Invite Member</h2>
              <button onClick={() => setShowInviteModal(false)}>
                <X className="w-5 h-5 text-linear-text-tertiary" />
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
            }}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-linear-text-secondary mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-linear-elevated border border-linear-border rounded-lg text-linear-text placeholder:text-linear-text-tertiary focus:ring-2 focus:ring-linear-accent/40 focus:outline-none"
                  placeholder="colleague@company.com"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-linear-text-secondary mb-2">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 bg-linear-elevated border border-linear-border rounded-lg text-linear-text focus:ring-2 focus:ring-linear-accent/40 focus:outline-none"
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                  <option value="GUEST">Guest</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-linear-text-secondary hover:bg-linear-elevated rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  className="px-4 py-2 bg-linear-accent text-white rounded-lg hover:bg-linear-accent/80 transition-colors disabled:opacity-50"
                >
                  {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
