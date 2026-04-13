import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { API_URL } from '~/lib/api';
import { 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  MoreHorizontal, 
  Plus,
  Search,
  FolderOpen,
  Folder
} from 'lucide-react';

interface PageNode {
  id: string;
  title: string;
  slug: string;
  emoji: string | null;
  updatedAt: string;
  childCount: number;
  children?: PageNode[];
}

interface PageTreeProps {
  onPageClick?: (pageId: string) => void;
  onCreatePage?: (parentId?: string) => void;
  currentPageId?: string;
}

function TreeNode({ 
  node, 
  depth = 0, 
  expandedIds, 
  toggleExpand, 
  currentPageId,
  onCreatePage,
}: { 
  node: PageNode; 
  depth?: number;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  currentPageId?: string;
  onCreatePage?: (parentId?: string) => void;
}) {
  const { workspace } = useParams();
  const isExpanded = expandedIds.has(node.id);
  const isActive = currentPageId === node.id;
  const hasChildren = node.childCount > 0 || (node.children && node.children.length > 0);

  return (
    <div>
      <div
        className={`
          group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer
          transition-colors text-sm
          ${isActive ? 'bg-linear-accent/10 text-linear-accent' : 'hover:bg-linear-elevated text-linear-text-secondary'}
        `}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* Expand/Collapse button */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleExpand(node.id);
            }}
            className="p-0.5 hover:bg-linear-elevated rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-linear-text-tertiary" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-linear-text-tertiary" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* Page link */}
        <Link
          to={`/${workspace}/notes/${node.slug}`}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          <span className="shrink-0">
            {node.emoji || (hasChildren ? (
              isExpanded ? <FolderOpen className="w-4 h-4 text-yellow-500" /> : <Folder className="w-4 h-4 text-yellow-500" />
            ) : (
              <FileText className="w-4 h-4 text-linear-text-tertiary" />
            ))}
          </span>
          <span className="truncate flex-1">{node.title || 'Untitled'}</span>
        </Link>

        {/* Hover actions */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCreatePage?.(node.id);
            }}
            className="p-1 hover:bg-linear-elevated rounded"
            title="Add subpage"
          >
            <Plus className="w-3.5 h-3.5 text-linear-text-tertiary" />
          </button>
        </div>
      </div>

      {/* Children */}
      {isExpanded && node.children && node.children.length > 0 && (
        <div className="mt-0.5">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              currentPageId={currentPageId}
              onCreatePage={onCreatePage}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function PageTree({ onPageClick, onCreatePage, currentPageId }: PageTreeProps) {
  const { workspace } = useParams();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['page-tree', workspace],
    queryFn: async (): Promise<{ tree: PageNode[] }> => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/notes/tree`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to load page tree');
      return response.json();
    },
  });

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  // Auto-expand parents of current page
  useState(() => {
    if (currentPageId && data?.tree) {
      const findAndExpandParents = (nodes: PageNode[], targetId: string, path: string[] = []): string[] | null => {
        for (const node of nodes) {
          if (node.id === targetId) {
            return path;
          }
          if (node.children) {
            const result = findAndExpandParents(node.children, targetId, [...path, node.id]);
            if (result) return result;
          }
        }
        return null;
      };

      const parents = findAndExpandParents(data.tree, currentPageId);
      if (parents) {
        setExpandedIds(new Set([...Array.from(expandedIds), ...parents]));
      }
    }
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 bg-linear-elevated rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-linear-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-linear-text">Pages</h3>
          <button
            onClick={() => onCreatePage?.()}
            className="p-1.5 hover:bg-linear-elevated rounded-lg transition-colors"
            title="Create new page"
          >
            <Plus className="w-4 h-4 text-linear-text-secondary" />
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-linear-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pages..."
            className="w-full pl-8 pr-3 py-1.5 bg-linear-elevated border border-linear-border rounded-lg text-linear-text text-sm placeholder:text-linear-text-tertiary focus:outline-none focus:ring-2 focus:ring-linear-accent/40"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {data?.tree.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-8 h-8 text-linear-text-tertiary mx-auto mb-2" />
            <p className="text-sm text-linear-text-secondary">No pages yet</p>
            <button
              onClick={() => onCreatePage?.()}
              className="mt-2 text-sm text-linear-accent hover:text-linear-accent/80"
            >
              Create your first page
            </button>
          </div>
        ) : (
          <div className="space-y-0.5">
            {data?.tree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                expandedIds={expandedIds}
                toggleExpand={toggleExpand}
                currentPageId={currentPageId}
                onCreatePage={onCreatePage}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-linear-border">
        <button
          onClick={() => onCreatePage?.()}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-linear-text-secondary hover:bg-linear-elevated rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New page
        </button>
      </div>
    </div>
  );
}
