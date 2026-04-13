import { useState } from 'react';
import { useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Settings,
  Users, 
  Palette, 
  Bell,
  Shield,
  Key,
  Webhook,
  Database,
  Save,
  Check,
  Loader2,
  Trash2,
  Moon,
  Sun,
  Monitor,
  Link,
  ChevronRight,
  Plus,
  X
} from 'lucide-react';
import { API_URL } from '~/lib/api';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { FadeIn } from '~/components/ui/motion';

interface WorkspaceSettings {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  icon: string | null;
  settings: {
    defaultIssueState?: string;
    allowGuests?: boolean;
    requireApproval?: boolean;
  };
}

export default function SettingsPage() {
  const { workspace } = useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');

  const { data, isLoading } = useQuery({
    queryKey: ['workspace-settings', workspace],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to load workspace');
      return response.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<WorkspaceSettings>) => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updates),
        }
      );
      if (!response.ok) throw new Error('Failed to update workspace');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-settings', workspace] });
    },
  });

  const workspaceData: WorkspaceSettings | undefined = data?.workspace;

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'integrations', label: 'Integrations', icon: Key },
    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
    { id: 'data', label: 'Data', icon: Database },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <FadeIn>
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-linear-text tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-linear-accent" />
            Settings
          </h1>
          <p className="text-sm text-linear-text-secondary mt-0.5">
            Manage your workspace configuration
          </p>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <FadeIn delay={0.05}>
          <div className="space-y-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
                  activeTab === tab.id
                    ? "bg-linear-accent-light text-linear-accent"
                    : "text-linear-text-secondary hover:bg-linear-surface hover:text-linear-text"
                )}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </FadeIn>

        {/* Content */}
        <div className="md:col-span-3">
          <FadeIn key={activeTab} delay={0.1}>
            {activeTab === 'general' && workspaceData && (
              <GeneralSettings 
                workspace={workspaceData} 
                onUpdate={(updates) => updateMutation.mutate(updates)}
                isUpdating={updateMutation.isPending}
              />
            )}
            {activeTab === 'members' && (
              <MemberSettings workspace={workspace} />
            )}
            {activeTab === 'appearance' && workspaceData && (
              <AppearanceSettings 
                workspace={workspaceData}
                onUpdate={(updates) => updateMutation.mutate(updates)}
                isUpdating={updateMutation.isPending}
              />
            )}
            {activeTab === 'notifications' && (
              <NotificationSettings />
            )}
            {activeTab === 'integrations' && (
              <IntegrationSettings />
            )}
            {activeTab === 'data' && (
              <DataSettings />
            )}
            {['security', 'webhooks'].includes(activeTab) && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-linear-text-secondary">Coming soon</p>
                </CardContent>
              </Card>
            )}
          </FadeIn>
        </div>
      </div>
    </div>
  );
}

function GeneralSettings({ 
  workspace, 
  onUpdate,
  isUpdating 
}: { 
  workspace: WorkspaceSettings;
  onUpdate: (updates: Partial<WorkspaceSettings>) => void;
  isUpdating: boolean;
}) {
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description || '');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">General Settings</CardTitle>
        <CardDescription>
          Configure your workspace name, URL, and public information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-linear-text mb-1.5">
            Workspace Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Workspace"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-linear-text mb-1.5">
            URL Slug
          </label>
          <div className="flex items-center gap-2 px-3 py-2 bg-linear-surface border border-linear-border rounded-lg">
            <span className="text-sm text-linear-text-secondary">flowpig.app/</span>
            <input
              type="text"
              value={workspace.slug}
              disabled
              className="flex-1 bg-transparent text-sm text-linear-text focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-linear-text mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-linear-surface border border-linear-border rounded-lg text-sm text-linear-text focus:outline-none focus:ring-2 focus:ring-linear-accent resize-none"
            placeholder="What does this workspace do?"
          />
        </div>

        <div className="pt-2">
          <Button 
            onClick={() => onUpdate({ name, description })}
            disabled={isUpdating}
            className="gap-1.5"
          >
            {isUpdating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MemberSettings({ workspace }: { workspace?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Member Settings</CardTitle>
        <CardDescription>
          Manage who has access to this workspace
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-linear-surface rounded-lg">
          <div>
            <h3 className="font-medium text-linear-text text-sm">Allow Guest Access</h3>
            <p className="text-xs text-linear-text-secondary">Let external users join with limited permissions</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-9 h-5 bg-linear-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-linear-accent"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-3 bg-linear-surface rounded-lg">
          <div>
            <h3 className="font-medium text-linear-text text-sm">Require Approval</h3>
            <p className="text-xs text-linear-text-secondary">New members must be approved by an admin</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-9 h-5 bg-linear-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-linear-accent"></div>
          </label>
        </div>

        <Button variant="outline" className="w-full gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Invite member
        </Button>
      </CardContent>
    </Card>
  );
}

function AppearanceSettings({ 
  workspace,
  onUpdate,
  isUpdating
}: { 
  workspace: WorkspaceSettings;
  onUpdate: (updates: Partial<WorkspaceSettings>) => void;
  isUpdating: boolean;
}) {
  const colors = [
    '#5E6AD2', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', 
    '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'
  ];

  const [selectedColor, setSelectedColor] = useState(workspace.color);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workspace Color</CardTitle>
          <CardDescription>
            Choose a color that represents your workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={cn(
                  "w-10 h-10 rounded-lg transition-all",
                  selectedColor === color && "ring-2 ring-offset-2 ring-linear-accent scale-110"
                )}
                style={{ backgroundColor: color }}
              >
                {selectedColor === color && <Check className="w-5 h-5 text-white mx-auto" />}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <Button
              onClick={() => onUpdate({ color: selectedColor })}
              disabled={isUpdating || selectedColor === workspace.color}
              className="gap-1.5"
            >
              {isUpdating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save color
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Theme</CardTitle>
          <CardDescription>
            Choose your preferred appearance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setTheme('light')}
              className={cn(
                "p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all",
                theme === 'light' 
                  ? "border-linear-accent bg-linear-accent-light" 
                  : "border-linear-border hover:border-linear-border-hover"
              )}
            >
              <Sun className="w-5 h-5 text-linear-accent" />
              <span className="text-sm font-medium">Light</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={cn(
                "p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all",
                theme === 'dark' 
                  ? "border-linear-accent bg-linear-accent-light" 
                  : "border-linear-border hover:border-linear-border-hover"
              )}
            >
              <Moon className="w-5 h-5 text-linear-accent" />
              <span className="text-sm font-medium">Dark</span>
            </button>
            <button
              onClick={() => setTheme('system')}
              className={cn(
                "p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all",
                theme === 'system' 
                  ? "border-linear-accent bg-linear-accent-light" 
                  : "border-linear-border hover:border-linear-border-hover"
              )}
            >
              <Monitor className="w-5 h-5 text-linear-accent" />
              <span className="text-sm font-medium">System</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationSettings() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [desktopNotifications, setDesktopNotifications] = useState(true);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notification Preferences</CardTitle>
        <CardDescription>
          Choose what you want to be notified about
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {[
          { id: 'issueAssigned', label: 'Issue Assigned', desc: 'When someone assigns you an issue', default: true },
          { id: 'issueMentioned', label: 'Mentioned', desc: 'When someone mentions you in a comment', default: true },
          { id: 'issueCommented', label: 'New Comments', desc: 'When someone comments on an issue you follow', default: true },
          { id: 'cycleUpdates', label: 'Cycle Updates', desc: 'Updates about active sprint cycles', default: false },
          { id: 'weeklyDigest', label: 'Weekly Digest', desc: 'Weekly summary of your workspace activity', default: true },
        ].map((pref) => (
          <div key={pref.id} className="flex items-center justify-between p-3 bg-linear-surface rounded-lg">
            <div>
              <h3 className="font-medium text-linear-text text-sm">{pref.label}</h3>
              <p className="text-xs text-linear-text-secondary">{pref.desc}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                defaultChecked={pref.default}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-linear-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-linear-accent"></div>
            </label>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function IntegrationSettings() {
  const integrations = [
    { name: 'GitHub', icon: Link, description: 'Sync issues with GitHub repositories', connected: true, color: '#24292e' },
    { name: 'Slack', icon: Bell, description: 'Get notifications in Slack channels', connected: false, color: '#4A154B' },
    { name: 'Figma', icon: Palette, description: 'Embed Figma designs in issues', connected: false, color: '#F24E1E' },
    { name: 'GitLab', icon: Link, description: 'Sync issues with GitLab projects', connected: false, color: '#FC6D26' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Integrations</CardTitle>
        <CardDescription>
          Connect third-party services to your workspace
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {integrations.map((integration) => (
          <div 
            key={integration.name} 
            className="flex items-center gap-3 p-3 bg-linear-surface rounded-lg"
          >
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: integration.color }}
            >
              <integration.icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-linear-text text-sm">{integration.name}</h3>
              <p className="text-xs text-linear-text-secondary">{integration.description}</p>
            </div>
            <Button
              variant={integration.connected ? "outline" : "default"}
              size="sm"
            >
              {integration.connected ? 'Manage' : 'Connect'}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function DataSettings() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Management</CardTitle>
          <CardDescription>
            Export or import your workspace data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-linear-surface rounded-lg">
            <div>
              <h3 className="font-medium text-linear-text text-sm">Export Data</h3>
              <p className="text-xs text-linear-text-secondary">Download all your workspace data in JSON format</p>
            </div>
            <Button variant="outline" size="sm">Export JSON</Button>
          </div>

          <div className="flex items-center justify-between p-3 bg-linear-surface rounded-lg">
            <div>
              <h3 className="font-medium text-linear-text text-sm">Import Data</h3>
              <p className="text-xs text-linear-text-secondary">Import from Linear, Jira, GitHub Issues, or CSV</p>
            </div>
            <Button variant="outline" size="sm">Import</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-priority-urgent/30">
        <CardHeader>
          <CardTitle className="text-base text-priority-urgent">Danger Zone</CardTitle>
          <CardDescription>
            Destructive actions that cannot be undone
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 bg-priority-urgent/5 rounded-lg">
            <div>
              <h3 className="font-medium text-priority-urgent text-sm">Delete workspace</h3>
              <p className="text-xs text-priority-urgent/70">
                Permanently delete this workspace and all its data
              </p>
            </div>
            <Button variant="destructive" size="sm">
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
