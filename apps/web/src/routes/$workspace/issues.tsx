import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { API_URL } from '~/lib/api';
import { AnimatedList, AnimatedItem, AnimatedCard } from '@flowpigdev/ui';
import { 
  CircleDot, 
  Search, 
  Filter, 
  Plus, 
  ArrowRight,
  Clock,
  MessageSquare,
  User,
} from 'lucide-react';

interface Issue {
  id: string;
  identifier: string;
  title: string;
  state: string;
  priority: string;
  createdAt: string;
  assignee?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  team?: {
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
  };
  labels: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  commentCount: number;
}

const priorityColors: Record<string, string> = {
  'NO_PRIORITY': 'text-gray-500',
  'LOW': 'text-blue-500',
  'MEDIUM': 'text-yellow-500',
  'HIGH': 'text-orange-500',
  'URGENT': 'text-red-500',
};

const stateColors: Record<string, string> = {
  'BACKLOG': 'bg-gray-100 text-gray-600',
  'TODO': 'bg-blue-50 text-blue-600',
  'IN_PROGRESS': 'bg-yellow-50 text-yellow-600',
  'IN_REVIEW': 'bg-purple-50 text-purple-600',
  'DONE': 'bg-green-50 text-green-600',
  'CANCELLED': 'bg-gray-100 text-gray-400',
};

export default function IssuesListRoute() {
  const { workspace } = useParams();
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['issues', workspace, search, stateFilter, priorityFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (stateFilter) params.set('state', stateFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/issues?${params.toString()}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to load issues');
      return response.json();
    },
  });

  const issues: Issue[] = data?.issues || [];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Issues</h1>
          <p className="text-gray-600 mt-1">
            {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
          </p>
        </div>
        <button className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          <Plus className="w-4 h-4" />
          New Issue
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
            placeholder="Search issues..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All States</option>
          <option value="BACKLOG">Backlog</option>
          <option value="TODO">Todo</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="DONE">Done</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Priorities</option>
          <option value="NO_PRIORITY">No Priority</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>

      {/* Issues List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : issues.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <CircleDot className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No issues found</h3>
          <p className="text-gray-500 mb-4">Create your first issue to get started</p>
          <button className="text-primary-500 hover:text-primary-600 font-medium">
            Create issue
          </button>
        </div>
      ) : (
        <AnimatedList className="space-y-2">
          {issues.map((issue) => (
            <AnimatedItem key={issue.id}>
              <Link to={`/${workspace}/issues/${issue.id}`}>
                <AnimatedCard className="bg-white p-4 rounded-xl border border-gray-200 hover:shadow-md transition-all">
                  <div className="flex items-start gap-4">
                    {/* Issue identifier and icon */}
                    <div className="flex items-center gap-2 mt-0.5">
                      <CircleDot className={`w-4 h-4 ${priorityColors[issue.priority]}`} />
                      <span className="text-sm text-gray-500 font-medium">{issue.identifier}</span>
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{issue.title}</h3>
                      
                      {/* Labels */}
                      {issue.labels.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          {issue.labels.map((label) => (
                            <span
                              key={label.id}
                              className="px-2 py-0.5 rounded text-xs font-medium"
                              style={{ 
                                backgroundColor: `${label.color}20`,
                                color: label.color,
                              }}
                            >
                              {label.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Meta info */}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        {issue.workflowState && (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${stateColors[issue.workflowState.category] || 'bg-gray-100'}`}>
                            {issue.workflowState.name}
                          </span>
                        )}
                        
                        {issue.assignee ? (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {issue.assignee.name || 'Unassigned'}
                          </span>
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        )}

                        {issue.commentCount > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {issue.commentCount}
                          </span>
                        )}

                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(issue.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ArrowRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                  </div>
                </AnimatedCard>
              </Link>
            </AnimatedItem>
          ))}
        </AnimatedList>
      )}
    </div>
  );
}
