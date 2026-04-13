import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { API_URL } from '~/lib/api';
import { AnimatedList, AnimatedItem, AnimatedCard } from '@flowpigdev/ui';
import { 
  Users, 
  Plus, 
  Settings,
  Mail,
  Shield,
  UserMinus,
  X,
  Check
} from 'lucide-react';

interface TeamMember {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  role?: string;
}

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

export default function TeamRoute() {
  const { workspace } = useParams();
  const queryClient = useQueryClient();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');

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
      return response.json();
    },
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
      return response.json();
    },
    onSuccess: () => {
      setShowInviteModal(false);
      setInviteEmail('');
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspace] });
    },
  });

  const members: WorkspaceMember[] = membersData?.members || [];
  const teams = teamsData?.teams || [];

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
        <button 
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 bg-linear-accent hover:bg-linear-accent/80 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Invite member
        </button>
      </div>

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
