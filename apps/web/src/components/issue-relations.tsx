import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '~/lib/api';
import { 
  GitBranch, 
  AlertCircle, 
  Copy, 
  Link, 
  X,
  Plus,
  Search,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Layers
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PriorityBadge } from './priority-badge';
import { IssueStateBadge } from './issue-state-badge';

interface IssueRelationsProps {
  workspace: string;
  issueId: string;
}

interface Relation {
  id: string;
  type: 'RELATES_TO' | 'BLOCKS' | 'BLOCKED_BY' | 'DUPLICATES' | 'DUPLICATED_BY';
  direction: 'outgoing' | 'incoming';
  issue: {
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
    team: {
      id: string;
      key: string;
      color: string;
    };
  };
}

const relationConfig = {
  RELATES_TO: { 
    label: 'relates to', 
    color: 'text-linear-text-secondary',
    bgColor: 'bg-linear-elevated/50',
    icon: Link,
  },
  BLOCKS: { 
    label: 'blocks', 
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    icon: AlertTriangle,
  },
  BLOCKED_BY: { 
    label: 'blocked by', 
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    icon: AlertCircle,
  },
  DUPLICATES: { 
    label: 'duplicates', 
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    icon: Copy,
  },
  DUPLICATED_BY: { 
    label: 'duplicated by', 
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    icon: Layers,
  },
};

export function IssueRelations({ workspace, issueId }: IssueRelationsProps) {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<Relation['type']>('RELATES_TO');

  const { data, isLoading } = useQuery({
    queryKey: ['issue-relations', issueId],
    queryFn: async (): Promise<{ relations: Relation[] }> => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/issues/${issueId}/relations`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to load relations');
      return response.json();
    },
  });

  const { data: searchResults } = useQuery({
    queryKey: ['issue-search-for-relation', searchQuery, issueId],
    queryFn: async (): Promise<{ issues: Array<{
      id: string;
      identifier: string;
      title: string;
      state: string;
      team: { key: string; color: string };
    }> }> => {
      if (!searchQuery || searchQuery.length < 2) return { issues: [] };
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/issues/search-for-relation?q=${encodeURIComponent(searchQuery)}&excludeIssueId=${issueId}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to search');
      return response.json();
    },
    enabled: searchQuery.length >= 2,
  });

  const addRelationMutation = useMutation({
    mutationFn: async ({ relatedIssueId, type }: { relatedIssueId: string; type: Relation['type'] }) => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/issues/${issueId}/relations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ relatedIssueId, type }),
        }
      );
      if (!response.ok) throw new Error('Failed to add relation');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue-relations', issueId] });
      setShowAddModal(false);
      setSearchQuery('');
      toast.success('Relation added');
    },
    onError: () => {
      toast.error('Failed to add relation');
    },
  });

  const removeRelationMutation = useMutation({
    mutationFn: async (relationId: string) => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/issues/${issueId}/relations/${relationId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to remove relation');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue-relations', issueId] });
      toast.success('Relation removed');
    },
  });

  const relations = data?.relations || [];
  
  // Group by type for display
  const blocking = relations.filter(r => r.type === 'BLOCKS');
  const blockedBy = relations.filter(r => r.type === 'BLOCKED_BY');
  const duplicates = relations.filter(r => r.type === 'DUPLICATES' || r.type === 'DUPLICATED_BY');
  const relates = relations.filter(r => r.type === 'RELATES_TO');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-linear-text">Relations</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-linear-accent hover:bg-linear-accent/10 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add relation
        </button>
      </div>

      {/* Blocking Issues (Critical) */}
      {blockedBy.length > 0 && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center gap-2 text-orange-700 font-medium text-sm mb-2">
            <AlertCircle className="w-4 h-4" />
            <span>Blocked by {blockedBy.length} issue{blockedBy.length > 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-2">
            {blockedBy.map((relation) => (
              <RelationItem 
                key={relation.id} 
                relation={relation} 
                onRemove={() => removeRelationMutation.mutate(relation.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Blocks Others */}
      {blocking.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-red-600 font-medium text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Blocking {blocking.length} issue{blocking.length > 1 ? 's' : ''}</span>
          </div>
          {blocking.map((relation) => (
            <RelationItem 
              key={relation.id} 
              relation={relation} 
              onRemove={() => removeRelationMutation.mutate(relation.id)}
            />
          ))}
        </div>
      )}

      {/* Duplicates */}
      {duplicates.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-purple-600 font-medium text-sm">
            <Copy className="w-4 h-4" />
            <span>Duplicates</span>
          </div>
          {duplicates.map((relation) => (
            <RelationItem 
              key={relation.id} 
              relation={relation} 
              onRemove={() => removeRelationMutation.mutate(relation.id)}
            />
          ))}
        </div>
      )}

      {/* Related Issues */}
      {relates.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-linear-text-secondary font-medium text-sm">
            <Link className="w-4 h-4" />
            <span>Related issues</span>
          </div>
          {relates.map((relation) => (
            <RelationItem 
              key={relation.id} 
              relation={relation} 
              onRemove={() => removeRelationMutation.mutate(relation.id)}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {relations.length === 0 && (
        <div className="text-center py-6 text-linear-text-secondary">
          <GitBranch className="w-8 h-8 mx-auto mb-2 text-linear-text-tertiary" />
          <p className="text-sm">No relations yet</p>
          <p className="text-xs text-linear-text-tertiary mt-1">Link related issues</p>
        </div>
      )}

      {/* Add Relation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-linear-surface rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-linear-border">
              <h3 className="font-semibold text-linear-text">Add relation</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-linear-elevated rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-linear-text-secondary" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Relation Type */}
              <div>
                <label className="text-sm font-medium text-linear-text-secondary mb-2 block">Relation type</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(relationConfig).map(([type, config]) => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type as Relation['type'])}
                      className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${
                        selectedType === type
                          ? 'border-linear-accent bg-linear-accent/10'
                          : 'border-linear-border hover:border-linear-border-hover'
                      }`}
                    >
                      <config.icon className={`w-4 h-4 ${config.color}`} />
                      <span className="text-sm text-linear-text-secondary">{config.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Search */}
              <div>
                <label className="text-sm font-medium text-linear-text-secondary mb-2 block">Search issue</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-linear-text-tertiary" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title or ID..."
                    className="w-full pl-10 pr-4 py-2 border border-linear-border rounded-lg focus:outline-none focus:ring-2 focus:ring-linear-accent/40"
                  />
                </div>
              </div>

              {/* Search Results */}
              {searchResults?.issues && searchResults.issues.length > 0 && (
                <div className="border border-linear-border rounded-lg divide-y divide-linear-border max-h-48 overflow-y-auto">
                  {searchResults.issues.map((issue) => (
                    <button
                      key={issue.id}
                      onClick={() => addRelationMutation.mutate({ relatedIssueId: issue.id, type: selectedType })}
                      className="w-full flex items-center gap-3 p-3 hover:bg-linear-elevated/50 text-left transition-colors"
                    >
                      <div 
                        className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: issue.team.color }}
                      >
                        {issue.team.key.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-linear-text-secondary">{issue.identifier}</span>
                          <IssueStateBadge state={issue.state} />
                        </div>
                        <p className="text-sm text-linear-text truncate">{issue.title}</p>
                      </div>
                      <Plus className="w-4 h-4 text-linear-text-tertiary" />
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 && searchResults?.issues.length === 0 && (
                <p className="text-sm text-linear-text-secondary text-center py-4">No issues found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RelationItem({ relation, onRemove }: { relation: Relation; onRemove: () => void }) {
  const config = relationConfig[relation.type];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 p-2 bg-linear-elevated/50 rounded-lg group">
      <div className={`p-1.5 rounded ${config.bgColor}`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>
      
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <div 
          className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: relation.issue.team.color }}
        >
          {relation.issue.team.key.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-linear-text-secondary">{relation.issue.identifier}</span>
            <span className={`text-xs ${config.color}`}>{config.label}</span>
          </div>
          <p className="text-sm text-linear-text truncate">{relation.issue.title}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <PriorityBadge priority={relation.issue.priority} />
        {relation.issue.assignee && (
          <div className="w-6 h-6 rounded-full bg-linear-elevated flex items-center justify-center text-xs">
            {relation.issue.assignee.name?.[0] || '?'}
          </div>
        )}
        <button
          onClick={onRemove}
          className="p-1 hover:bg-red-100 rounded text-linear-text-tertiary hover:text-red-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
