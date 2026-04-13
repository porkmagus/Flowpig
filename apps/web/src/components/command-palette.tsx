import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, CircleDot, Users, X, Loader2 } from 'lucide-react';
import { API_URL } from '~/lib/api';
import { useDebounce } from '~/hooks/use-debounce';

interface SearchResult {
  type: 'issue' | 'note' | 'user';
  id: string;
  title: string;
  subtitle: string;
  url: string;
  meta: Record<string, any>;
}

interface CommandPaletteProps {
  workspaceId: string;
  workspaceSlug: string;
}

export function CommandPalette({ workspaceId, workspaceSlug }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const debouncedQuery = useDebounce(query, 200);

  // Search API
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    fetch(
      `${API_URL}/search/workspace/${workspaceId}?q=${encodeURIComponent(debouncedQuery)}`,
      { credentials: 'include' }
    )
      .then(res => res.json())
      .then(data => {
        setResults(data.results || []);
        setSelectedIndex(0);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [debouncedQuery, workspaceId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CMD+K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }

      // Escape to close
      if (e.key === 'Escape') {
        setIsOpen(false);
      }

      if (!isOpen) return;

      // Arrow navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      }

      // Enter to select
      if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        navigate(results[selectedIndex].url);
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, navigate]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'issue':
        return <CircleDot className="w-4 h-4" />;
      case 'note':
        return <FileText className="w-4 h-4" />;
      case 'user':
        return <Users className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'issue':
        return 'bg-red-100 text-red-600';
      case 'note':
        return 'bg-blue-100 text-blue-600';
      case 'user':
        return 'bg-green-100 text-green-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600 transition-colors"
      >
        <Search className="w-4 h-4" />
        <span>Search...</span>
        <kbd className="px-1.5 py-0.5 bg-white rounded text-xs border border-gray-200">
          ⌘K
        </kbd>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setIsOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              {/* Search input */}
              <div className="flex items-center gap-3 p-4 border-b border-gray-100">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search issues, notes, and people..."
                  className="flex-1 text-lg outline-none placeholder:text-gray-400"
                  autoFocus
                />
                {isLoading && <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Results */}
              <div className="max-h-96 overflow-y-auto">
                {query.length < 2 ? (
                  <div className="p-8 text-center text-gray-500">
                    <p>Type at least 2 characters to search</p>
                  </div>
                ) : results.length === 0 && !isLoading ? (
                  <div className="p-8 text-center text-gray-500">
                    <p>No results found for &quot;{query}&quot;</p>
                  </div>
                ) : (
                  <div className="py-2">
                    {results.map((result, index) => (
                      <motion.button
                        key={result.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => {
                          navigate(result.url);
                          setIsOpen(false);
                        }}
                        className={`
                          w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                          ${index === selectedIndex ? 'bg-gray-100' : 'hover:bg-gray-50'}
                        `}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        <div className={`p-2 rounded-lg ${getTypeColor(result.type)}`}>
                          {getIcon(result.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {result.title}
                          </p>
                          <p className="text-sm text-gray-500">
                            {result.type === 'issue' && result.meta.identifier}
                            {result.type === 'note' && result.meta.creator?.name}
                            {result.type === 'user' && result.meta.role}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 capitalize">
                          {result.type}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 text-xs text-gray-500 border-t border-gray-100">
                <div className="flex items-center gap-4">
                  <span>↑↓ Navigate</span>
                  <span>↵ Select</span>
                  <span>esc Close</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
