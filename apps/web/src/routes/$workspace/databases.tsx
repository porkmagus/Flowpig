import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '~/lib/api';
import { AnimatedPage, AnimatedList, AnimatedItem, AnimatedCard } from '@flowpigdev/ui';
import {
  Database,
  Search,
  Plus,
  Grid3X3,
  List,
  Calendar,
  Kanban,
  MoreHorizontal,
  ChevronRight,
  Filter,
  ArrowUpDown,
  Table2,
  LayoutGrid,
} from 'lucide-react';

interface DatabaseItem {
  id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  _count?: {
    views: number;
    rows: number;
  };
}

export default function DatabasesListRoute() {
  const { workspace } = useParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDatabaseName, setNewDatabaseName] = useState('');
  const [newDatabaseDescription, setNewDatabaseDescription] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data, isLoading } = useQuery({
    queryKey: ['databases', workspace, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/databases?${params.toString()}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to load databases');
      return response.json();
    },
  });

  const databases: DatabaseItem[] = data?.databases || [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/databases`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: newDatabaseName,
            description: newDatabaseDescription,
            emoji: '🗄️',
          }),
        }
      );
      if (!response.ok) throw new Error('Failed to create database');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['databases', workspace] });
      setShowCreateModal(false);
      setNewDatabaseName('');
      setNewDatabaseDescription('');
    },
  });

  return (
    <AnimatedPage className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-linear-text">Databases</h1>
          <p className="text-linear-text-secondary mt-1">
            {databases.length} {databases.length === 1 ? 'database' : 'databases'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-linear-elevated rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-linear-surface shadow-sm text-linear-text' : 'text-linear-text-secondary hover:text-linear-text-secondary'}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-linear-surface shadow-sm text-linear-text' : 'text-linear-text-secondary hover:text-linear-text-secondary'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-linear-accent hover:bg-linear-accent/80 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Database
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-linear-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search databases..."
            className="w-full pl-10 pr-4 py-2 border border-linear-border rounded-lg focus:ring-2 focus:ring-linear-accent/40 focus:border-transparent"
          />
        </div>
        <button className="flex items-center gap-2 px-3 py-2 text-sm text-linear-text-secondary hover:bg-linear-elevated rounded-lg transition-colors">
          <Filter className="w-4 h-4" />
          Filter
        </button>
        <button className="flex items-center gap-2 px-3 py-2 text-sm text-linear-text-secondary hover:bg-linear-elevated rounded-lg transition-colors">
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
              className="bg-linear-surface rounded-xl p-6 w-full max-w-md shadow-xl"
            >
              <h2 className="text-xl font-semibold text-linear-text mb-4">Create Database</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-linear-text-secondary mb-1">Name</label>
                  <input
                    type="text"
                    value={newDatabaseName}
                    onChange={(e) => setNewDatabaseName(e.target.value)}
                    placeholder="e.g., Product Roadmap"
                    className="w-full px-3 py-2 border border-linear-border rounded-lg focus:ring-2 focus:ring-linear-accent/40"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-linear-text-secondary mb-1">Description (optional)</label>
                  <textarea
                    value={newDatabaseDescription}
                    onChange={(e) => setNewDatabaseDescription(e.target.value)}
                    placeholder="What is this database for?"
                    rows={3}
                    className="w-full px-3 py-2 border border-linear-border rounded-lg focus:ring-2 focus:ring-linear-accent/40 resize-none"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-linear-text-secondary hover:text-linear-text"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => createMutation.mutate()}
                    disabled={!newDatabaseName.trim() || createMutation.isPending}
                    className="bg-linear-accent hover:bg-linear-accent/80 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
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
          <div className="w-8 h-8 border-4 border-linear-accent/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : databases.length === 0 ? (
        <div className="text-center py-16 bg-linear-surface rounded-xl border border-linear-border">
          <Database className="w-12 h-12 text-linear-text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-linear-text mb-2">No databases yet</h3>
          <p className="text-linear-text-secondary mb-4">Create your first database to organize your data</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-linear-accent hover:text-linear-accent font-medium"
          >
            Create database
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <AnimatedList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {databases.map((database) => (
            <AnimatedItem key={database.id}>
              <Link to={`/${workspace}/databases/${database.id}`}>
                <AnimatedCard className="bg-linear-surface p-5 rounded-xl border border-linear-border hover:shadow-md transition-all h-full group">
                  {/* Emoji/Icon */}
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-3xl">{database.emoji || '🗄️'}</span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-linear-elevated rounded transition-all"
                    >
                      <MoreHorizontal className="w-4 h-4 text-linear-text-tertiary" />
                    </button>
                  </div>

                  {/* Name */}
                  <h3 className="font-semibold text-linear-text mb-2 line-clamp-1">{database.name}</h3>

                  {/* Description */}
                  {database.description && (
                    <p className="text-sm text-linear-text-secondary mb-3 line-clamp-2">{database.description}</p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-linear-text-secondary mt-4">
                    <span className="flex items-center gap-1">
                      <Table2 className="w-3 h-3" />
                      {database._count?.rows || 0} rows
                    </span>
                    <span className="flex items-center gap-1">
                      <LayoutGrid className="w-3 h-3" />
                      {database._count?.views || 1} view
                    </span>
                  </div>

                  {/* Creator */}
                  {database.creator && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-linear-border">
                      <div className="w-6 h-6 bg-linear-elevated rounded-full flex items-center justify-center text-xs">
                        {(database.creator.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-linear-text-secondary">
                        {database.creator.name || 'Unknown'}
                      </span>
                    </div>
                  )}
                </AnimatedCard>
              </Link>
            </AnimatedItem>
          ))}
        </AnimatedList>
      ) : (
        <div className="bg-linear-surface rounded-xl border border-linear-border overflow-hidden">
          <div className="divide-y divide-linear-border">
            {databases.map((database) => (
              <Link
                key={database.id}
                to={`/${workspace}/databases/${database.id}`}
                className="flex items-center gap-4 p-4 hover:bg-linear-elevated/50 transition-colors"
              >
                <span className="text-2xl">{database.emoji || '🗄️'}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-linear-text">{database.name}</h3>
                  {database.description && (
                    <p className="text-sm text-linear-text-secondary truncate">{database.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-6 text-sm text-linear-text-secondary">
                  <span className="flex items-center gap-1">
                    <Table2 className="w-4 h-4" />
                    {database._count?.rows || 0} rows
                  </span>
                  <span className="flex items-center gap-1">
                    <LayoutGrid className="w-4 h-4" />
                    {database._count?.views || 1} view
                  </span>
                  <span className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-linear-elevated rounded-full flex items-center justify-center text-xs">
                      {(database.creator?.name || '?').charAt(0).toUpperCase()}
                    </div>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </AnimatedPage>
  );
}
