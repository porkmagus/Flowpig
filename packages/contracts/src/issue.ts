import { z } from 'zod';

export const CreateIssueSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.record(z.any()).optional(),
  teamId: z.string(),
  priority: z.enum(['NO_PRIORITY', 'LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assigneeId: z.string().optional().nullable(),
  labelIds: z.array(z.string()).optional(),
  dueDate: z.string().datetime().optional().nullable(),
});

export const UpdateIssueSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.record(z.any()).optional().nullable(),
  state: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']).optional(),
  priority: z.enum(['NO_PRIORITY', 'LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assigneeId: z.string().optional().nullable(),
  labelIds: z.array(z.string()).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  workflowStateId: z.string().optional(),
});

export type CreateIssueInput = z.infer<typeof CreateIssueSchema>;
export type UpdateIssueInput = z.infer<typeof UpdateIssueSchema>;

export interface IssueResponse {
  id: string;
  identifier: string;
  title: string;
  description: Record<string, unknown> | null;
  state: string;
  priority: string;
  creatorId: string;
  assigneeId: string | null;
  teamId: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
  assignee?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  creator?: {
    id: string;
    name: string | null;
    image: string | null;
  };
  labels?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}
