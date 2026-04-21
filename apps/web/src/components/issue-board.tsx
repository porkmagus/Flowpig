import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { motion } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '~/lib/utils';
import { Badge } from '~/components/ui/badge';
import { AlertTriangle, Flag, CircleDot } from 'lucide-react';

interface BoardIssue {
  id: string;
  identifier: string;
  title: string;
  state: string;
  priority: string;
  assignee: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  workflowState: {
    id: string;
    name: string;
    color: string;
    category: string;
  } | null;
  labels: Array<{ id: string; name: string; color: string }>;
}

interface IssueBoardProps {
  issues: BoardIssue[];
  onStateChange?: (issueId: string, newState: string) => void;
}

const states = [
  { id: 'BACKLOG', label: 'Backlog', color: '#6E6E6E' },
  { id: 'TODO', label: 'Todo', color: '#6E6E6E' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: '#F2A50C' },
  { id: 'DONE', label: 'Done', color: '#0D9B6A' },
  { id: 'CANCELED', label: 'Canceled', color: '#D13B3B' },
];

const priorities = [
  { id: 'URGENT', color: '#D13B3B', icon: AlertTriangle },
  { id: 'HIGH', color: '#F2A50C', icon: Flag },
  { id: 'MEDIUM', color: '#6E6E6E', icon: Flag },
  { id: 'LOW', color: '#8E8E8E', icon: Flag },
  { id: 'NO_PRIORITY', color: '#2A2A2A', icon: CircleDot },
];

function BoardCard({
  issue,
  isOverlay,
}: {
  issue: BoardIssue;
  isOverlay?: boolean;
}) {
  const { workspace } = useParams();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: issue.id,
    data: { issue },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const priorityConfig = priorities.find((p) => p.id === issue.priority);

  const cardContent = (
    <>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-[11px] text-linear-text-tertiary font-mono">
          {issue.identifier}
        </span>
        {priorityConfig && (
          <priorityConfig.icon
            className="w-3.5 h-3.5 shrink-0"
            style={{ color: priorityConfig.color }}
          />
        )}
      </div>
      <p className="text-sm text-linear-text leading-snug mb-2">
        {issue.title}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 flex-wrap">
          {issue.labels.slice(0, 2).map((label) => (
            <span
              key={label.id}
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${label.color}20`,
                color: label.color,
              }}
            >
              {label.name}
            </span>
          ))}
        </div>
        {issue.assignee && (
          <div className="w-5 h-5 rounded-full bg-linear-surface border border-linear-border flex items-center justify-center text-[10px] text-linear-text-secondary">
            {issue.assignee.name?.charAt(0).toUpperCase() || '?'}
          </div>
        )}
      </div>
    </>
  );

  if (isOverlay) {
    return (
      <div className="bg-linear-elevated rounded-md border border-linear-border-hover p-3 shadow-lg rotate-2 w-64 opacity-95 cursor-grabbing">
        {cardContent}
      </div>
    );
  }

  return (
    <Link
      to={`/${workspace}/issues/${issue.id}`}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'block bg-linear-elevated rounded-md border border-linear-border hover:border-linear-border-hover p-3 transition-colors group cursor-grab',
        isDragging && 'opacity-30'
      )}
      onClick={(e) => {
        // Let the click go through to the link, but prevent drag-click conflicts
      }}
    >
      {cardContent}
    </Link>
  );
}

function BoardColumn({
  state,
  issues,
}: {
  state: (typeof states)[number];
  issues: BoardIssue[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: state.id,
    data: { stateId: state.id },
  });

  return (
    <div className="flex-shrink-0 w-72 bg-linear-surface rounded-lg border border-linear-border flex flex-col max-h-[calc(100vh-220px)]">
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-linear-border">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: state.color }}
          />
          <span className="text-sm font-medium text-linear-text">
            {state.label}
          </span>
        </div>
        <span className="text-xs text-linear-text-tertiary">
          {issues.length}
        </span>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 overflow-y-auto p-2 space-y-2 transition-colors',
          isOver && 'bg-linear-accent-light/30 rounded-b-lg'
        )}
      >
        {issues.map((issue) => (
          <BoardCard key={issue.id} issue={issue} />
        ))}
      </div>
    </div>
  );
}

export function IssueBoard({ issues, onStateChange }: IssueBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const columns = useMemo(() => {
    return states.map((state) => ({
      ...state,
      issues: issues.filter((issue) => issue.state === state.id),
    }));
  }, [issues]);

  const activeIssue = useMemo(
    () => issues.find((i) => i.id === activeId) || null,
    [issues, activeId]
  );

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const newStateId = over.id as string;
    const issueId = active.id as string;
    const issue = issues.find((i) => i.id === issueId);

    if (issue && issue.state !== newStateId && onStateChange) {
      onStateChange(issueId, newStateId);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-2">
        {columns.map((column) => (
          <BoardColumn
            key={column.id}
            state={column}
            issues={column.issues}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeIssue ? <BoardCard issue={activeIssue} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
