import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  X, 
  Plus, 
  Sparkles, 
  ArrowRight, 
  Loader2,
  Hash,
  Calendar,
  Flag,
  User,
  FolderKanban,
  Layers,
  Tag,
  GitBranch,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
  Target,
  Bookmark
} from 'lucide-react';
import { API_URL } from '~/lib/api';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';


interface CreateIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValues?: {
    title?: string;
    description?: string;
    priority?: string;
    teamId?: string;
    assigneeId?: string;
    projectId?: string;
    cycleId?: string;
  };
}

interface Team {
  id: string;
  name: string;
  key: string;
  color: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

interface Project {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

interface Cycle {
  id: string;
  name: string;
  number: number;
  isActive: boolean;
}

interface Label {
  id: string;
  name: string;
  color: string;
}

const priorities = [
  { id: 'URGENT', label: 'Urgent', color: 'text-priority-urgent', bg: 'bg-priority-urgent/10', icon: AlertCircle },
  { id: 'HIGH', label: 'High', color: 'text-priority-high', bg: 'bg-priority-high/10', icon: Flag },
  { id: 'MEDIUM', label: 'Medium', color: 'text-priority-medium', bg: 'bg-priority-medium/10', icon: Flag },
  { id: 'LOW', label: 'Low', color: 'text-priority-low', bg: 'bg-priority-low/10', icon: Flag },
  { id: 'NO_PRIORITY', label: 'No priority', color: 'text-priority-none', bg: 'bg-priority-none/10', icon: Flag },
];

const templates = [
  { id: 'bug', label: 'Bug Report', icon: AlertCircle, description: 'Report a bug or issue' },
  { id: 'feature', label: 'Feature Request', icon: Sparkles, description: 'Request a new feature' },
  { id: 'improvement', label: 'Improvement', icon: Zap, description: 'Suggest an improvement' },
  { id: 'task', label: 'Task', icon: CheckCircle2, description: 'General task or to-do' },
];

export function CreateIssueModal({ isOpen, onClose, initialValues }: CreateIssueModalProps) {
  const { workspace } = useParams();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'form' | 'ai' | 'template'>('form');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  
  // Form state
  const [title, setTitle] = useState(initialValues?.title || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [priority, setPriority] = useState(initialValues?.priority || 'NO_PRIORITY');
  const [teamId, setTeamId] = useState(initialValues?.teamId || '');
  const [assigneeId, setAssigneeId] = useState(initialValues?.assigneeId || '');
  const [projectId, setProjectId] = useState(initialValues?.projectId || '');
  const [cycleId, setCycleId] = useState(initialValues?.cycleId || '');
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  
  // UI state
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showCycleDropdown, setShowCycleDropdown] = useState(false);
  const [showLabelsDropdown, setShowLabelsDropdown] = useState(false);

  // Fetch workspace data
  const { data: teams } = useQuery({
    queryKey: ['teams', workspace],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/teams`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      const payload = await response.json() as { teams: Team[] };
      return payload.teams || [];
    },
    enabled: isOpen,
  });

  const { data: users } = useQuery({
    queryKey: ['workspace-users', workspace],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/members`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      const payload = await response.json() as { members: Array<{ user: User }> };
      return payload.members.map((member) => member.user);
    },
    enabled: isOpen,
  });

  const { data: projects } = useQuery({
    queryKey: ['projects', workspace],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/projects`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      const payload = await response.json() as { projects: Project[] };
      return payload.projects || [];
    },
    enabled: isOpen,
  });

  const { data: cycles } = useQuery({
    queryKey: ['cycles', workspace],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/cycles`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      const payload = await response.json() as { cycles: Cycle[] };
      return payload.cycles || [];
    },
    enabled: isOpen,
  });

  const { data: labels } = useQuery({
    queryKey: ['labels', workspace],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/labels`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      const payload = await response.json().catch(() => ({ labels: [] })) as { labels?: Label[] };
      return payload.labels || [];
    },
    enabled: isOpen,
  });

  // Create issue mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create issue');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues', workspace] });
      queryClient.invalidateQueries({ queryKey: ['my-issues', workspace] });
      onClose();
      resetForm();
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('NO_PRIORITY');
    setTeamId('');
    setAssigneeId('');
    setProjectId('');
    setCycleId('');
    setLabelIds([]);
    setDueDate('');
    setStep('form');
  };

  // AI title generation
  const generateWithAi = async () => {
    if (!description) return;
    setIsAiGenerating(true);
    
    try {
      const response = await fetch(`${API_URL}/ai/generate-issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ description }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setTitle(data.title);
        if (data.priority) setPriority(data.priority);
      }
    } catch (error) {
      console.error('AI generation failed:', error);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      teamId: teamId || undefined,
      assigneeId: assigneeId || undefined,
      projectId: projectId || undefined,
      cycleId: cycleId || undefined,
      labelIds: labelIds.length > 0 ? labelIds : undefined,
      dueDate: dueDate || undefined,
    });
  };

  const applyTemplate = (templateId: string) => {
    const templateMap: Record<string, { title: string; description: string }> = {
      bug: {
        title: '[Bug] ',
        description: '## Bug Description\n\n## Steps to Reproduce\n1. \n2. \n3. \n\n## Expected Behavior\n\n## Actual Behavior\n\n## Environment\n',
      },
      feature: {
        title: '[Feature] ',
        description: '## Feature Description\n\n## Problem Statement\n\n## Proposed Solution\n\n## Acceptance Criteria\n- [ ] \n- [ ] \n- [ ] \n',
      },
      improvement: {
        title: '[Improvement] ',
        description: '## Current State\n\n## Proposed Improvement\n\n## Benefits\n\n## Implementation Notes\n',
      },
      task: {
        title: '',
        description: '',
      },
    };

    const template = templateMap[templateId];
    if (template) {
      setTitle(template.title);
      setDescription(template.description);
    }
    setStep('form');
  };

  const teamOptions = teams ?? [];
  const userOptions = users ?? [];
  const projectOptions = projects ?? [];
  const cycleOptions = cycles ?? [];
  const labelOptions = labels ?? [];

  const selectedTeam = teamOptions.find((t: Team) => t.id === teamId);
  const selectedAssignee = userOptions.find((u: User) => u.id === assigneeId);
  const selectedProject = projectOptions.find((p: Project) => p.id === projectId);
  const selectedCycle = cycleOptions.find((c: Cycle) => c.id === cycleId);
  const selectedPriority = priorities.find((p) => p.id === priority);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Listen for open event from command palette
  useEffect(() => {
    const handleOpen = () => {
      resetForm();
    };
    window.addEventListener('open-create-issue', handleOpen);
    return () => window.removeEventListener('open-create-issue', handleOpen);
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-linear-text/30 backdrop-blur-sm" />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative w-full max-w-2xl bg-linear-elevated rounded-xl border border-linear-border shadow-elevation-modal overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {step === 'template' ? (
            // Template selection view
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-linear-text">Choose a template</h2>
                <button
                  onClick={() => setStep('form')}
                  className="text-sm text-linear-accent hover:text-linear-accent-hover"
                >
                  Skip template
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template.id)}
                    className="flex items-start gap-3 p-4 rounded-lg border border-linear-border hover:border-linear-accent hover:bg-linear-accent-light/50 transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-linear-accent-light flex items-center justify-center shrink-0">
                      <template.icon className="w-5 h-5 text-linear-accent" />
                    </div>
                    <div>
                      <h3 className="font-medium text-linear-text">{template.label}</h3>
                      <p className="text-sm text-linear-text-secondary mt-0.5">{template.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Main form
            <form onSubmit={handleSubmit}>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-linear-border">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-linear-accent flex items-center justify-center">
                    <Plus className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="font-medium text-linear-text">New Issue</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep('template')}
                    className="text-xs text-linear-text-secondary hover:text-linear-text px-2 py-1 rounded hover:bg-linear-surface transition-colors"
                  >
                    Templates
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 hover:bg-linear-surface rounded-md transition-colors"
                  >
                    <X className="w-4 h-4 text-linear-text-secondary" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 space-y-4">
                {/* Title input */}
                <div className="relative">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Issue title"
                    className="text-lg font-medium border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-linear-text-tertiary"
                    autoFocus
                  />
                  {description && !title && (
                    <button
                      type="button"
                      onClick={() => { void generateWithAi(); }}
                      disabled={isAiGenerating}
                      className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-linear-accent hover:text-linear-accent-hover bg-linear-accent-light px-2 py-1 rounded-md transition-colors"
                    >
                      {isAiGenerating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      {isAiGenerating ? 'Generating...' : 'Generate title'}
                    </button>
                  )}
                </div>

                {/* Description textarea */}
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description..."
                  rows={4}
                  className="w-full bg-linear-surface border border-linear-border rounded-lg px-3 py-2 text-sm text-linear-text placeholder:text-linear-text-tertiary focus:outline-none focus:ring-2 focus:ring-linear-accent focus:border-transparent resize-none"
                />

                {/* Properties toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Priority selector */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors",
                        selectedPriority?.bg,
                        selectedPriority?.color,
                        "border-current/20 hover:opacity-80"
                      )}
                    >
                      {selectedPriority && <selectedPriority.icon className="w-3.5 h-3.5" />}
                      <span>{selectedPriority?.label}</span>
                    </button>
                    
                    {showPriorityDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-40 bg-linear-elevated border border-linear-border rounded-lg shadow-elevation-2 z-50 py-1">
                        {priorities.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setPriority(p.id);
                              setShowPriorityDropdown(false);
                            }}
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-linear-surface transition-colors",
                              p.color
                            )}
                          >
                            <p.icon className="w-3.5 h-3.5" />
                            <span>{p.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Team selector */}
                  {teamOptions.length > 0 && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowTeamDropdown(!showTeamDropdown)}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-linear-border bg-linear-surface hover:bg-linear-border transition-colors",
                          selectedTeam && "text-linear-accent border-linear-accent/30 bg-linear-accent-light"
                        )}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>{selectedTeam?.name || 'Team'}</span>
                      </button>
                      
                      {showTeamDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-48 bg-linear-elevated border border-linear-border rounded-lg shadow-elevation-2 z-50 py-1">
                          {teamOptions.map((team: Team) => (
                            <button
                              key={team.id}
                              type="button"
                              onClick={() => {
                                setTeamId(team.id);
                                setShowTeamDropdown(false);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-linear-surface transition-colors text-left"
                            >
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: team.color }}
                              />
                              <span className="font-medium">{team.name}</span>
                              <span className="text-linear-text-tertiary">({team.key})</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Assignee selector */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-linear-border bg-linear-surface hover:bg-linear-border transition-colors",
                        selectedAssignee && "border-linear-accent/30 bg-linear-accent-light"
                      )}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>{selectedAssignee?.name || 'Assignee'}</span>
                    </button>
                    
                    {showAssigneeDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-linear-elevated border border-linear-border rounded-lg shadow-elevation-2 z-50 py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setAssigneeId('');
                            setShowAssigneeDropdown(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-linear-surface transition-colors text-left text-linear-text-secondary"
                        >
                          <span>No assignee</span>
                        </button>
                        {userOptions.map((user: User) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              setAssigneeId(user.id);
                              setShowAssigneeDropdown(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-linear-surface transition-colors text-left"
                          >
                            <div className="w-5 h-5 rounded-full bg-linear-accent text-white flex items-center justify-center text-[10px] font-medium">
                              {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                            </div>
                            <span className="font-medium">{user.name || user.email}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Project selector */}
                  {projectOptions.length > 0 && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-linear-border bg-linear-surface hover:bg-linear-border transition-colors",
                          selectedProject && "border-linear-accent/30 bg-linear-accent-light"
                        )}
                      >
                        <FolderKanban className="w-3.5 h-3.5" />
                        <span>{selectedProject?.name || 'Project'}</span>
                      </button>
                      
                      {showProjectDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-48 bg-linear-elevated border border-linear-border rounded-lg shadow-elevation-2 z-50 py-1">
                          <button
                            type="button"
                            onClick={() => {
                              setProjectId('');
                              setShowProjectDropdown(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-linear-surface transition-colors text-left text-linear-text-secondary"
                          >
                            <span>No project</span>
                          </button>
                          {projectOptions.map((project: Project) => (
                            <button
                              key={project.id}
                              type="button"
                              onClick={() => {
                                setProjectId(project.id);
                                setShowProjectDropdown(false);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-linear-surface transition-colors text-left"
                            >
                              <span className="font-medium">{project.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cycle selector */}
                  {cycleOptions.length > 0 && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowCycleDropdown(!showCycleDropdown)}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-linear-border bg-linear-surface hover:bg-linear-border transition-colors",
                          selectedCycle && "border-linear-accent/30 bg-linear-accent-light"
                        )}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{selectedCycle ? `Cycle ${selectedCycle.number}` : 'Cycle'}</span>
                      </button>
                      
                      {showCycleDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-48 bg-linear-elevated border border-linear-border rounded-lg shadow-elevation-2 z-50 py-1">
                          <button
                            type="button"
                            onClick={() => {
                              setCycleId('');
                              setShowCycleDropdown(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-linear-surface transition-colors text-left text-linear-text-secondary"
                          >
                            <span>No cycle</span>
                          </button>
                          {cycleOptions.map((cycle: Cycle) => (
                            <button
                              key={cycle.id}
                              type="button"
                              onClick={() => {
                                setCycleId(cycle.id);
                                setShowCycleDropdown(false);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-linear-surface transition-colors text-left"
                            >
                              <span className="font-medium">
                                {cycle.isActive && <span className="text-linear-success mr-1">●</span>}
                                Cycle {cycle.number}
                              </span>
                              {cycle.name && (
                                <span className="text-linear-text-secondary">- {cycle.name}</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Due date */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => (document.getElementById('due-date-input') as HTMLInputElement | null)?.showPicker?.()}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-linear-border bg-linear-surface hover:bg-linear-border transition-colors",
                        dueDate && "border-linear-accent/30 bg-linear-accent-light"
                      )}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{dueDate ? new Date(dueDate).toLocaleDateString() : 'Due date'}</span>
                    </button>
                    <input
                      id="due-date-input"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>

                  {/* Labels */}
                  {labelOptions.length > 0 && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowLabelsDropdown(!showLabelsDropdown)}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-linear-border bg-linear-surface hover:bg-linear-border transition-colors",
                          labelIds.length > 0 && "border-linear-accent/30 bg-linear-accent-light"
                        )}
                      >
                        <Tag className="w-3.5 h-3.5" />
                        <span>{labelIds.length > 0 ? `${labelIds.length} labels` : 'Labels'}</span>
                      </button>
                      
                      {showLabelsDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-48 bg-linear-elevated border border-linear-border rounded-lg shadow-elevation-2 z-50 py-1">
                          {labelOptions.map((label: Label) => (
                            <button
                              key={label.id}
                              type="button"
                              onClick={() => {
                                setLabelIds(prev => 
                                  prev.includes(label.id) 
                                    ? prev.filter(id => id !== label.id)
                                    : [...prev, label.id]
                                );
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-linear-surface transition-colors text-left"
                            >
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: label.color }}
                              />
                              <span className="font-medium">{label.name}</span>
                              {labelIds.includes(label.id) && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-linear-success ml-auto" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-linear-border bg-linear-surface/50">
                <div className="flex items-center gap-2 text-xs text-linear-text-secondary">
                  <kbd className="px-1.5 py-0.5 bg-linear-elevated border border-linear-border rounded text-[10px]">⌘↵</kbd>
                  <span>to create</span>
                  <kbd className="px-1.5 py-0.5 bg-linear-elevated border border-linear-border rounded text-[10px] ml-2">Esc</kbd>
                  <span>to close</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!title.trim() || createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Create issue
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook for managing modal state
export function useCreateIssueModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [initialValues, setInitialValues] = useState<CreateIssueModalProps['initialValues']>({});

  const open = useCallback((values?: CreateIssueModalProps['initialValues']) => {
    setInitialValues(values || {});
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setInitialValues({});
  }, []);

  // Listen for command palette event
  useEffect(() => {
    const handleOpen = () => open();
    window.addEventListener('open-create-issue', handleOpen);
    return () => window.removeEventListener('open-create-issue', handleOpen);
  }, [open]);

  return { isOpen, open, close, initialValues };
}
