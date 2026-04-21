import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '~/lib/api';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Select } from '~/components/ui/select';
import { X, Loader2, FileText } from 'lucide-react';

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentId?: string;
}

const EMOJI_OPTIONS = ['📄', '📋', '📝', '📊', '📁', '🔗', '💡', '📌', '🔖', '🗂️', '📑', '📂'];

export function CreateNoteModal({ isOpen, onClose, parentId }: CreateNoteModalProps) {
  const { workspace } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('📄');
  const [selectedParentId, setSelectedParentId] = useState(parentId || '');

  const { data: notesData } = useQuery({
    queryKey: ['notes', workspace],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/notes`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch notes');
      const payload = await response.json() as { notes: Array<{ id: string; title: string; emoji: string | null }> };
      return payload.notes || [];
    },
    enabled: isOpen && !!workspace,
  });

  const { data: templatesData } = useQuery({
    queryKey: ['templates', workspace, 'NOTE'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/templates?type=NOTE`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch templates');
      const payload = await response.json() as { templates: Array<{ id: string; name: string; description: string | null; content: any; icon: string | null }> };
      return payload.templates || [];
    },
    enabled: isOpen && !!workspace,
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async (payload: { title: string; emoji: string; parentId?: string }) => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to create note');
      return response.json() as Promise<{ note: { id: string; slug: string } }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notes', workspace] });
      queryClient.invalidateQueries({ queryKey: ['note-tree', workspace] });
      onClose();
      setTitle('');
      setEmoji('📄');
      setSelectedParentId('');
      navigate(`/${workspace}/notes/${data.note.slug}`);
    },
  });

  const applyTemplate = (templateId: string) => {
    const template = templatesData?.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplateId(templateId);
      if (template.icon) setEmoji(template.icon);
      if (template.content?.title) setTitle(template.content.title);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const template = templatesData?.find((t) => t.id === selectedTemplateId);
    createMutation.mutate({
      title: title.trim(),
      emoji,
      ...(template?.content ? { content: template.content } : {}),
      ...(selectedParentId ? { parentId: selectedParentId } : {}),
    });
  };

  const handleClose = () => {
    if (createMutation.isPending) return;
    onClose();
    setTitle('');
    setEmoji('📄');
    setSelectedParentId('');
    setSelectedTemplateId(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-linear-border bg-linear-elevated p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-linear-accent" />
                <h2 className="text-lg font-semibold text-linear-text">Create Note</h2>
              </div>
              <button
                onClick={handleClose}
                className="text-linear-text-secondary hover:text-linear-text transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Emoji selector */}
              <div>
                <label className="block text-xs font-medium text-linear-text-secondary mb-1.5">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEmoji(e)}
                      className={`text-xl w-9 h-9 rounded-lg border transition-colors ${
                        emoji === e
                          ? 'border-linear-accent bg-linear-accent-light'
                          : 'border-linear-border hover:border-linear-accent/50'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-linear-text-secondary mb-1.5">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Note title..."
                  autoFocus
                  className="w-full"
                />
              </div>

              {/* Templates */}
              {templatesData && templatesData.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-linear-text-secondary mb-1.5">Template (optional)</label>
                  <div className="flex flex-wrap gap-2">
                    {templatesData.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => applyTemplate(template.id)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                          selectedTemplateId === template.id
                            ? 'border-linear-accent bg-linear-accent-light text-linear-accent'
                            : 'border-linear-border bg-linear-surface text-linear-text-secondary hover:text-linear-text'
                        }`}
                      >
                        {template.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Parent note selector */}
              <div>
                <label className="block text-xs font-medium text-linear-text-secondary mb-1.5">Parent (optional)</label>
                <Select
                  value={selectedParentId}
                  onChange={(v) => setSelectedParentId(v)}
                  options={[
                    { value: '', label: 'No parent (top-level)' },
                    ...(notesData?.map((note) => ({ value: note.id, label: `${note.emoji || '📄'} ${note.title}` })) || []),
                  ]}
                  className="w-full"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!title.trim() || createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Create'
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function useCreateNoteModal() {
  const [isOpen, setIsOpen] = useState(false);
  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
}
