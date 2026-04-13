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
      <div className="flex items-center gap-1 text-sm text-gray-400">
        <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
        <ChevronRight className="w-4 h-4" />
        <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  const breadcrumbs = data.breadcrumbs;

  if (breadcrumbs.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Home className="w-4 h-4" />
        <span>Pages</span>
        {currentTitle && (
          <>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 font-medium">{currentTitle}</span>
          </>
        )}
      </div>
    );
  }

  return (
    <nav className="flex items-center gap-1 text-sm">
      <Link
        to={`/${workspace}/notes`}
        className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors"
      >
        <Home className="w-4 h-4" />
        <span className="hidden sm:inline">Pages</span>
      </Link>

      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.id} className="flex items-center gap-1">
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Link
            to={`/${workspace}/notes/${crumb.slug}`}
            className={`
              flex items-center gap-1.5 transition-colors
              ${index === breadcrumbs.length - 1 && !currentTitle
                ? 'text-gray-900 font-medium' 
                : 'text-gray-500 hover:text-gray-700'
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
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900 font-medium flex items-center gap-1.5">
            {currentTitle}
          </span>
        </>
      )}
    </nav>
  );
}
