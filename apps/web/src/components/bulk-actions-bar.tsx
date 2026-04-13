import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '~/lib/api';
import { 
  CheckSquare, 
  Square, 
  Trash2, 
  X,
  ChevronDown,
  User,
  Tag,
  RotateCcw,
  AlertCircle,
  Flag,
  MoreHorizontal,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface BulkActionsBarProps {
  workspace: string;
  selectedIssues: string[];
  onClearSelection: () => void;
  availableLabels?: Array<{ id: string; name: string; color: string }>;
  availableAssignees?: Array<{ id: string; name: string | null; image: string | null }>;
  availableStates?: Array<{ id: string; name: string; key: string; color: string }>;
}

export function BulkActionsBar({ 
  workspace, 
  selectedIssues, 
  onClearSelection,
  availableLabels = [],
  availableAssignees = [],
  availableStates = [],
}: BulkActionsBarProps) {
  const queryClient = useQueryClient();
  const [showDropdown, setShowDropdown] = useState<string | null>(null);

  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/issues/bulk-update`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            issueIds: selectedIssues,
            updates,
          }),
        }
      );
      if (!response.ok) throw new Error('Failed to update issues');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues', workspace] });
      queryClient.invalidateQueries({ queryKey: ['my-issues', workspace] });
      toast.success(`${selectedIssues.length} issues updated`);
      onClearSelection();
    },
    onError: () => {
      toast.error('Failed to update issues');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/issues/bulk-delete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ issueIds: selectedIssues }),
        }
      );
      if (!response.ok) throw new Error('Failed to delete issues');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues', workspace] });
      queryClient.invalidateQueries({ queryKey: ['my-issues', workspace] });
      toast.success(`${selectedIssues.length} issues deleted`);
      onClearSelection();
    },
    onError: () => {
      toast.error('Failed to delete issues');
    },
  });

  const handleStateChange = (state: string | null) => {
    if (state) {
      bulkUpdateMutation.mutate({ state });
    }
    setShowDropdown(null);
  };

  const handlePriorityChange = (priority: string | null) => {
    if (priority) {
      bulkUpdateMutation.mutate({ priority });
    }
    setShowDropdown(null);
  };

  const handleAssigneeChange = (assigneeId: string | null) => {
    bulkUpdateMutation.mutate({ assigneeId });
    setShowDropdown(null);
  };

  const handleLabelChange = (labelIds: string[]) => {
    bulkUpdateMutation.mutate({ labelIds });
    setShowDropdown(null);
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedIssues.length} issues?`)) {
      bulkDeleteMutation.mutate();
    }
  };

  const isLoading = bulkUpdateMutation.isPending || bulkDeleteMutation.isPending;

  const Dropdown = ({ 
    items, 
    onSelect, 
    showNull = false, 
    nullLabel = 'None' 
  }: { 
    items: Array<{ id: string; name: string; color?: string; image?: string | null }>;
    onSelect: (id: string | null) => void;
    showNull?: boolean;
    nullLabel?: string;
  }) => (
    <div className="absolute top-full left-0 mt-1 w-56 bg-linear-surface border border-linear-border rounded-lg shadow-xl z-50 py-1 max-h-64 overflow-y-auto">
      {showNull && (
        <button
          onClick={() => onSelect(null)}
          className="w-full px-3 py-2 text-left text-sm hover:bg-linear-elevated/50 flex items-center gap-2"
        >
          <X className="w-4 h-4 text-linear-text-tertiary" />
          <span className="text-linear-text-secondary">{nullLabel}</span>
        </button>
      )}
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className="w-full px-3 py-2 text-left text-sm hover:bg-linear-elevated/50 flex items-center gap-2"
        >
          {item.color && (
            <span 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: item.color }}
            />
          )}
          {item.image && (
            <img src={item.image} alt="" className="w-5 h-5 rounded-full" />
          )}
          <span className="text-linear-text-secondary">{item.name}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-linear-bg text-linear-text px-4 py-3 rounded-xl shadow-2xl flex items-center gap-4 z-50">
      {isLoading ? (
        <div className="flex items-center gap-2 px-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Processing...</span>
        </div>
      ) : (
        <>
          {/* Selection count */}
          <div className="flex items-center gap-2 pr-4 border-r border-linear-border">
            <CheckSquare className="w-4 h-4 text-linear-accent" />
            <span className="font-medium">{selectedIssues.length} selected</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* State */}
            {availableStates.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(showDropdown === 'state' ? null : 'state')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-linear-surface hover:bg-linear-elevated rounded-lg text-sm transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>State</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showDropdown === 'state' && (
                  <Dropdown 
                    items={availableStates.map(s => ({ 
                      id: s.key, 
                      name: s.name, 
                      color: s.color 
                    }))} 
                    onSelect={handleStateChange}
                  />
                )}
              </div>
            )}

            {/* Priority */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(showDropdown === 'priority' ? null : 'priority')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-linear-surface hover:bg-linear-elevated rounded-lg text-sm transition-colors"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Priority</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {showDropdown === 'priority' && (
                <Dropdown 
                  items={[
                    { id: 'NO_PRIORITY', name: 'No priority', color: '#9ca3af' },
                    { id: 'LOW', name: 'Low', color: '#3b82f6' },
                    { id: 'MEDIUM', name: 'Medium', color: '#f59e0b' },
                    { id: 'HIGH', name: 'High', color: '#f97316' },
                    { id: 'URGENT', name: 'Urgent', color: '#ef4444' },
                  ]} 
                  onSelect={handlePriorityChange}
                />
              )}
            </div>

            {/* Assignee */}
            {availableAssignees.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(showDropdown === 'assignee' ? null : 'assignee')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-linear-surface hover:bg-linear-elevated rounded-lg text-sm transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Assignee</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showDropdown === 'assignee' && (
                  <Dropdown 
                    items={availableAssignees.map(a => ({ 
                      id: a.id, 
                      name: a.name || 'Unknown', 
                      image: a.image 
                    }))} 
                    onSelect={handleAssigneeChange}
                    showNull
                    nullLabel="Unassign"
                  />
                )}
              </div>
            )}

            {/* Labels */}
            {availableLabels.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(showDropdown === 'labels' ? null : 'labels')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-linear-surface hover:bg-linear-elevated rounded-lg text-sm transition-colors"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Labels</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showDropdown === 'labels' && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-linear-surface border border-linear-border rounded-lg shadow-xl z-50 py-1 max-h-64 overflow-y-auto">
                    <div className="p-2">
                      <button
                        onClick={() => handleLabelChange([])}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-linear-elevated/50 rounded-lg text-red-600"
                      >
                        Remove all labels
                      </button>
                    </div>
                    <div className="border-t border-linear-border pt-1">
                      <div className="px-3 py-1 text-xs text-linear-text-tertiary font-medium uppercase">
                        Set labels
                      </div>
                      {availableLabels.map((label) => (
                        <button
                          key={label.id}
                          onClick={() => handleLabelChange([label.id])}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-linear-elevated/50 flex items-center gap-2"
                        >
                          <span 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: label.color }}
                          />
                          <span className="text-linear-text-secondary">{label.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Delete */}
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>

          {/* Clear */}
          <button
            onClick={onClearSelection}
            className="ml-2 p-1.5 hover:bg-linear-elevated rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Click outside to close dropdowns */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDropdown(null)}
        />
      )}
    </div>
  );
}

// Hook for managing bulk selection
export function useBulkSelection() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const selectAll = (ids: string[]) => {
    setSelectedIds(ids);
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const isSelected = (id: string) => selectedIds.includes(id);

  return {
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    hasSelection: selectedIds.length > 0,
  };
}
