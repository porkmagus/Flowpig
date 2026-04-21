import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '~/lib/api';
import { Select } from '~/components/ui/select';
import { Skeleton, SkeletonCard } from '~/components/ui/skeleton';
import { useToast } from '~/components/ui/toast';
import { AnimatedList, AnimatedItem, AnimatedCard } from '@flowpigdev/ui';
import { CreateNoteModal, useCreateNoteModal } from '~/components/create-note-modal';
import { 
  FileText,
  Search,
  Plus,
  Archive,
  ArrowUpDown,
  MessageSquare,
  Trash2,
  ChevronRight,
} from 'lucide-react';

interface Note {
  id: string;
  title: string;
  slug: string;
  emoji: string | null;
  coverImage: string | null;
  isArchived: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    name: string | null;
    image: string | null;
  };
  lastEditor: {
    id: string;
    name: string | null;
    image: string | null;
  };
  childCount: number;
  commentCount: number;
}

type SortField = 'updatedAt' | 'createdAt' | 'title';
type SortDir = 'asc' | 'desc';

export default function NotesListRoute() {
  const { workspace } = useParams();
  const createNoteModal = useCreateNoteModal();
  const { success, error: showError } = useToast();

  useEffect(() => {
    const handler = () => createNoteModal.open();
    window.addEventListener('open-create-note', handler);
    return () => window.removeEventListener('open-create-note', handler);
  }, [createNoteModal]);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const { data, isLoading } = useQuery({
    queryKey: ['notes', workspace, search, showArchived],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (showArchived) params.set('archived', 'true');
      
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/notes?${params.toString()}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to load notes');
      return response.json();
    },
  });

  const notes: Note[] = data?.notes || [];

  const sortedNotes = [...notes].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'title') {
      cmp = a.title.localeCompare(b.title);
    } else if (sortField === 'createdAt') {
      cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else {
      cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-linear-text">Notes</h1>
          <p className="text-linear-text-secondary mt-1">
            {notes.length} {notes.length === 1 ? 'note' : 'notes'}
            {showArchived && ' (archived)'}
          </p>
        </div>
        <button 
          onClick={() => createNoteModal.open()}
          className="flex items-center gap-2 bg-linear-accent hover:bg-linear-accent/80 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Note
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-linear-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="w-full pl-10 pr-4 py-2 bg-linear-elevated border border-linear-border rounded-lg text-linear-text placeholder:text-linear-text-tertiary focus:ring-2 focus:ring-linear-accent/40 focus:border-linear-accent/50 focus:outline-none transition"
          />
        </div>

        <button
          onClick={() => setShowArchived((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
            showArchived
              ? 'border-linear-accent bg-linear-accent-light text-linear-accent'
              : 'border-linear-border bg-linear-surface text-linear-text-secondary hover:text-linear-text'
          }`}
        >
          <Archive className="w-4 h-4" />
          Archived
        </button>

        <div className="flex items-center gap-1 bg-linear-surface rounded-lg border border-linear-border">
          <Select
            value={sortField}
            onChange={(v) => setSortField(v as SortField)}
            options={[
              { value: 'updatedAt', label: 'Updated' },
              { value: 'createdAt', label: 'Created' },
              { value: 'title', label: 'Title' },
            ]}
            size="sm"
          />
          <button
            onClick={() => setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            className="px-2 py-2 text-linear-text-secondary hover:text-linear-text"
            title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Notes Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : sortedNotes.length === 0 ? (
        <div className="text-center py-16 bg-linear-surface rounded-xl border border-linear-border">
          <FileText className="w-12 h-12 text-linear-text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-linear-text mb-2">
            {showArchived ? 'No archived notes' : 'No notes yet'}
          </h3>
          <p className="text-linear-text-secondary mb-4">
            {showArchived ? 'Archived notes will appear here' : 'Create your first note to get started'}
          </p>
          {!showArchived && (
            <button
              onClick={() => createNoteModal.open()}
              className="text-linear-accent hover:text-linear-accent font-medium"
            >
              Create note
            </button>
          )}
        </div>
      ) : (
        <AnimatedList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedNotes.map((note) => (
            <AnimatedItem key={note.id}>
              <Link to={`/${workspace}/notes/${note.slug}`}>
                <AnimatedCard className="bg-linear-surface p-5 rounded-xl border border-linear-border hover:border-linear-border-hover hover:shadow-md hover:shadow-black/20 transition-all h-full">
                  {/* Emoji/Icon */}
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-3xl">{note.emoji || '📄'}</span>
                    {note.commentCount > 0 && (
                      <span className="flex items-center gap-1 text-sm text-linear-text-secondary">
                        <MessageSquare className="w-3 h-3" />
                        {note.commentCount}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <div className="flex items-start gap-2 mb-2">
                    <h3 className="font-semibold text-linear-text line-clamp-2 flex-1">{note.title}</h3>
                    {note.isArchived && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-linear-text-tertiary/10 text-linear-text-tertiary">
                        Archived
                      </span>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-2 text-sm text-linear-text-secondary mt-4">
                    <span>Edited {new Date(note.updatedAt).toLocaleDateString()}</span>
                    {note.childCount > 0 && (
                      <>
                        <span>•</span>
                        <span>{note.childCount} subpage{note.childCount !== 1 ? 's' : ''}</span>
                      </>
                    )}
                  </div>

                  {/* Author */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-linear-border">
                    <div className="w-6 h-6 bg-linear-elevated rounded-full flex items-center justify-center text-xs text-linear-text-secondary">
                      {(note.lastEditor.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-linear-text-secondary">
                      {note.lastEditor.name || 'Unknown'}
                    </span>
                  </div>
                </AnimatedCard>
              </Link>
            </AnimatedItem>
          ))}
        </AnimatedList>
      )}

      <CreateNoteModal
        isOpen={createNoteModal.isOpen}
        onClose={createNoteModal.close}
      />
    </div>
  );
}
