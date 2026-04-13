import { z } from 'zod';

export const TriageIssueSchema = z.object({
  id: z.string(),
  identifier: z.string(),
  title: z.string(),
  description: z.record(z.any()).nullable(),
  priority: z.enum(['NO_PRIORITY', 'LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  state: z.string(),
  createdAt: z.string(),
  assignee: z.object({
    id: z.string(),
    name: z.string().nullable(),
    image: z.string().nullable(),
  }).nullable().optional(),
  creator: z.object({
    id: z.string(),
    name: z.string().nullable(),
    image: z.string().nullable(),
  }).optional(),
  workflowState: z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
  }).nullable().optional(),
  labels: z.array(z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
  })).optional(),
  commentCount: z.number().optional(),
});

export const TriageAssignSchema = z.object({
  assigneeId: z.string().optional(),
  workflowStateId: z.string().optional(),
});

export const TriageSnoozeSchema = z.object({
  days: z.number().min(1).max(30).default(7),
});

export const TriageDuplicateSchema = z.object({
  duplicateOfId: z.string(),
});

export const TriageDeclineSchema = z.object({
  reason: z.string().optional(),
});

export type TriageIssue = z.infer<typeof TriageIssueSchema>;
export type TriageAssignInput = z.infer<typeof TriageAssignSchema>;
export type TriageSnoozeInput = z.infer<typeof TriageSnoozeSchema>;
export type TriageDuplicateInput = z.infer<typeof TriageDuplicateSchema>;
export type TriageDeclineInput = z.infer<typeof TriageDeclineSchema>;

export interface TriageStats {
  totalTriage: number;
  totalTeamIssues: number;
  byPriority: {
    NO_PRIORITY: number;
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    URGENT: number;
  };
  oldestIssue: {
    identifier: string;
    title: string;
    createdAt: string;
    daysOld: number;
  } | null;
}
