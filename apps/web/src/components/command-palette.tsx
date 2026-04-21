import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  FileText, 
  CircleDot, 
  Home, 
  Settings, 
  Users, 
  GitBranch,
  BarChart3,
  Calendar,
  Inbox,
  Plus,
  ArrowRight,
  Command as CommandIcon,
  Keyboard,
  Moon,
  Sun,
  LogOut,
  FolderKanban,
  Target,
  RotateCcw,
  Filter,
  Map,
  UserCircle,
  Database,
  Layers,
  Sparkles,
  Clock,
  Star,
  Pin,
  Archive,
  Trash2,
  Eye,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { API_URL } from '~/lib/api';
import { useAuth } from '~/lib/auth-client';
import { Button } from '~/components/ui/button';

interface CommandPaletteProps {
  workspaceId: string;
  workspaceSlug: string;
}



interface KeyboardShortcut {
  key: string;
  label: string;
  category: string;
}

const GLOBAL_SHORTCUTS: KeyboardShortcut[] = [
  // Navigation
  { key: '⌘ K', label: 'Command palette', category: 'Navigation' },
  { key: 'G', label: 'Go to...', category: 'Navigation' },
  { key: 'G H', label: 'Home', category: 'Navigation' },
  { key: 'G M', label: 'My Issues', category: 'Navigation' },
  { key: 'G I', label: 'Inbox', category: 'Navigation' },
  { key: 'G S', label: 'Issues', category: 'Navigation' },
  { key: 'G C', label: 'Cycles', category: 'Navigation' },
  { key: 'G T', label: 'Triage', category: 'Navigation' },
  { key: 'G R', label: 'Roadmap', category: 'Navigation' },
  { key: 'G P', label: 'Projects', category: 'Navigation' },
  { key: 'G A', label: 'Analytics', category: 'Navigation' },
  { key: 'G N', label: 'Notes', category: 'Navigation' },
  { key: 'G D', label: 'Databases', category: 'Navigation' },
  { key: 'G E', label: 'Team', category: 'Navigation' },
  { key: 'G ,', label: 'Settings', category: 'Navigation' },
  // Actions
  { key: 'C', label: 'Create issue', category: 'Actions' },
  { key: '⌘ /', label: 'Keyboard shortcuts', category: 'Actions' },
  { key: 'Esc', label: 'Close / Back', category: 'Actions' },
  // Issues
  { key: '⌘ Enter', label: 'Save issue title edit', category: 'Issues' },
  { key: '⌘ Click', label: 'Select multiple issues', category: 'Issues' },
];

const NAVIGATION_ITEMS = [
  { id: 'home', label: 'Home', icon: Home, url: '', shortcut: 'G H' },
  { id: 'my-issues', label: 'My Issues', icon: UserCircle, url: 'my-issues', shortcut: 'G M' },
  { id: 'inbox', label: 'Inbox', icon: Inbox, url: 'inbox', shortcut: 'G I' },
  { id: 'issues', label: 'Issues', icon: CircleDot, url: 'issues', shortcut: 'G S' },
  { id: 'cycles', label: 'Cycles', icon: RotateCcw, url: 'cycles', shortcut: 'G C' },
  { id: 'triage', label: 'Triage', icon: Filter, url: 'triage', shortcut: 'G T' },
  { id: 'roadmap', label: 'Roadmap', icon: Map, url: 'roadmap', shortcut: 'G R' },
  { id: 'projects', label: 'Projects', icon: FolderKanban, url: 'projects', shortcut: 'G P' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, url: 'analytics', shortcut: 'G A' },
  { id: 'notes', label: 'Notes', icon: FileText, url: 'notes', shortcut: 'G N' },
  { id: 'databases', label: 'Databases', icon: Database, url: 'databases', shortcut: 'G D' },
  { id: 'team', label: 'Team', icon: Users, url: 'team', shortcut: 'G E' },
  { id: 'settings', label: 'Settings', icon: Settings, url: 'settings', shortcut: 'G ,' },
];

const QUICK_ACTIONS = [
  { id: 'new-issue', label: 'Create new issue', icon: Plus, action: 'create-issue', shortcut: 'C' },
  { id: 'new-project', label: 'Create new project', icon: FolderKanban, action: 'create-project' },
  { id: 'new-note', label: 'Create new note', icon: FileText, action: 'create-note' },
  { id: 'new-cycle', label: 'Create new cycle', icon: RotateCcw, action: 'create-cycle' },
];

const VIEW_OPTIONS = [
  { id: 'toggle-theme', label: 'Toggle theme', icon: Moon, action: 'toggle-theme' },
  { id: 'fullscreen', label: 'Toggle fullscreen', icon: ExternalLink, action: 'fullscreen' },
];

export function CommandPalette({ workspaceId, workspaceSlug }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pages, setPages] = useState<string[]>([]);
  const [selectedShortcut, setSelectedShortcut] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const params = useParams();
  const currentWorkspace = params.workspace || workspaceSlug;

  const activePage = pages[pages.length - 1];

  // Fetch search results
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['search', search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];
      const response = await fetch(
        `${API_URL}/search?q=${encodeURIComponent(search)}&workspaceId=${workspaceId}`,
        { credentials: 'include' }
      );
      if (!response.ok) return [];
      return response.json();
    },
    enabled: search.length >= 2 && activePage !== 'shortcuts',
  });

  // Toggle with keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((open) => !open);
      }
      // Cmd/Ctrl + /
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setOpen(true);
        setPages(['shortcuts']);
      }
      // C for create
      if (e.key === 'c' && !e.metaKey && !e.ctrlKey && !open) {
        e.preventDefault();
        setOpen(true);
        setPages(['create']);
      }
      // G for go to
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !open) {
        e.preventDefault();
        setPages(['goto']);
        setOpen(true);
      }
      // Escape
      if (e.key === 'Escape') {
        if (pages.length > 0) {
          e.preventDefault();
          setPages((pages) => pages.slice(0, -1));
        } else if (open) {
          setOpen(false);
        }
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, pages, workspaceId]);

  const handleNavigate = useCallback((url: string) => {
    navigate(`/${currentWorkspace}/${url}`);
    setOpen(false);
    setSearch('');
    setPages([]);
  }, [navigate, currentWorkspace]);

  const handleAction = useCallback((action: string) => {
    switch (action) {
      case 'create-issue':
        // Dispatch custom event for create issue modal
        window.dispatchEvent(new CustomEvent('open-create-issue'));
        setOpen(false);
        break;
      case 'create-project':
        window.dispatchEvent(new CustomEvent('open-create-project'));
        setOpen(false);
        break;
      case 'create-note':
        window.dispatchEvent(new CustomEvent('open-create-note'));
        setOpen(false);
        break;
      case 'create-cycle':
        window.dispatchEvent(new CustomEvent('open-create-cycle'));
        setOpen(false);
        break;
      case 'toggle-theme':
        document.documentElement.classList.toggle('dark');
        setOpen(false);
        break;
      case 'fullscreen':
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
        setOpen(false);
        break;
    }
  }, [navigate, currentWorkspace]);

  const pushPage = (page: string) => {
    setPages([...pages, page]);
    setSearch('');
  };

  return (
    <>
      {/* Trigger button */}
      <Button
        variant="outline"
        size="sm"
        className="w-64 justify-between text-linear-text-secondary bg-linear-surface border-linear-border hover:bg-linear-border hover:text-linear-text"
        onClick={() => setOpen(true)}
      >
        <div className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5" />
          <span className="text-sm">Search or jump to...</span>
        </div>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-linear-border bg-linear-elevated px-1.5 font-mono text-[10px] font-medium text-linear-text-tertiary">
          ⌘K
        </kbd>
      </Button>

      {/* Command Palette Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
            onClick={() => setOpen(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-linear-text/20 backdrop-blur-sm" />
            
            {/* Command Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="relative w-full max-w-2xl mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <Command 
                className="bg-linear-elevated rounded-xl border border-linear-border shadow-elevation-modal overflow-hidden"
                loop
              >
                {/* Header */}
                <div className="flex items-center border-b border-linear-border px-3">
                  <Search className="w-4 h-4 text-linear-text-tertiary mr-2" />
                  <Command.Input
                    value={search}
                    onValueChange={setSearch}
                    placeholder={
                      activePage === 'shortcuts' ? 'Search keyboard shortcuts...' :
                      activePage === 'goto' ? 'Go to page...' :
                      activePage === 'create' ? 'Create new...' :
                      'Search issues, notes, and more...'
                    }
                    className="flex-1 h-12 bg-transparent text-sm text-linear-text placeholder:text-linear-text-tertiary focus:outline-none"
                    autoFocus
                  />
                  {pages.length > 0 && (
                    <button
                      onClick={() => setPages([])}
                      className="text-xs text-linear-text-tertiary hover:text-linear-text px-2 py-1 rounded hover:bg-linear-surface transition-colors"
                    >
                      Esc to close
                    </button>
                  )}
                </div>

                {/* Breadcrumbs for nested pages */}
                {pages.length > 0 && (
                  <div className="flex items-center gap-1 px-3 py-2 border-b border-linear-border bg-linear-surface/50 text-xs">
                    <button
                      onClick={() => setPages([])}
                      className="text-linear-text-secondary hover:text-linear-text transition-colors"
                    >
                      Home
                    </button>
                    {pages.map((page, i) => (
                      <span key={page} className="flex items-center gap-1 text-linear-text-tertiary">
                        <ArrowRight className="w-3 h-3" />
                        <span className="capitalize">{page}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Content */}
                <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                  {!activePage && search.length === 0 && (
                    <>
                      {/* Quick Actions */}
                      <Command.Group heading="Quick Actions" className="text-xs text-linear-text-tertiary uppercase tracking-wider font-semibold px-2 py-1.5">
                        {QUICK_ACTIONS.map((action) => (
                          <Command.Item
                            key={action.id}
                            onSelect={() => handleAction(action.action)}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-linear-text hover:bg-linear-surface cursor-pointer data-[selected=true]:bg-linear-surface"
                          >
                            <div className="w-7 h-7 rounded-md bg-linear-accent-light flex items-center justify-center">
                              <action.icon className="w-3.5 h-3.5 text-linear-accent" />
                            </div>
                            <span className="flex-1">{action.label}</span>
                            {action.shortcut && (
                              <kbd className="text-[10px] text-linear-text-tertiary bg-linear-surface px-1.5 py-0.5 rounded">
                                {action.shortcut}
                              </kbd>
                            )}
                          </Command.Item>
                        ))}
                      </Command.Group>

                      <Command.Separator className="h-px bg-linear-border my-2" />

                      {/* Navigation */}
                      <Command.Group heading="Navigation" className="text-xs text-linear-text-tertiary uppercase tracking-wider font-semibold px-2 py-1.5">
                        <Command.Item
                          onSelect={() => pushPage('goto')}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-linear-text hover:bg-linear-surface cursor-pointer data-[selected=true]:bg-linear-surface"
                        >
                          <div className="w-7 h-7 rounded-md bg-linear-surface flex items-center justify-center">
                            <Map className="w-3.5 h-3.5 text-linear-text-secondary" />
                          </div>
                          <span className="flex-1">Go to page...</span>
                          <kbd className="text-[10px] text-linear-text-tertiary bg-linear-surface px-1.5 py-0.5 rounded">G</kbd>
                        </Command.Item>
                        <Command.Item
                          onSelect={() => pushPage('shortcuts')}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-linear-text hover:bg-linear-surface cursor-pointer data-[selected=true]:bg-linear-surface"
                        >
                          <div className="w-7 h-7 rounded-md bg-linear-surface flex items-center justify-center">
                            <Keyboard className="w-3.5 h-3.5 text-linear-text-secondary" />
                          </div>
                          <span className="flex-1">Keyboard shortcuts</span>
                          <kbd className="text-[10px] text-linear-text-tertiary bg-linear-surface px-1.5 py-0.5 rounded">⌘/</kbd>
                        </Command.Item>
                      </Command.Group>

                      <Command.Separator className="h-px bg-linear-border my-2" />

                      {/* View Options */}
                      <Command.Group heading="View" className="text-xs text-linear-text-tertiary uppercase tracking-wider font-semibold px-2 py-1.5">
                        {VIEW_OPTIONS.map((option) => (
                          <Command.Item
                            key={option.id}
                            onSelect={() => handleAction(option.action)}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-linear-text hover:bg-linear-surface cursor-pointer data-[selected=true]:bg-linear-surface"
                          >
                            <div className="w-7 h-7 rounded-md bg-linear-surface flex items-center justify-center">
                              <option.icon className="w-3.5 h-3.5 text-linear-text-secondary" />
                            </div>
                            <span>{option.label}</span>
                          </Command.Item>
                        ))}
                      </Command.Group>
                    </>
                  )}

                  {/* Go to page */}
                  {activePage === 'goto' && (
                    <Command.Group>
                      {NAVIGATION_ITEMS.map((item) => (
                        <Command.Item
                          key={item.id}
                          onSelect={() => handleNavigate(item.url)}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-linear-text hover:bg-linear-surface cursor-pointer data-[selected=true]:bg-linear-surface"
                        >
                          <div className="w-7 h-7 rounded-md bg-linear-surface flex items-center justify-center">
                            <item.icon className="w-3.5 h-3.5 text-linear-text-secondary" />
                          </div>
                          <span className="flex-1">{item.label}</span>
                          <kbd className="text-[10px] text-linear-text-tertiary bg-linear-surface px-1.5 py-0.5 rounded">
                            {item.shortcut}
                          </kbd>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}

                  {/* Create page */}
                  {activePage === 'create' && (
                    <Command.Group>
                      {QUICK_ACTIONS.map((action) => (
                        <Command.Item
                          key={action.id}
                          onSelect={() => handleAction(action.action)}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-linear-text hover:bg-linear-surface cursor-pointer data-[selected=true]:bg-linear-surface"
                        >
                          <div className="w-7 h-7 rounded-md bg-linear-accent-light flex items-center justify-center">
                            <action.icon className="w-3.5 h-3.5 text-linear-accent" />
                          </div>
                          <span className="flex-1">{action.label}</span>
                          {action.shortcut && (
                            <kbd className="text-[10px] text-linear-text-tertiary bg-linear-surface px-1.5 py-0.5 rounded">
                              {action.shortcut}
                            </kbd>
                          )}
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}

                  {/* Shortcuts page */}
                  {activePage === 'shortcuts' && (
                    <Command.Group>
                      {GLOBAL_SHORTCUTS.map((shortcut) => (
                        <Command.Item
                          key={shortcut.key}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-linear-text"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{shortcut.label}</div>
                            <div className="text-xs text-linear-text-secondary">{shortcut.category}</div>
                          </div>
                          <kbd className="text-xs text-linear-text-secondary bg-linear-surface px-2 py-1 rounded border border-linear-border">
                            {shortcut.key}
                          </kbd>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}

                  {/* Search results */}
                  {search.length >= 2 && !activePage && (
                    <>
                      <Command.Group heading="Issues" className="text-xs text-linear-text-tertiary uppercase tracking-wider font-semibold px-2 py-1.5">
                        {searchResults?.issues?.map((issue: any) => (
                          <Command.Item
                            key={issue.id}
                            onSelect={() => handleNavigate(`issues/${issue.id}`)}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-linear-text hover:bg-linear-surface cursor-pointer data-[selected=true]:bg-linear-surface"
                          >
                            <CircleDot className="w-4 h-4 text-linear-text-tertiary" />
                            <div className="flex-1">
                              <div className="font-medium">{issue.title}</div>
                              <div className="text-xs text-linear-text-secondary">{issue.identifier}</div>
                            </div>
                          </Command.Item>
                        ))}
                        {(!searchResults?.issues || searchResults.issues.length === 0) && (
                          <div className="px-2 py-3 text-sm text-linear-text-secondary">No issues found</div>
                        )}
                      </Command.Group>

                      <Command.Group heading="Notes" className="text-xs text-linear-text-tertiary uppercase tracking-wider font-semibold px-2 py-1.5">
                        {searchResults?.notes?.map((note: any) => (
                          <Command.Item
                            key={note.id}
                            onSelect={() => handleNavigate(`notes/${note.slug}`)}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-linear-text hover:bg-linear-surface cursor-pointer data-[selected=true]:bg-linear-surface"
                          >
                            <FileText className="w-4 h-4 text-linear-text-tertiary" />
                            <div className="flex-1">
                              <div className="font-medium">{note.title}</div>
                              <div className="text-xs text-linear-text-secondary">
                                Edited {new Date(note.updatedAt).toLocaleDateString()}
                              </div>
                            </div>
                          </Command.Item>
                        ))}
                        {(!searchResults?.notes || searchResults.notes.length === 0) && (
                          <div className="px-2 py-3 text-sm text-linear-text-secondary">No notes found</div>
                        )}
                      </Command.Group>
                    </>
                  )}

                  <Command.Empty className="py-6 text-center text-sm text-linear-text-secondary">
                    No results found for "{search}"
                  </Command.Empty>
                </Command.List>

                {/* Footer */}
                <div className="flex items-center justify-between px-3 py-2 border-t border-linear-border bg-linear-surface/50 text-xs text-linear-text-secondary">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-linear-elevated border border-linear-border rounded text-[10px]">↑↓</kbd>
                      <span>Navigate</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-linear-elevated border border-linear-border rounded text-[10px]">↵</kbd>
                      <span>Select</span>
                    </span>
                    {pages.length > 0 && (
                      <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-linear-elevated border border-linear-border rounded text-[10px]">Esc</kbd>
                        <span>Back</span>
                      </span>
                    )}
                  </div>
                  <div className="text-linear-text-tertiary">
                    Flowpig
                  </div>
                </div>
              </Command>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
