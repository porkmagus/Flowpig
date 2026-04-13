import { z } from 'zod';

export const NoteVersionSchema = z.object({
  id: z.string(),
  version: z.number(),
  createdAt: z.string(),
  createdBy: z.object({
    id: z.string(),
    name: z.string().nullable(),
    image: z.string().nullable(),
  }).optional(),
  isCurrent: z.boolean(),
  snapshot: z.object({
    title: z.string(),
    content: z.record(z.any()),
    emoji: z.string().nullable(),
  }).nullable().optional(),
  changeDescription: z.string().optional(),
});

export const IssueHistoryItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  description: z.string(),
  metadata: z.record(z.any()).nullable(),
  createdAt: z.string(),
  actor: z.object({
    id: z.string(),
    name: z.string().nullable(),
    image: z.string().nullable(),
  }),
});

export type NoteVersion = z.infer<typeof NoteVersionSchema>;
export type IssueHistoryItem = z.infer<typeof IssueHistoryItemSchema>;
