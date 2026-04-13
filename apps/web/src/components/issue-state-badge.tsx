interface IssueStateBadgeProps {
  state: string;
  size?: 'sm' | 'md';
}

const stateConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  BACKLOG: { label: 'Backlog', color: '#6b7280', bgColor: '#f3f4f6' },
  TODO: { label: 'Todo', color: '#8b5cf6', bgColor: '#ede9fe' },
  IN_PROGRESS: { label: 'In Progress', color: '#3b82f6', bgColor: '#dbeafe' },
  IN_REVIEW: { label: 'In Review', color: '#f59e0b', bgColor: '#fef3c7' },
  DONE: { label: 'Done', color: '#10b981', bgColor: '#d1fae5' },
  CANCELLED: { label: 'Cancelled', color: '#ef4444', bgColor: '#fee2e2' },
};

export function IssueStateBadge({ state, size = 'sm' }: IssueStateBadgeProps) {
  const config = stateConfig[state] || { label: state, color: '#6b7280', bgColor: '#f3f4f6' };
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses}`}
      style={{ backgroundColor: config.bgColor, color: config.color }}
    >
      {/* Status circle indicator */}
      <span 
        className="w-2 h-2 rounded-full" 
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </span>
  );
}
