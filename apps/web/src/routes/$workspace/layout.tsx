import { useEffect } from 'react';
import { Outlet, Link, useParams, useLocation, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '~/lib/auth-client';
import { NotificationBadge } from '~/components/notification-badge';
import { CommandPalette } from '~/components/command-palette';
import { PageTree } from '~/components/page-tree';
import { CreateIssueModal, useCreateIssueModal } from '~/components/create-issue-modal';
import { API_URL } from '~/lib/api';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';
import {
  Layout,
  CircleDot,
  FileText,
  Settings,
  Users,
  Search,
  Plus,
  LogOut,
  ChevronDown,
  RotateCcw,
  Database,
  FolderKanban,
  Target,
  Inbox,
  Map,
  UserCircle,
  Filter,
  BarChart3,
  Layers,
} from 'lucide-react';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: string;
}

const LAST_WORKSPACE_KEY = 'flowpig:last-workspace';

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon;
  
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <Link
          to={item.to}
          className={cn(
            "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-all duration-150",
            isActive
              ? "bg-linear-accent-light text-linear-accent font-medium"
              : "text-linear-text-secondary hover:bg-linear-surface hover:text-linear-text"
          )}
        >
          <Icon className={cn("w-4 h-4", isActive && "text-linear-accent")} />
          <span className="flex-1">{item.label}</span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" className="lg:hidden">
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

function NavSection({ title, items, activePath }: { title?: string; items: NavItem[]; activePath: string }) {
  const { workspace } = useParams();
  
  const isActive = (path: string) => {
    if (path === `/${workspace}`) {
      return activePath === path;
    }
    return activePath.startsWith(path);
  };

  return (
    <div className="space-y-0.5">
      {title && (
        <p className="px-2.5 mb-1.5 text-[11px] font-semibold text-linear-text-tertiary uppercase tracking-wider">
          {title}
        </p>
      )}
      {items.map((item) => (
        <NavLink key={item.to} item={item} isActive={isActive(item.to)} />
      ))}
    </div>
  );
}

export default function WorkspaceLayout() {
  const { workspace } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const location = useLocation();
  const createIssueModal = useCreateIssueModal();

  useEffect(() => {
    if (workspace && typeof window !== 'undefined') {
      window.localStorage.setItem(LAST_WORKSPACE_KEY, workspace);
    }
  }, [workspace]);

  // Get unread notification count for sidebar badge
  const { data: unreadCountData } = useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/notifications/unread-count`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch count');
      return response.json();
    },
    refetchInterval: 30000,
  });

  const unreadCount = unreadCountData?.count || 0;

  const mainNavItems: NavItem[] = [
    { to: `/${workspace}`, icon: Layout, label: 'Home' },
    { to: `/${workspace}/inbox`, icon: Inbox, label: 'Inbox' },
    { to: `/${workspace}/my-issues`, icon: UserCircle, label: 'My Issues' },
    { to: `/${workspace}/issues`, icon: CircleDot, label: 'Issues' },
    { to: `/${workspace}/cycles`, icon: RotateCcw, label: 'Cycles' },
    { to: `/${workspace}/triage`, icon: Filter, label: 'Triage' },
  ];

  const planningNavItems: NavItem[] = [
    { to: `/${workspace}/roadmap`, icon: Map, label: 'Roadmap' },
    { to: `/${workspace}/projects`, icon: FolderKanban, label: 'Projects' },
    { to: `/${workspace}/initiatives`, icon: Target, label: 'Initiatives' },
    { to: `/${workspace}/analytics`, icon: BarChart3, label: 'Analytics' },
  ];

  const workspaceNavItems: NavItem[] = [
    { to: `/${workspace}/notes`, icon: FileText, label: 'Notes' },
    { to: `/${workspace}/databases`, icon: Database, label: 'Databases' },
    { to: `/${workspace}/team`, icon: Users, label: 'Team' },
  ];

  const bottomNavItems: NavItem[] = [
    { to: `/${workspace}/settings`, icon: Settings, label: 'Settings' },
  ];

  // Check if we're on a notes page to show page tree
  const isNotesSection = location.pathname.includes('/notes');

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen bg-linear-bg flex">
        {/* Main Sidebar */}
        <motion.aside 
          initial={{ x: -10, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className={cn(
            "w-56 bg-linear-elevated border-r border-linear-border flex flex-col fixed h-full z-20",
            isNotesSection && "w-52"
          )}
        >
          {/* Workspace header */}
          <div className="px-3 py-3 border-b border-linear-border">
            <motion.button 
              type="button"
              onClick={() => navigate('/onboarding')}
              className="flex items-center gap-2.5 p-1.5 rounded-md hover:bg-linear-surface cursor-pointer transition-colors"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              title="Switch workspace"
            >
              <div className="w-6 h-6 bg-linear-accent rounded-md flex items-center justify-center">
                <Layers className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-medium text-sm text-linear-text truncate capitalize">{workspace}</h2>
                <p className="text-[11px] text-linear-text-tertiary">Switch workspace</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-linear-text-tertiary" />
            </motion.button>
          </div>

          {/* Search */}
          <div className="px-3 py-2">
            <button className="w-full flex items-center gap-2 px-2.5 py-1.5 bg-linear-surface rounded-md text-sm text-linear-text-tertiary hover:text-linear-text-secondary hover:bg-linear-border transition-colors">
              <Search className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">Search...</span>
              <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-linear-border bg-linear-elevated px-1.5 font-mono text-[10px] font-medium text-linear-text-tertiary">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto">
            <NavSection items={mainNavItems} activePath={location.pathname} />
            
            <Separator className="my-2" />
            
            <NavSection title="Planning" items={planningNavItems} activePath={location.pathname} />
            
            <Separator className="my-2" />
            
            <NavSection title="Workspace" items={workspaceNavItems} activePath={location.pathname} />
            
            <Separator className="my-2" />
            
            <NavSection items={bottomNavItems} activePath={location.pathname} />
          </nav>

          {/* User section */}
          <div className="p-3 border-t border-linear-border">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 bg-linear-surface rounded-full flex items-center justify-center text-xs font-medium text-linear-text-secondary border border-linear-border">
                {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-linear-text truncate">
                  {user?.name || user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-2.5 py-1.5 w-full text-sm text-linear-text-secondary hover:text-linear-text hover:bg-linear-surface rounded-md transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </motion.aside>

        {/* Page Tree Sidebar - Only show in notes section */}
        <AnimatePresence>
          {isNotesSection && (
            <motion.aside
              key="page-tree"
              initial={{ x: -224, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -224, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
              className="w-56 bg-linear-surface border-r border-linear-border flex flex-col fixed h-full left-56 z-10"
            >
              <PageTree 
                onCreatePage={() => navigate(`/${workspace}/notes`)}
              />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className={cn(
          "flex-1",
          isNotesSection ? 'ml-112' : 'ml-56'
        )}>
          {/* Top bar */}
          <header className="h-12 bg-linear-elevated border-b border-linear-border flex items-center justify-between px-4 sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <CommandPalette workspaceId={workspace || ''} workspaceSlug={workspace || ''} />
              <Button 
                size="sm" 
                className="gap-1.5 h-7"
                onClick={() => createIssueModal.open()}
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New issue</span>
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBadge />
              <div className="w-7 h-7 bg-linear-surface rounded-full flex items-center justify-center text-xs font-medium text-linear-text-secondary border border-linear-border">
                {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?'}
              </div>
            </div>
          </header>

          {/* Page content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
              className="p-6"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Create Issue Modal */}
        <CreateIssueModal
          isOpen={createIssueModal.isOpen}
          onClose={createIssueModal.close}
          initialValues={createIssueModal.initialValues}
        />
      </div>
    </TooltipProvider>
  );
}
