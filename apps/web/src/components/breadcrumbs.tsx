import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { API_URL } from '~/lib/api';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  id: string;
  title: string;
  slug: string;
  emoji: string | null;
}

interface BreadcrumbsProps {
  noteId: string;
  currentTitle?: string;
}

export function Breadcrumbs({ noteId, currentTitle }: BreadcrumbsProps) {
  const { workspace } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ['breadcrumbs', noteId],
    queryFn: async (): Promise<{ breadcrumbs: BreadcrumbItem[] }> => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/notes/${noteId}/breadcrumbs`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to load breadcrumbs');
      return response.json();
    },
    enabled: !!noteId,
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-1 text-sm text-linear-text-tertiary">
        <div className="h-4 w-16 bg-linear-elevated rounded animate-pulse" />
        <ChevronRight className="w-4 h-4" />
        <div className="h-4 w-24 bg-linear-elevated rounded animate-pulse" />
      </div>
    );
  }

  const breadcrumbs = data.breadcrumbs;

  if (breadcrumbs.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-linear-text-secondary">
        <Home className="w-4 h-4" />
        <span>Pages</span>
        {currentTitle && (
          <>
            <ChevronRight className="w-4 h-4" />
            <span className="text-linear-text font-medium">{currentTitle}</span>
          </>
        )}
      </div>
    );
  }

  return (
    <nav className="flex items-center gap-1 text-sm">
      <Link
        to={`/${workspace}/notes`}
        className="flex items-center gap-1.5 text-linear-text-secondary hover:text-linear-text-secondary transition-colors"
      >
        <Home className="w-4 h-4" />
        <span className="hidden sm:inline">Pages</span>
      </Link>

      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.id} className="flex items-center gap-1">
          <ChevronRight className="w-4 h-4 text-linear-text-tertiary" />
          <Link
            to={`/${workspace}/notes/${crumb.slug}`}
            className={`
              flex items-center gap-1.5 transition-colors
              ${index === breadcrumbs.length - 1 && !currentTitle
                ? 'text-linear-text font-medium' 
                : 'text-linear-text-secondary hover:text-linear-text-secondary'
              }
            `}
            title={crumb.title}
          >
            {crumb.emoji && <span>{crumb.emoji}</span>}
            <span className="max-w-[120px] truncate">{crumb.title || 'Untitled'}</span>
          </Link>
        </div>
      ))}

      {currentTitle && (
        <>
          <ChevronRight className="w-4 h-4 text-linear-text-tertiary" />
          <span className="text-linear-text font-medium flex items-center gap-1.5">
            {currentTitle}
          </span>
        </>
      )}
    </nav>
  );
}
