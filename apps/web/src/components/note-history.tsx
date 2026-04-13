import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History, 
  X, 
  Clock, 
  User, 
  RotateCcw,
  Check,
  ChevronRight,
  FileText
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface NoteVersion {
  id: string;
  version: number;
  createdAt: string;
  createdBy?: {
    id: string;
    name: string | null;
    image: string | null;
  };
  isCurrent: boolean;
  snapshot?: {
    title: string;
    content: Record<string, unknown>;
    emoji: string | null;
  } | null;
  changeDescription?: string;
}

interface NoteHistoryProps {
  workspaceId: string;
  noteId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function NoteHistory({ workspaceId, noteId, isOpen, onClose }: NoteHistoryProps) {
  const queryClient = useQueryClient();
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  const { data: historyData, isLoading } = useQuery({
    queryKey: ['note-history', workspaceId, noteId],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/workspaces/${workspaceId}/history/notes/${noteId}/history`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error('Failed to fetch history');
      return res.json();
    },
    enabled: isOpen,
  });

  const restoreMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const res = await fetch(
        `${API_URL}/workspaces/${workspaceId}/history/notes/${noteId}/history/${versionId}/restore`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
      if (!res.ok) throw new Error('Failed to restore');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', workspaceId, noteId] });
      queryClient.invalidateQueries({ queryKey: ['note-history', workspaceId, noteId] });
      onClose();
    },
  });

  const versions: NoteVersion[] = historyData?.versions || [];

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <History className="w-5 h-5 text-gray-500" />
                Version History
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No history available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {versions.map((version, index) => (
                    <motion.div
                      key={version.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedVersion === version.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedVersion(
                        selectedVersion === version.id ? null : version.id
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {version.isCurrent ? (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                                Current
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                                v{version.version}
                              </span>
                            )}
                            {version.changeDescription && (
                              <span className="text-xs text-gray-500 truncate">
                                {version.changeDescription}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock className="w-3 h-3" />
                            {formatDate(version.createdAt)}
                          </div>
                          {version.createdBy && (
                            <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                              <User className="w-3 h-3" />
                              <span>{version.createdBy.name || 'Unknown'}</span>
                            </div>
                          )}
                        </div>
                        {!version.isCurrent && selectedVersion === version.id && (
                          <motion.button
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              restoreMutation.mutate(version.id);
                            }}
                            disabled={restoreMutation.isPending}
                            className="ml-2 px-3 py-1.5 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Restore
                          </motion.button>
                        )}
                      </div>

                      {/* Preview */}
                      {selectedVersion === version.id && version.snapshot && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="mt-3 pt-3 border-t border-gray-200"
                        >
                          <div className="bg-gray-50 rounded p-3">
                            <p className="text-sm font-medium text-gray-900">
                              {version.snapshot.emoji} {version.snapshot.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Content snapshot available
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
