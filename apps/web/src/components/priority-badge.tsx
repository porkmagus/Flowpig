interface PriorityBadgeProps {
  priority: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const priorityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  URGENT: { label: 'Urgent', color: '#ef4444', bgColor: '#fef2f2' },
  HIGH: { label: 'High', color: '#f97316', bgColor: '#fff7ed' },
  MEDIUM: { label: 'Medium', color: '#eab308', bgColor: '#fefce8' },
  LOW: { label: 'Low', color: '#3b82f6', bgColor: '#eff6ff' },
  NO_PRIORITY: { label: 'No priority', color: '#6b7280', bgColor: '#f9fafb' },
};

export function PriorityBadge({ priority, showLabel = true, size = 'sm' }: PriorityBadgeProps) {
  const config = priorityConfig[priority] || priorityConfig.NO_PRIORITY;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses}`}
      style={{ backgroundColor: config.bgColor, color: config.color }}
    >
      {/* Priority indicator dots */}
      <span className="flex gap-0.5">
        {priority === 'URGENT' && (
          <>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
          </>
        )}
        {priority === 'HIGH' && (
          <>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
          </>
        )}
        {priority === 'MEDIUM' && (
          <>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
          </>
        )}
        {priority === 'LOW' && (
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
        )}
        {priority === 'NO_PRIORITY' && (
          <span className="w-1.5 h-1.5 rounded-full bg-linear-elevated" />
        )}
      </span>
      {showLabel && config.label}
    </span>
  );
}
