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
  X,
  CreditCard,
  Zap,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
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
    { id: 'billing', label: 'Billing', icon: CreditCard },
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
            {activeTab === 'billing' && (
              <BillingSettings workspaceId={workspace || ''} />
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
            <div className="w-9 h-5 bg-linear-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-linear-surface after:border-linear-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-linear-accent"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-3 bg-linear-surface rounded-lg">
          <div>
            <h3 className="font-medium text-linear-text text-sm">Require Approval</h3>
            <p className="text-xs text-linear-text-secondary">New members must be approved by an admin</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-9 h-5 bg-linear-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-linear-surface after:border-linear-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-linear-accent"></div>
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
              <div className="w-9 h-5 bg-linear-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-linear-surface after:border-linear-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-linear-accent"></div>
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

const PLANS = [
  {
    id: 'FREE',
    name: 'Free',
    price: '$0',
    interval: 'forever',
    description: 'For individuals and small teams getting started.',
    features: ['Up to 5 members', '500 issues', '1 GB storage', '50 AI requests/month', 'Core features'],
    cta: null,
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: '$12',
    interval: '/seat/month',
    description: 'For growing teams that need more power and fewer limits.',
    features: ['Up to 25 members', '10,000 issues', '20 GB storage', '500 AI requests/month', 'Advanced analytics', 'Priority support'],
    cta: 'Upgrade to Pro',
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: 'Custom',
    interval: '',
    description: 'For large teams with custom needs.',
    features: ['Unlimited members', 'Unlimited issues', 'Unlimited storage', 'Unlimited AI', 'SSO/SAML', 'Dedicated support', 'Custom contracts'],
    cta: 'Contact Sales',
  },
];

function BillingSettings({ workspaceId }: { workspaceId: string }) {
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['billing', workspaceId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/workspaces/${workspaceId}/billing`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load billing');
      return res.json();
    },
  });

  async function handleUpgrade(plan: string) {
    setIsUpgrading(plan);
    try {
      const res = await fetch(`${API_URL}/workspaces/${workspaceId}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan, interval: 'monthly' }),
      });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      } else {
        // Stripe not configured — show message
        alert(json.message || 'Billing not configured on this server.');
      }
    } catch {
      alert('Could not start checkout. Please try again.');
    } finally {
      setIsUpgrading(null);
    }
  }

  async function handleManageBilling() {
    try {
      const res = await fetch(`${API_URL}/workspaces/${workspaceId}/billing/portal`, {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
    } catch {
      alert('Could not open billing portal.');
    }
  }

  const billing = data?.billing;
  const usage = data?.usage;
  const limits = data?.limits;
  const invoices: any[] = data?.invoices || [];
  const currentPlan = billing?.plan || 'FREE';

  return (
    <div className="space-y-6">
      {/* Current plan banner */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-linear-accent" />
                Current Plan
              </CardTitle>
              <CardDescription>
                {isLoading ? 'Loading...' : `You are on the ${currentPlan} plan`}
              </CardDescription>
            </div>
            {billing?.hasStripeSubscription && (
              <Button variant="outline" size="sm" onClick={handleManageBilling} className="gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" />
                Manage billing
              </Button>
            )}
          </div>
        </CardHeader>
        {usage && limits && (
          <CardContent className="space-y-3">
            {billing?.cancelAtPeriodEnd && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-linear-warning-light border border-linear-warning/30 text-sm text-linear-warning">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Your plan will cancel at the end of the billing period.
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Members', used: usage.members, max: limits.members },
                { label: 'Issues', used: usage.issues, max: limits.issues },
              ].map(({ label, used, max }) => (
                <div key={label} className="p-3 bg-linear-surface rounded-md">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-linear-text-secondary">{label}</span>
                    <span className="text-xs text-linear-text-tertiary">
                      {used}{max ? ` / ${max}` : ''}
                    </span>
                  </div>
                  {max && (
                    <div className="h-1 bg-linear-border rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          used / max > 0.9 ? "bg-linear-error" :
                          used / max > 0.7 ? "bg-linear-warning" : "bg-linear-accent"
                        )}
                        style={{ width: `${Math.min(100, (used / max) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {billing?.currentPeriodEnd && (
              <p className="text-xs text-linear-text-tertiary">
                Billing period ends {new Date(billing.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Plan comparison */}
      <div className="grid gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          return (
            <div
              key={plan.id}
              className={cn(
                "rounded-lg border p-5 flex flex-col gap-4 transition-all",
                isCurrent
                  ? "border-linear-accent bg-linear-accent-light"
                  : "border-linear-border bg-linear-surface hover:border-linear-border-hover"
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-linear-text">{plan.name}</h3>
                  {isCurrent && (
                    <Badge variant="accent" className="text-[10px]">Current</Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold text-linear-text">{plan.price}</span>
                  {plan.interval && (
                    <span className="text-xs text-linear-text-tertiary">{plan.interval}</span>
                  )}
                </div>
                <p className="mt-2 text-xs text-linear-text-secondary">{plan.description}</p>
              </div>

              <ul className="space-y-1.5 flex-1">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2 text-xs text-linear-text-secondary">
                    <CheckCircle2 className="w-3.5 h-3.5 text-linear-success shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>

              {plan.cta && !isCurrent && (
                <Button
                  size="sm"
                  disabled={!!isUpgrading}
                  onClick={() => handleUpgrade(plan.id)}
                  className="w-full gap-1.5"
                >
                  {isUpgrading === plan.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  {plan.cta}
                </Button>
              )}
              {isCurrent && (
                <div className="text-xs text-center text-linear-accent font-medium py-1">
                  Active plan
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Invoice history */}
      {invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-linear-surface rounded-md text-sm">
                <div>
                  <span className="font-medium text-linear-text">
                    ${(inv.amount / 100).toFixed(2)} {inv.currency}
                  </span>
                  <span className="ml-3 text-linear-text-secondary">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={inv.status === 'PAID' ? 'success' : 'warning'} className="text-[10px]">
                    {inv.status}
                  </Badge>
                  {inv.pdfUrl && (
                    <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-linear-accent hover:text-linear-accent-hover">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
