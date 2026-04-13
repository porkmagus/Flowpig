import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { API_URL } from '~/lib/api';
import { AnimatedList, AnimatedItem, AnimatedCard } from '@flowpigdev/ui';
import { 
  FileText,
  Search,
  Plus,
  ArrowRight,
  MessageSquare,
  ChevronRight,
  MoreHorizontal,
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

export default function NotesListRoute() {
  const { workspace } = useParams();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['notes', workspace, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/notes?${params.toString()}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to load notes');
      return response.json();
    },
  });

  const notes: Note[] = data?.notes || [];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-linear-text">Notes</h1>
          <p className="text-linear-text-secondary mt-1">
            {notes.length} {notes.length === 1 ? 'note' : 'notes'}
          </p>
        </div>
        <button className="flex items-center gap-2 bg-linear-accent hover:bg-linear-accent/80 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          <Plus className="w-4 h-4" />
          New Note
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4 mb-6">
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
      </div>

      {/* Notes Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-linear-accent/30 border-t-linear-accent rounded-full animate-spin" />
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-16 bg-linear-surface rounded-xl border border-linear-border">
          <FileText className="w-12 h-12 text-linear-text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-linear-text mb-2">No notes yet</h3>
          <p className="text-linear-text-secondary mb-4">Create your first note to get started</p>
          <button className="text-linear-accent hover:text-linear-accent font-medium">
            Create note
          </button>
        </div>
      ) : (
        <AnimatedList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => (
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
                  <h3 className="font-semibold text-linear-text mb-2 line-clamp-2">{note.title}</h3>

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
    </div>
  );
}
