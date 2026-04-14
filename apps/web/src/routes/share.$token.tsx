import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Globe, Loader2, Lock, MessageSquare, PencilLine } from 'lucide-react';
import { API_URL } from '~/lib/api';
import { RichTextEditor } from '~/components/rich-text-editor';

interface SharedNoteResponse {
  note: {
    id: string;
    title: string;
    slug: string;
    content: Record<string, unknown> | null;
    emoji: string | null;
    coverImage: string | null;
    publicAccess: 'PRIVATE' | 'READONLY' | 'COMMENT' | 'EDIT';
    createdAt: string;
    updatedAt: string;
    creator: {
      id: string;
      name: string | null;
      image: string | null;
    } | null;
  };
  accessLevel: 'PRIVATE' | 'READONLY' | 'COMMENT' | 'EDIT';
}

const accessMeta = {
  READONLY: {
    label: 'View only',
    description: 'Anyone with this link can read the note.',
    icon: Lock,
  },
  COMMENT: {
    label: 'Comments enabled',
    description: 'Anyone with this link can read and comment.',
    icon: MessageSquare,
  },
  EDIT: {
    label: 'Editable',
    description: 'Anyone with this link can read and edit.',
    icon: PencilLine,
  },
  PRIVATE: {
    label: 'Private',
    description: 'This note is not shared publicly.',
    icon: Lock,
  },
} as const;

export default function ShareTokenRoute() {
  const { token } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-note', token],
    enabled: !!token,
    queryFn: async (): Promise<SharedNoteResponse> => {
      const response = await fetch(`${API_URL}/share/${token}`);
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Failed to load shared note');
      }

      return payload as SharedNoteResponse;
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-bg px-5 text-linear-text sm:px-8">
        <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/4 px-5 py-4">
          <Loader2 className="h-5 w-5 animate-spin text-linear-accent" />
          Loading shared note...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-linear-bg px-5 py-16 text-linear-text sm:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/8 bg-white/4 p-8 text-center shadow-2xl shadow-black/30">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/4">
            <Globe className="h-6 w-6 text-linear-accent" />
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white">Shared note unavailable</h1>
          <p className="mt-3 text-sm leading-7 text-linear-text-secondary">{error instanceof Error ? error.message : 'This shared note could not be opened.'}</p>
          <Link to="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-linear-accent hover:text-linear-accent-hover">
            Open Flowpig
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const access = accessMeta[data.accessLevel] || accessMeta.PRIVATE;
  const AccessIcon = access.icon;

  return (
    <div className="min-h-screen bg-linear-bg px-5 py-10 text-linear-text sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-white/8 bg-white/4 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
          {data.note.coverImage ? (
            <img src={data.note.coverImage} alt="" className="mb-6 h-56 w-full rounded-xl object-cover" />
          ) : null}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-linear-accent">
                <Globe className="h-3.5 w-3.5" />
                Shared note
              </div>
              <div className="mt-5 flex items-start gap-4">
                <span className="text-4xl">{data.note.emoji || '📄'}</span>
                <div className="min-w-0">
                  <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{data.note.title}</h1>
                  <p className="mt-3 text-sm leading-7 text-linear-text-secondary">
                    Shared by {data.note.creator?.name || 'Flowpig'} · Updated {new Date(data.note.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-linear-text-secondary">
              <div className="flex items-center gap-2 font-medium text-white">
                <AccessIcon className="h-4 w-4 text-linear-accent" />
                {access.label}
              </div>
              <div className="mt-2 max-w-60 leading-6">{access.description}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-linear-surface p-6 shadow-xl shadow-black/20 sm:p-8">
          {data.note.content ? (
            <RichTextEditor content={data.note.content} onChange={() => {}} editable={false} />
          ) : (
            <p className="text-sm italic text-linear-text-secondary">This note does not have any content yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}