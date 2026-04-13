import { Outlet, Link, useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AnimatedPage } from '@flowpigdev/ui';
import { useAuth } from '~/lib/auth-client';
import { NotificationBadge } from '~/components/notification-badge';
import { CommandPalette } from '~/components/command-palette';
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
} from 'lucide-react';

export default function WorkspaceLayout() {
  const { workspace } = useParams();
  const { user, logout } = useAuth();
  const location = useLocation();

  const mainNavItems = [
    { to: `/${workspace}`, icon: Layout, label: 'Home' },
    { to: `/${workspace}/issues`, icon: CircleDot, label: 'Issues' },
    { to: `/${workspace}/cycles`, icon: RotateCcw, label: 'Cycles' },
    { to: `/${workspace}/triage`, icon: Inbox, label: 'Triage' },
  ];

  const planningNavItems = [
    { to: `/${workspace}/roadmap`, icon: Map, label: 'Roadmap' },
    { to: `/${workspace}/projects`, icon: FolderKanban, label: 'Projects' },
    { to: `/${workspace}/initiatives`, icon: Target, label: 'Initiatives' },
  ];

  const workspaceNavItems = [
    { to: `/${workspace}/notes`, icon: FileText, label: 'Notes' },
    { to: `/${workspace}/databases`, icon: Database, label: 'Databases' },
    { to: `/${workspace}/team`, icon: Users, label: 'Team' },
  ];

  const bottomNavItems = [
    { to: `/${workspace}/settings`, icon: Settings, label: 'Settings' },
  ];

  const isActive = (path: string) => {
    if (path === `/${workspace}`) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full"
      >
        {/* Workspace header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center text-white font-bold">
              {workspace?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-gray-900 truncate capitalize">{workspace}</h2>
              <p className="text-xs text-gray-500">Free plan</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {/* Main */}
          <div className="space-y-1">
            {mainNavItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.to)
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </div>

          {/* Planning */}
          <div>
            <p className="px-3 mb-1 text-xs font-medium text-gray-400 uppercase tracking-wider">Planning</p>
            <div className="space-y-1">
              {planningNavItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.to)
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Workspace */}
          <div>
            <p className="px-3 mb-1 text-xs font-medium text-gray-400 uppercase tracking-wider">Workspace</p>
            <div className="space-y-1">
              {workspaceNavItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.to)
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Bottom */}
          <div className="pt-2 border-t border-gray-100">
            <div className="space-y-1">
              {bottomNavItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.to)
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              {user?.name?.charAt(0) || user?.email?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name || user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <main className="flex-1 ml-64">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <CommandPalette workspaceId={workspace || ''} workspaceSlug={workspace || ''} />
            <button className="flex items-center gap-2 px-3 py-1.5 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors">
              <Plus className="w-4 h-4" />
              New issue
            </button>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBadge />
          </div>
        </header>

        {/* Page content */}
        <AnimatedPage className="p-6">
          <Outlet />
        </AnimatedPage>
      </main>
    </div>
  );
}
