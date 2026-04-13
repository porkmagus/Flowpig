import { z } from 'zod';

export const TimelineQuerySchema = z.object({
  teamId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  groupBy: z.enum(['team', 'project', 'assignee']).default('team'),
  includeCompleted: z.enum(['true', 'false']).default('false'),
});

export const RoadmapCycleSchema = z.object({
  id: z.string(),
  name: z.string(),
  number: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  isActive: z.boolean(),
  sprintGoal: z.string().nullable(),
});

export const RoadmapTeamSchema = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
  color: z.string(),
  cycles: z.array(RoadmapCycleSchema),
});

export const RoadmapProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  startDate: z.string().nullable(),
  targetDate: z.string().nullable(),
  issueCount: z.number(),
});

export const RoadmapInitiativeSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  targetDate: z.string().nullable(),
  description: z.string().nullable(),
  projects: z.array(RoadmapProjectSchema),
});

export const TimelineIssueSchema = z.object({
  id: z.string(),
  identifier: z.string(),
  title: z.string(),
  priority: z.enum(['NO_PRIORITY', 'LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  state: z.string(),
  dueDate: z.string().nullable(),
  createdAt: z.string(),
  team: z.object({
    id: z.string(),
    name: z.string(),
    key: z.string(),
    color: z.string(),
  }).nullable(),
  assignee: z.object({
    id: z.string(),
    name: z.string().nullable(),
    image: z.string().nullable(),
  }).nullable(),
  project: z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
  }).nullable(),
  cycle: z.object({
    id: z.string(),
    name: z.string(),
    startDate: z.string(),
    endDate: z.string(),
  }).nullable(),
  workflowState: z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
    category: z.string(),
  }).nullable(),
});

export const TimelineGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable(),
  issues: z.array(TimelineIssueSchema),
});

export type TimelineQuery = z.infer<typeof TimelineQuerySchema>;
export type RoadmapCycle = z.infer<typeof RoadmapCycleSchema>;
export type RoadmapTeam = z.infer<typeof RoadmapTeamSchema>;
export type RoadmapProject = z.infer<typeof RoadmapProjectSchema>;
export type RoadmapInitiative = z.infer<typeof RoadmapInitiativeSchema>;
export type TimelineIssue = z.infer<typeof TimelineIssueSchema>;
export type TimelineGroup = z.infer<typeof TimelineGroupSchema>;
