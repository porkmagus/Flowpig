import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { API_URL } from '~/lib/api';
import { Command } from 'cmdk';
import { 
  Search, 
  FileText, 
  CircleDot, 
  RotateCcw, 
  Settings,
  Command as CommandIcon,
  Hash,
  User,
  Bell,
  Plus,
  BarChart3,
  Map,
  FolderKanban,
  Target,
  Database,
  Users,
  Filter,
  Inbox,
  Layout,
  Moon,
  Sun,
  LogOut,
  ExternalLink,
  ChevronRight,
  Keyboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommandPaletteProps {
  workspaceId: string;
  workspaceSlug: string;
}

interface SearchResult {
  id: string;
  type: 'issue' | 'note' | 'cycle' | 'project' | 'page';
  title: string;
  subtitle?: string;
  icon?: string;
  url: string;
}

// Define keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  // Navigation
  'go_to_home': { key: 'g h', label: 'Go to Home', category: 'Navigation' },
  'go_to_issues': { key: 'g i', label: 'Go to Issues', category: 'Navigation' },
  'go_to_my_issues': { key: 'g m', label: 'Go to My Issues', category: 'Navigation' },
  'go_to_inbox': { key: 'g n', label: 'Go to Inbox', category: 'Navigation' },
  'go_to_cycles': { key: 'g c', label: 'Go to Cycles', category: 'Navigation' },
  'go_to_notes': { key: 'g p', label: 'Go to Pages', category: 'Navigation' },
  'go_to_analytics': { key: 'g a', label: 'Go to Analytics', category: 'Navigation' },
  'go_to_settings': { key: 'g s', label: 'Go to Settings', category: 'Navigation' },
  
  // Actions
  'create_issue': { key: 'c i', label: 'Create Issue', category: 'Actions' },
  'create_note': { key: 'c p', label: 'Create Page', category: 'Actions' },
  'command_palette': { key: 'cmd+k', label: 'Open Command Palette', category: 'Actions' },
  'search': { key: 'cmd+shift+k', label: 'Quick Search', category: 'Actions' },
  'keyboard_shortcuts': { key: '?', label: 'Show Keyboard Shortcuts', category: 'Actions' },
  
  // Issue Actions
  'save_issue': { key: 'cmd+s', label: 'Save Issue', category: 'Issue' },
  'archive_issue': { key: 'cmd+shift+a', label: 'Archive Issue', category: 'Issue' },
  'delete_issue': { key: 'cmd+shift+d', label: 'Delete Issue', category: 'Issue' },
  'assign_to_me': { key: 'cmd+i', label: 'Assign to Me', category: 'Issue' },
  
  // Navigation within pages
  'go_back': { key: 'cmd+[', label: 'Go Back', category: 'Navigation' },
  'go_forward': { key: 'cmd+]', label: 'Go Forward', category: 'Navigation' },
};

export function CommandPalette({ workspaceId, workspaceSlug }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { workspace } = useParams();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pages, setPages] = useState<string[]>([]);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch search results
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['search', search],
    queryFn: async (): Promise<SearchResult[]> => {
      if (!search || search.length < 2) return [];
      const response = await fetch(
        `${API_URL}/search?q=${encodeURIComponent(search)}&workspaceId=${workspaceId}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to search');
      return response.json();
    },
    enabled: search.length >= 2,
  });

  // Toggle menu
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Command palette toggle
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      
      // Keyboard shortcuts modal
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !open) {
        e.preventDefault();
        setShowShortcuts(true);
      }

      // Navigation shortcuts
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
        // Wait for second key
        const handler = (ev: KeyboardEvent) => {
          if (ev.key === 'h') navigate(`/${workspaceSlug}`);
          if (ev.key === 'i') navigate(`/${workspaceSlug}/issues`);
          if (ev.key === 'm') navigate(`/${workspaceSlug}/my-issues`);
          if (ev.key === 'n') navigate(`/${workspaceSlug}/inbox`);
          if (ev.key === 'c') navigate(`/${workspaceSlug}/cycles`);
          if (ev.key === 'p') navigate(`/${workspaceSlug}/notes`);
          if (ev.key === 'a') navigate(`/${workspaceSlug}/analytics`);
          if (ev.key === 's') navigate(`/${workspaceSlug}/settings`);
          window.removeEventListener('keydown', handler);
        };
        window.addEventListener('keydown', handler, { once: true });
        setTimeout(() => window.removeEventListener('keydown', handler), 500);
      }

      // Create shortcuts
      if (e.key === 'c' && !e.metaKey && !e.ctrlKey && !open) {
        const handler = (ev: KeyboardEvent) => {
          if (ev.key === 'i') {
            // Open create issue modal or navigate to new issue
            navigate(`/${workspaceSlug}/issues`);
          }
          if (ev.key === 'p') {
            navigate(`/${workspaceSlug}/notes`);
          }
          window.removeEventListener('keydown', handler);
        };
        window.addEventListener('keydown', handler, { once: true });
        setTimeout(() => window.removeEventListener('keydown', handler), 500);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [navigate, workspaceSlug, open]);

  const navigateTo = (url: string) => {
    navigate(url);
    setOpen(false);
    setSearch('');
  };

  const goToPage = (page: string) => {
    setPages([...pages, page]);
  };

  const Icon = ({ type }: { type: string }) => {
    switch (type) {
      case 'issue': return <CircleDot className="w-4 h-4 text-red-500" />;
      case 'note': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'cycle': return <RotateCcw className="w-4 h-4 text-purple-500" />;
      case 'project': return <FolderKanban className="w-4 h-4 text-green-500" />;
      default: return <Hash className="w-4 h-4 text-linear-text-tertiary" />;
    }
  };

  return (
    <>
      {/* Command Palette Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-linear-elevated hover:bg-linear-border rounded-lg text-sm text-linear-text-secondary transition-colors"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 bg-linear-surface border border-linear-border rounded text-xs text-linear-text-tertiary">
          <CommandIcon className="w-3 h-3" />
          K
        </kbd>
      </button>

      {/* Command Palette Modal */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50"
            >
              <Command
                label="Command Palette"
                className="bg-linear-surface rounded-xl shadow-2xl shadow-black/40 border border-linear-border overflow-hidden"
              >
                <div className="flex items-center gap-3 px-4 py-3 border-b border-linear-border">
                  <Search className="w-5 h-5 text-linear-text-tertiary" />
                  <Command.Input
                    ref={inputRef}
                    value={search}
                    onValueChange={setSearch}
                    placeholder="Search or jump to..."
                    className="flex-1 bg-transparent outline-none text-linear-text placeholder:text-linear-text-tertiary"
                  />
                  <kbd className="px-2 py-1 bg-linear-elevated rounded text-xs text-linear-text-tertiary">
                    ESC to close
                  </kbd>
                </div>

                <Command.List className="max-h-100 overflow-y-auto p-2">
                  {!search && (
                    <>
                      <Command.Group heading="Navigation" className="text-xs text-linear-text-tertiary font-medium px-2 py-2">
                        <Command.Item
                          onSelect={() => navigateTo(`/${workspaceSlug}`)}
                          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-linear-elevated cursor-pointer text-linear-text"
                        >
                          <Layout className="w-4 h-4" />
                          <span>Home</span>
                        </Command.Item>
                        <Command.Item
                          onSelect={() => navigateTo(`/${workspaceSlug}/my-issues`)}
                          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-linear-elevated cursor-pointer text-linear-text"
                        >
                          <User className="w-4 h-4" />
                          <span>My Issues</span>
                        </Command.Item>
                        <Command.Item
                          onSelect={() => navigateTo(`/${workspaceSlug}/inbox`)}
                          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-linear-elevated cursor-pointer text-linear-text"
                        >
                          <Inbox className="w-4 h-4" />
                          <span>Inbox</span>
                        </Command.Item>
                        <Command.Item
                          onSelect={() => navigateTo(`/${workspaceSlug}/issues`)}
                          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-linear-elevated cursor-pointer text-linear-text"
                        >
                          <CircleDot className="w-4 h-4" />
                          <span>Issues</span>
                        </Command.Item>
                        <Command.Item
                          onSelect={() => navigateTo(`/${workspaceSlug}/cycles`)}
                          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-linear-elevated cursor-pointer text-linear-text"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Cycles</span>
                        </Command.Item>
                        <Command.Item
                          onSelect={() => navigateTo(`/${workspaceSlug}/notes`)}
                          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-linear-elevated cursor-pointer text-linear-text"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Pages</span>
                        </Command.Item>
                        <Command.Item
                          onSelect={() => navigateTo(`/${workspaceSlug}/analytics`)}
                          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-linear-elevated cursor-pointer text-linear-text"
                        >
                          <BarChart3 className="w-4 h-4" />
                          <span>Analytics</span>
                        </Command.Item>
                      </Command.Group>

                      <Command.Group heading="Create New" className="text-xs text-linear-text-tertiary font-medium px-2 py-2">
                        <Command.Item
                          onSelect={() => navigateTo(`/${workspaceSlug}/issues`)}
                          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-linear-elevated cursor-pointer text-linear-text"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Create Issue</span>
                          <kbd className="ml-auto px-1.5 py-0.5 bg-linear-elevated rounded text-xs text-linear-text-secondary">C I</kbd>
                        </Command.Item>
                        <Command.Item
                          onSelect={() => navigateTo(`/${workspaceSlug}/notes`)}
                          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-linear-elevated cursor-pointer text-linear-text"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Create Page</span>
                          <kbd className="ml-auto px-1.5 py-0.5 bg-linear-elevated rounded text-xs text-linear-text-secondary">C P</kbd>
                        </Command.Item>
                      </Command.Group>

                      <Command.Group heading="Help" className="text-xs text-linear-text-tertiary font-medium px-2 py-2">
                        <Command.Item
                          onSelect={() => {
                            setOpen(false);
                            setShowShortcuts(true);
                          }}
                          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-linear-elevated cursor-pointer text-linear-text"
                        >
                          <Keyboard className="w-4 h-4" />
                          <span>Keyboard Shortcuts</span>
                          <kbd className="ml-auto px-1.5 py-0.5 bg-linear-elevated rounded text-xs text-linear-text-secondary">?</kbd>
                        </Command.Item>
                      </Command.Group>
                    </>
                  )}

                  {search.length >= 2 && (
                    <Command.Group heading="Search Results" className="text-xs text-linear-text-tertiary font-medium px-2 py-2">
                      {isLoading ? (
                        <div className="py-4 text-center text-linear-text-secondary">Searching...</div>
                      ) : searchResults?.length === 0 ? (
                        <div className="py-4 text-center text-linear-text-secondary">No results found</div>
                      ) : (
                        searchResults?.map((result) => (
                          <Command.Item
                            key={result.id}
                            onSelect={() => navigateTo(result.url)}
                            className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-linear-elevated cursor-pointer text-linear-text"
                          >
                            <Icon type={result.type} />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{result.title}</div>
                              {result.subtitle && (
                                <div className="text-xs text-linear-text-tertiary truncate">{result.subtitle}</div>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-linear-text-tertiary" />
                          </Command.Item>
                        ))
                      )}
                    </Command.Group>
                  )}
                </Command.List>

                <div className="flex items-center gap-4 px-4 py-2 bg-linear-elevated/40 border-t border-linear-border text-xs text-linear-text-tertiary">
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-linear-surface border border-linear-border rounded">↑↓</kbd>
                    <span>to navigate</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-linear-surface border border-linear-border rounded">↵</kbd>
                    <span>to select</span>
                  </div>
                </div>
              </Command>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts Modal */}
      <AnimatePresence>
        {showShortcuts && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowShortcuts(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 m-auto w-full max-w-2xl h-fit max-h-[80vh] bg-linear-surface rounded-xl shadow-2xl shadow-black/40 border border-linear-border z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-linear-border">
                <div className="flex items-center gap-3">
                  <Keyboard className="w-5 h-5 text-linear-text-secondary" />
                  <h2 className="text-lg font-semibold text-linear-text">Keyboard Shortcuts</h2>
                </div>
                <button
                  onClick={() => setShowShortcuts(false)}
                  className="p-2 hover:bg-linear-elevated rounded-lg transition-colors"
                >
                  <span className="text-linear-text-tertiary">×</span>
                </button>
              </div>

              <div className="overflow-y-auto p-6 max-h-[60vh]">
                {/* Group shortcuts by category */}
                {['Navigation', 'Actions', 'Issue'].map((category) => (
                  <div key={category} className="mb-6">
                    <h3 className="text-sm font-semibold text-linear-text uppercase tracking-wider mb-3">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(KEYBOARD_SHORTCUTS)
                        .filter(([_, shortcut]) => shortcut.category === category)
                        .map(([key, shortcut]) => (
                          <div
                            key={key}
                            className="flex items-center justify-between py-2 border-b border-linear-border/50 last:border-b-0"
                          >
                            <span className="text-linear-text">{shortcut.label}</span>
                            <kbd className="px-2 py-1 bg-linear-elevated border border-linear-border rounded text-sm font-mono text-linear-text-secondary">
                              {shortcut.key.replace('cmd', '⌘').replace('shift', '⇧')}
                            </kbd>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-6 py-4 bg-linear-elevated/40 border-t border-linear-border">
                <p className="text-sm text-linear-text-secondary">
                  Press <kbd className="px-1.5 py-0.5 bg-linear-surface border border-linear-border rounded text-xs">?</kbd> anywhere to show this help
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
