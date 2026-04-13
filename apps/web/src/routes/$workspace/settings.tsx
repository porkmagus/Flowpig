import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { API_URL } from '~/lib/api';
import { AnimatedPage } from '@flowpigdev/ui';
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
  Check
} from 'lucide-react';

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

export default function SettingsRoute() {
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
    <AnimatedPage className="max-w-6xl mx-auto">
      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'general' && workspace && (
            <GeneralSettings 
              workspace={workspace} 
              onUpdate={(updates) => updateMutation.mutate(updates)}
              isUpdating={updateMutation.isPending}
            />
          )}
          {activeTab === 'members' && (
            <MemberSettings workspace={workspace} />
          )}
          {activeTab === 'appearance' && workspace && (
            <AppearanceSettings 
              workspace={workspace}
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
            <div className="text-center py-16 text-gray-500">
              <p>Coming soon</p>
            </div>
          )}
        </div>
      </div>
    </AnimatedPage>
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
  const [name, setName] = useState(workspaceData.name);
  const [description, setDescription] = useState(workspaceData.description || '');

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">General Settings</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Workspace Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            URL Slug
          </label>
          <input
            type="text"
            value={workspaceData.slug}
            disabled
            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            Your workspace is accessible at /{workspaceData.slug}
          </p>
        </div>

        <div className="pt-4">
          <button
            onClick={() => onUpdate({ name, description })}
            disabled={isUpdating}
            className="flex items-center gap-2 bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MemberSettings({ workspace }: { workspace?: WorkspaceSettings }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Member Settings</h2>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h3 className="font-medium text-gray-900">Allow Guest Access</h3>
            <p className="text-sm text-gray-500">Let external users join with limited permissions</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h3 className="font-medium text-gray-900">Require Approval</h3>
            <p className="text-sm text-gray-500">New members must be approved by an admin</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
          </label>
        </div>
      </div>
    </div>
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

  const [selectedColor, setSelectedColor] = useState(workspaceData.color);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Appearance</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Workspace Color
          </label>
          <div className="flex flex-wrap gap-3">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-10 h-10 rounded-lg transition-transform ${
                  selectedColor === color ? 'scale-110 ring-2 ring-offset-2 ring-gray-400' : ''
                }`}
                style={{ backgroundColor: color }}
              >
                {selectedColor === color && <Check className="w-5 h-5 text-white mx-auto" />}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={() => onUpdate({ color: selectedColor })}
            disabled={isUpdating || selectedColor === workspaceData.color}
            className="flex items-center gap-2 bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Notification Preferences</h2>
      
      <div className="space-y-4">
        {[
          { id: 'issueAssigned', label: 'Issue Assigned', desc: 'When someone assigns you an issue' },
          { id: 'issueMentioned', label: 'Mentioned', desc: 'When someone mentions you in a comment' },
          { id: 'issueCommented', label: 'New Comments', desc: 'When someone comments on an issue you follow' },
          { id: 'cycleUpdates', label: 'Cycle Updates', desc: 'Updates about active sprint cycles' },
          { id: 'weeklyDigest', label: 'Weekly Digest', desc: 'Weekly summary of your workspace activity' },
        ].map((pref) => (
          <div key={pref.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">{pref.label}</h3>
              <p className="text-sm text-gray-500">{pref.desc}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked={pref.id !== 'cycleUpdates'} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

function IntegrationSettings() {
  const integrations = [
    { name: 'GitHub', icon: '🔧', description: 'Sync issues with GitHub repositories', connected: false },
    { name: 'Slack', icon: '💬', description: 'Get notifications in Slack channels', connected: false },
    { name: 'Figma', icon: '🎨', description: 'Embed Figma designs in issues', connected: false },
    { name: 'GitLab', icon: '🦊', description: 'Sync issues with GitLab projects', connected: false },
    { name: 'Jira', icon: '📋', description: 'Import issues from Jira', connected: false },
    { name: 'Notion', icon: '📝', description: 'Sync documents with Notion', connected: false },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Integrations</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((integration) => (
          <div key={integration.name} className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
            <span className="text-2xl">{integration.icon}</span>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{integration.name}</h3>
              <p className="text-sm text-gray-500">{integration.description}</p>
            </div>
            <button
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                integration.connected
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {integration.connected ? 'Connected' : 'Connect'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataSettings() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Data Management</h2>
      
      <div className="space-y-4">
        <div className="p-4 border border-gray-200 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Export Data</h3>
          <p className="text-sm text-gray-500 mb-3">
            Download all your workspace data in JSON format
          </p>
          <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
            Export JSON
          </button>
        </div>

        <div className="p-4 border border-gray-200 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Import Data</h3>
          <p className="text-sm text-gray-500 mb-3">
            Import issues from Linear, Jira, GitHub Issues, or CSV
          </p>
          <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
            Import Data
          </button>
        </div>

        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <h3 className="font-medium text-red-900 mb-2">Danger Zone</h3>
          <p className="text-sm text-red-700 mb-3">
            Once you delete a workspace, there is no going back. Please be certain.
          </p>
          <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
            Delete Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
