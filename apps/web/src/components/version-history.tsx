import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '~/lib/api';
import { 
  History, 
  X, 
  Clock, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight,
  User,
  GitCommit
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface VersionHistoryProps {
  workspace: string;
  noteId: string;
  currentContent: any;
  onRestore?: (version: any) => void;
}

interface Version {
  id: string;
  title: string;
  emoji: string | null;
  coverImage: string | null;
  editReason: string | null;
  editedBy: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  createdAt: string;
}

interface VersionData {
  versions: Version[];
  current: {
    id: string;
    title: string;
    emoji: string | null;
    coverImage: string | null;
    editReason: string | null;
    editedBy: {
      id: string;
      name: string | null;
      image: string | null;
    } | null;
    createdAt: string;
  };
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export function VersionHistory({ workspace, noteId, currentContent, onRestore }: VersionHistoryProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareFrom, setCompareFrom] = useState<string>('');
  const [compareTo, setCompareTo] = useState<string>('current');

  const { data, isLoading } = useQuery({
    queryKey: ['note-versions', noteId],
    queryFn: async (): Promise<VersionData> => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/notes/${noteId}/versions`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to load version history');
      return response.json();
    },
    enabled: isOpen,
  });

  const restoreMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/notes/${noteId}/versions/${versionId}/restore`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to restore version');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['note', noteId] });
      queryClient.invalidateQueries({ queryKey: ['note-versions', noteId] });
      onRestore?.(data.note);
      setSelectedVersionId(null);
      toast.success('Version restored successfully');
    },
    onError: () => {
      toast.error('Failed to restore version');
    },
  });

  const versions = data?.versions || [];
  const allVersions = [data?.current, ...versions].filter(Boolean) as Version[];

  const selectedVersion = allVersions.find(v => v.id === selectedVersionId);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-linear-text-secondary hover:bg-linear-elevated rounded-lg transition-colors"
      >
        <History className="w-4 h-4" />
        <span>History</span>
        {versions.length > 0 && (
          <span className="text-xs text-linear-text-tertiary">({versions.length})</span>
        )}
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="fixed right-0 top-0 h-full w-full max-w-lg bg-linear-surface shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-linear-border">
                <div className="flex items-center gap-3">
                  <History className="w-5 h-5 text-linear-text-secondary" />
                  <h2 className="font-semibold text-linear-text">Version History</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCompareMode(!compareMode)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      compareMode 
                        ? 'bg-linear-accent/20 text-linear-accent' 
                        : 'text-linear-text-secondary hover:bg-linear-elevated'
                    }`}
                  >
                    {compareMode ? 'Done' : 'Compare'}
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-linear-elevated rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-linear-text-secondary" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden flex">
                {/* Version list */}
                <div className="w-full flex flex-col">
                  {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-linear-accent/30 border-t-primary-500 rounded-full animate-spin" />
                    </div>
                  ) : allVersions.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-linear-text-secondary p-8">
                      <GitCommit className="w-12 h-12 mb-3 text-linear-text-tertiary" />
                      <p>No version history yet</p>
                      <p className="text-sm text-linear-text-tertiary mt-1">
                        Changes are tracked automatically when you edit
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto">
                      {/* Current version */}
                      {data?.current && (
                        <VersionItem
                          version={data.current}
                          isCurrent
                          isSelected={selectedVersionId === 'current'}
                          isCompareFrom={compareFrom === 'current'}
                          isCompareTo={compareTo === 'current'}
                          compareMode={compareMode}
                          onSelect={() => {
                            if (compareMode) {
                              if (compareFrom === 'current') setCompareFrom('');
                              else if (compareTo === 'current') setCompareTo('');
                              else if (!compareFrom) setCompareFrom('current');
                              else setCompareTo('current');
                            } else {
                              setSelectedVersionId('current');
                            }
                          }}
                        />
                      )}

                      {/* Previous versions */}
                      <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-6 top-0 bottom-0 w-px bg-linear-elevated" />
                        
                        {versions.map((version, index) => (
                          <VersionItem
                            key={version.id}
                            version={version}
                            index={index}
                            isSelected={selectedVersionId === version.id}
                            isCompareFrom={compareFrom === version.id}
                            isCompareTo={compareTo === version.id}
                            compareMode={compareMode}
                            onSelect={() => {
                              if (compareMode) {
                                if (compareFrom === version.id) setCompareFrom('');
                                else if (compareTo === version.id) setCompareTo('');
                                else if (!compareFrom) setCompareFrom(version.id);
                                else setCompareTo(version.id);
                              } else {
                                setSelectedVersionId(version.id);
                              }
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Compare actions */}
                  {compareMode && compareFrom && compareTo && (
                    <div className="p-4 border-t border-linear-border bg-linear-elevated/50">
                      <button
                        onClick={() => {
                          // Navigate to compare view
                          window.open(
                            `/workspaces/${workspace}/notes/${noteId}/compare?from=${compareFrom}&to=${compareTo}`,
                            '_blank'
                          );
                        }}
                        className="w-full py-2 bg-linear-accent text-white rounded-lg font-medium hover:bg-linear-accent/80 transition-colors"
                      >
                        Compare versions
                      </button>
                    </div>
                  )}
                </div>

                {/* Selected version detail */}
                {selectedVersion && !compareMode && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-80 border-l border-linear-border bg-linear-elevated/50 p-4"
                  >
                    <h3 className="font-medium text-linear-text mb-4">Version Details</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-linear-text-secondary uppercase tracking-wider">Title</label>
                        <p className="text-sm text-linear-text mt-1">{selectedVersion.title}</p>
                      </div>

                      <div>
                        <label className="text-xs text-linear-text-secondary uppercase tracking-wider">Saved</label>
                        <p className="text-sm text-linear-text mt-1">
                          {formatDistanceToNow(new Date(selectedVersion.createdAt), { addSuffix: true })}
                        </p>
                      </div>

                      {selectedVersion.editedBy && (
                        <div>
                          <label className="text-xs text-linear-text-secondary uppercase tracking-wider">By</label>
                          <div className="flex items-center gap-2 mt-1">
                            {selectedVersion.editedBy.image ? (
                              <img 
                                src={selectedVersion.editedBy.image} 
                                alt="" 
                                className="w-6 h-6 rounded-full"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-linear-elevated flex items-center justify-center text-xs">
                                {selectedVersion.editedBy.name?.[0] || '?'}
                              </div>
                            )}
                            <span className="text-sm text-linear-text">
                              {selectedVersion.editedBy.name || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      )}

                      {selectedVersion.editReason && (
                        <div>
                          <label className="text-xs text-linear-text-secondary uppercase tracking-wider">Reason</label>
                          <p className="text-sm text-linear-text mt-1">{selectedVersion.editReason}</p>
                        </div>
                      )}

                      {selectedVersion.id !== 'current' && (
                        <button
                          onClick={() => restoreMutation.mutate(selectedVersion.id)}
                          disabled={restoreMutation.isPending}
                          className="w-full flex items-center justify-center gap-2 py-2 bg-linear-accent text-white rounded-lg font-medium hover:bg-linear-accent/80 disabled:opacity-50 transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Restore this version
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

interface VersionItemProps {
  version: Version;
  isCurrent?: boolean;
  index?: number;
  isSelected: boolean;
  isCompareFrom: boolean;
  isCompareTo: boolean;
  compareMode: boolean;
  onSelect: () => void;
}

function VersionItem({ 
  version, 
  isCurrent, 
  index,
  isSelected, 
  isCompareFrom,
  isCompareTo,
  compareMode,
  onSelect 
}: VersionItemProps) {
  return (
    <button
      onClick={onSelect}
      className={`
        w-full flex items-start gap-3 p-4 text-left transition-colors relative
        ${isSelected ? 'bg-blue-50' : 'hover:bg-linear-elevated/50'}
        ${isCurrent ? 'border-b border-linear-border' : ''}
      `}
    >
      {/* Timeline dot */}
      {!isCurrent && (
        <div className="absolute left-6 top-5 w-2 h-2 rounded-full bg-linear-elevated ring-4 ring-white" />
      )}

      {/* Compare mode indicators */}
      {compareMode && (
        <div className={`
          flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center
          ${isCompareFrom ? 'border-blue-500 bg-blue-500 text-white' : ''}
          ${isCompareTo ? 'border-green-500 bg-green-500 text-white' : ''}
          ${!isCompareFrom && !isCompareTo ? 'border-linear-border' : ''}
        `}>
          {isCompareFrom && <span className="text-xs font-bold">A</span>}
          {isCompareTo && <span className="text-xs font-bold">B</span>}
        </div>
      )}

      <div className="flex-1 min-w-0 ml-8">
        <div className="flex items-center gap-2">
          {isCurrent ? (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
              Current
            </span>
          ) : version.editReason ? (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
              {version.editReason}
            </span>
          ) : null}
        </div>

        <p className="font-medium text-linear-text mt-1 truncate">
          {version.emoji && <span className="mr-1">{version.emoji}</span>}
          {version.title}
        </p>

        <div className="flex items-center gap-2 mt-1 text-xs text-linear-text-secondary">
          <Clock className="w-3 h-3" />
          <span>{formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}</span>
          {version.editedBy && (
            <>
              <span>•</span>
              <span>by {version.editedBy.name || 'Unknown'}</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}
