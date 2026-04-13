import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '~/lib/api';
import { AnimatedPage } from '@flowpigdev/ui';
import {
  ChevronLeft,
  FolderKanban,
  Plus,
  Edit3,
  MoreHorizontal,
  Target,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  Layers,
  Flag,
  ArrowUpRight,
  X,
  Check,
  ChevronDown,
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  emoji: string | null;
  color: string | null;
  status: 'PLANNED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  startDate: string | null;
  targetDate: string | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
  leadId: string | null;
  lead: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  teamId: string | null;
  team: {
    id: string;
    name: string;
    key: string;
    color: string;
  } | null;
  initiatives: Initiative[];
  issues: Issue[];
}

interface Initiative {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  progress: number;
}

interface Issue {
  id: string;
  identifier: string;
  title: string;
  state: string;
  priority: string;
  assignee: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  'PLANNED': { label: 'Planned', color: 'text-linear-text-secondary', bg: 'bg-linear-elevated' },
  'IN_PROGRESS': { label: 'In Progress', color: 'text-blue-600', bg: 'bg-blue-100' },
  'PAUSED': { label: 'Paused', color: 'text-yellow-600', bg: 'bg-yellow-100' },
  'COMPLETED': { label: 'Completed', color: 'text-green-600', bg: 'bg-green-100' },
  'CANCELLED': { label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-100' },
};

export default function ProjectDetailRoute() {
  const { workspace, projectId } = useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'issues' | 'initiatives'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [showAddInitiative, setShowAddInitiative] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['project', workspace, projectId],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/projects/${projectId}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to load project');
      return response.json();
    },
  });

  const project: Project | undefined = data?.project;

  // Initialize edit state
  useMemo(() => {
    if (project) {
      setEditName(project.name);
      setEditDescription(project.description || '');
      setEditStatus(project.status);
    }
  }, [project]);

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Project>) => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/projects/${projectId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updates),
        }
      );
      if (!response.ok) throw new Error('Failed to update project');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', workspace, projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects', workspace] });
      setIsEditing(false);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-linear-accent/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold text-linear-text">Project not found</h2>
        <Link to={`/${workspace}/projects`} className="text-linear-accent hover:text-linear-accent mt-4 inline-block">
          Back to projects
        </Link>
      </div>
    );
  }

  const status = statusConfig[project.status];
  const completedIssues = project.issues?.filter((i) => i.state === 'DONE').length || 0;
  const totalIssues = project.issues?.length || 0;

  return (
    <AnimatedPage className="max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-linear-text-secondary mb-6">
        <Link to={`/${workspace}/projects`} className="hover:text-linear-text-secondary">
          Projects
        </Link>
        <ChevronLeft className="w-4 h-4 rotate-180" />
        <span className="text-linear-text font-medium">{project.name}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          {isEditing ? (
            <div className="flex-1 space-y-4">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-3xl font-bold border-b-2 border-linear-border focus:border-linear-accent outline-none bg-transparent w-full"
                placeholder="Project name"
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-3 py-2 border border-linear-border rounded-lg focus:ring-2 focus:ring-linear-accent/40 resize-none"
                rows={2}
                placeholder="Description (optional)"
              />
              <div className="flex items-center gap-2">
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="px-3 py-2 border border-linear-border rounded-lg text-sm"
                >
                  <option value="PLANNED">Planned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="PAUSED">Paused</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <button
                  onClick={() => updateMutation.mutate({
                    name: editName,
                    description: editDescription,
                    status: editStatus as any,
                  })}
                  disabled={updateMutation.isPending}
                  className="bg-linear-accent hover:bg-linear-accent/80 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditName(project.name);
                    setEditDescription(project.description || '');
                    setEditStatus(project.status);
                  }}
                  className="text-linear-text-secondary hover:text-linear-text px-4 py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-4">
                <span className="text-4xl">{project.emoji || '📁'}</span>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-linear-text">{project.name}</h1>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${status.bg} ${status.color}`}>
                      {status.label}
                    </span>
                    {project.team && (
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: project.team.color }}
                      >
                        {project.team.key}
                      </span>
                    )}
                  </div>
                  {project.description && (
                    <p className="text-linear-text-secondary max-w-2xl">{project.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-sm text-linear-text-secondary">
                    {project.startDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Started {new Date(project.startDate).toLocaleDateString()}
                      </span>
                    )}
                    {project.targetDate && (
                      <span className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        Target {new Date(project.targetDate).toLocaleDateString()}
                      </span>
                    )}
                    {project.lead && (
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        Lead: {project.lead.name || 'Unassigned'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-linear-text-secondary hover:text-linear-text-secondary hover:bg-linear-elevated rounded-lg transition-colors"
              >
                <Edit3 className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Progress */}
        <div className="mt-6 bg-linear-surface rounded-xl border border-linear-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-linear-text-secondary">Progress</span>
            <span className="text-sm font-bold text-linear-text">{project.progress}%</span>
          </div>
          <div className="w-full bg-linear-elevated rounded-full h-2">
            <div
              className="bg-linear-accent h-2 rounded-full transition-all"
              style={{ width: `${project.progress}%` }}
            />
          </div>
          <div className="flex items-center gap-6 mt-3 text-sm text-linear-text-secondary">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              {completedIssues} completed
            </span>
            <span className="flex items-center gap-1">
              <Layers className="w-4 h-4" />
              {totalIssues} total issues
            </span>
            <span className="flex items-center gap-1">
              <Target className="w-4 h-4" />
              {project.initiatives?.length || 0} initiatives
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-linear-elevated p-1 rounded-lg mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'overview'
              ? 'bg-linear-surface text-linear-text shadow-sm'
              : 'text-linear-text-secondary hover:text-linear-text'
          }`}
        >
          <FolderKanban className="w-4 h-4" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('issues')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'issues'
              ? 'bg-linear-surface text-linear-text shadow-sm'
              : 'text-linear-text-secondary hover:text-linear-text'
          }`}
        >
          <Layers className="w-4 h-4" />
          Issues ({totalIssues})
        </button>
        <button
          onClick={() => setActiveTab('initiatives')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'initiatives'
              ? 'bg-linear-surface text-linear-text shadow-sm'
              : 'text-linear-text-secondary hover:text-linear-text'
          }`}
        >
          <Target className="w-4 h-4" />
          Initiatives ({project.initiatives?.length || 0})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Initiatives Section */}
          <div className="bg-linear-surface rounded-xl border border-linear-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-linear-text">Initiatives</h3>
              <button
                onClick={() => setShowAddInitiative(true)}
                className="p-1 text-linear-text-tertiary hover:text-linear-text-secondary hover:bg-linear-elevated rounded"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {project.initiatives?.length === 0 ? (
              <p className="text-linear-text-tertiary text-sm">No initiatives yet</p>
            ) : (
              <div className="space-y-3">
                {project.initiatives?.map((initiative) => (
                  <Link
                    key={initiative.id}
                    to={`/${workspace}/initiatives/${initiative.slug}`}
                    className="block p-3 bg-linear-elevated/50 rounded-lg hover:bg-linear-elevated transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-linear-text">{initiative.name}</span>
                      <span className="text-sm text-linear-text-secondary">{initiative.progress}%</span>
                    </div>
                    <div className="w-full bg-linear-elevated rounded-full h-1">
                      <div
                        className="bg-linear-accent h-1 rounded-full"
                        style={{ width: `${initiative.progress}%` }}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Issues */}
          <div className="bg-linear-surface rounded-xl border border-linear-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-linear-text">Recent Issues</h3>
              <Link
                to={`/${workspace}/issues?projectId=${project.id}`}
                className="text-sm text-linear-accent hover:text-linear-accent flex items-center gap-1"
              >
                View all
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            {project.issues?.length === 0 ? (
              <p className="text-linear-text-tertiary text-sm">No issues yet</p>
            ) : (
              <div className="space-y-2">
                {project.issues?.slice(0, 5).map((issue) => (
                  <Link
                    key={issue.id}
                    to={`/${workspace}/issues/${issue.identifier}`}
                    className="flex items-center gap-3 p-2 hover:bg-linear-elevated/50 rounded-lg transition-colors"
                  >
                    <span className="text-sm text-linear-text-secondary">{issue.identifier}</span>
                    <span className="flex-1 text-sm text-linear-text truncate">{issue.title}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      issue.state === 'DONE' ? 'bg-emerald-500/10 text-emerald-400' :
                      issue.state === 'IN_PROGRESS' ? 'bg-sky-500/10 text-sky-400' :
                      'bg-linear-elevated text-linear-text-secondary'
                    }`}>
                      {issue.state}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'issues' && (
        <div className="bg-linear-surface rounded-xl border border-linear-border overflow-hidden">
          <div className="divide-y divide-linear-border">
            {project.issues?.length === 0 ? (
              <div className="p-8 text-center">
                <Layers className="w-12 h-12 text-linear-text-tertiary mx-auto mb-4" />
                <p className="text-linear-text-secondary">No issues in this project yet</p>
              </div>
            ) : (
              project.issues?.map((issue) => (
                <Link
                  key={issue.id}
                  to={`/${workspace}/issues/${issue.identifier}`}
                  className="flex items-center gap-4 p-4 hover:bg-linear-elevated/50 transition-colors"
                >
                  <span className="text-sm text-linear-text-secondary w-20">{issue.identifier}</span>
                  <span className="flex-1 font-medium text-linear-text">{issue.title}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    issue.priority === 'URGENT' ? 'bg-red-500/10 text-red-400' :
                    issue.priority === 'HIGH' ? 'bg-orange-500/10 text-orange-400' :
                    issue.priority === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400' :
                    issue.priority === 'LOW' ? 'bg-sky-500/10 text-sky-400' :
                    'bg-linear-elevated text-linear-text-secondary'
                  }`}>
                    {issue.priority}
                  </span>
                  {issue.assignee && (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-linear-elevated rounded-full flex items-center justify-center text-xs">
                        {(issue.assignee.name || '?').charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'initiatives' && (
        <div className="bg-linear-surface rounded-xl border border-linear-border p-5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-linear-text">Initiatives</h3>
            <button className="flex items-center gap-2 bg-linear-accent hover:bg-linear-accent/80 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" />
              Add Initiative
            </button>
          </div>
          {project.initiatives?.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-12 h-12 text-linear-text-tertiary mx-auto mb-4" />
              <p className="text-linear-text-secondary mb-4">No initiatives for this project yet</p>
              <button className="text-linear-accent hover:text-linear-accent font-medium">
                Create first initiative
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.initiatives?.map((initiative) => (
                <div key={initiative.id} className="border border-linear-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-linear-text">{initiative.name}</h4>
                    <span className="text-sm font-medium text-linear-text-secondary">{initiative.progress}%</span>
                  </div>
                  {initiative.description && (
                    <p className="text-sm text-linear-text-secondary mb-3">{initiative.description}</p>
                  )}
                  <div className="w-full bg-linear-elevated rounded-full h-2">
                    <div
                      className="bg-linear-accent h-2 rounded-full"
                      style={{ width: `${initiative.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </AnimatedPage>
  );
}
