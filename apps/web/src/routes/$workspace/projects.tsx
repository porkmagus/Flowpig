import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '~/lib/api';
import { AnimatedPage, AnimatedList, AnimatedItem, AnimatedCard } from '@flowpigdev/ui';
import {
  FolderKanban,
  Search,
  Plus,
  Target,
  Calendar,
  Users,
  MoreHorizontal,
  ChevronRight,
  Filter,
  ArrowUpDown,
  Layers,
  TrendingUp,
  CheckCircle2,
  Clock,
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
  lead: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  team: {
    id: string;
    name: string;
    key: string;
    color: string;
  } | null;
  _count?: {
    issues: number;
    initiatives: number;
  };
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  'PLANNED': { label: 'Planned', color: 'text-gray-600', bg: 'bg-gray-100' },
  'IN_PROGRESS': { label: 'In Progress', color: 'text-blue-600', bg: 'bg-blue-100' },
  'PAUSED': { label: 'Paused', color: 'text-yellow-600', bg: 'bg-yellow-100' },
  'COMPLETED': { label: 'Completed', color: 'text-green-600', bg: 'bg-green-100' },
  'CANCELLED': { label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-100' },
};

export default function ProjectsListRoute() {
  const { workspace } = useParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['projects', workspace, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/projects?${params.toString()}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to load projects');
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
      if (!response.ok) return null;
      return response.json();
    },
  });

  const projects: Project[] = data?.projects || [];
  const teams = teamsData?.teams || [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/projects`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: newProjectName,
            description: newProjectDescription,
            emoji: '📁',
            status: 'PLANNED',
          }),
        }
      );
      if (!response.ok) throw new Error('Failed to create project');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', workspace] });
      setShowCreateModal(false);
      setNewProjectName('');
      setNewProjectDescription('');
    },
  });

  return (
    <AnimatedPage className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-1">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter || ''}
          onChange={(e) => setStatusFilter(e.target.value || null)}
          className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Status</option>
          <option value="PLANNED">Planned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="PAUSED">Paused</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Filter className="w-4 h-4" />
          Filter
        </button>
        <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowUpDown className="w-4 h-4" />
          Sort
        </button>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Project</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g., Q1 Product Launch"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                  <textarea
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    placeholder="What is this project about?"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => createMutation.mutate()}
                    disabled={!newProjectName.trim() || createMutation.isPending}
                    className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-500 mb-4">Create your first project to organize your work</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-primary-500 hover:text-primary-600 font-medium"
          >
            Create project
          </button>
        </div>
      ) : (
        <AnimatedList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const status = statusConfig[project.status];
            return (
              <AnimatedItem key={project.id}>
                <Link to={`/${workspace}/projects/${project.slug}`}>
                  <AnimatedCard className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-all h-full group">
                    {/* Emoji/Icon & Team */}
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-3xl">{project.emoji || '📁'}</span>
                      <div className="flex items-center gap-2">
                        {project.team && (
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium text-white"
                            style={{ backgroundColor: project.team.color }}
                          >
                            {project.team.key}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-all"
                        >
                          <MoreHorizontal className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </div>

                    {/* Name */}
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1">{project.name}</h3>

                    {/* Description */}
                    {project.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{project.description}</p>
                    )}

                    {/* Status & Progress */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${status.bg} ${status.color}`}>
                        {status.label}
                      </span>
                      <span className="text-sm text-gray-500">{project.progress}%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4">
                      <div
                        className="bg-primary-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {project._count?.issues || 0} issues
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {project._count?.initiatives || 0} initiatives
                      </span>
                    </div>

                    {/* Lead & Date */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        {project.lead ? (
                          <>
                            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs">
                              {(project.lead.name || '?').charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-gray-600">
                              {project.lead.name || 'Unassigned'}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm text-gray-400">No lead</span>
                        )}
                      </div>
                      {project.targetDate && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          Due {new Date(project.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </AnimatedCard>
                </Link>
              </AnimatedItem>
            );
          })}
        </AnimatedList>
      )}
    </AnimatedPage>
  );
}
