import { z } from 'zod';

export const CreateNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.record(z.string(), z.any()).default({ type: 'doc', content: [] }),
  emoji: z.string().optional(),
  parentId: z.string().optional(),
});

export const UpdateNoteSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.record(z.string(), z.any()).optional(),
  emoji: z.string().optional(),
  coverImage: z.string().optional(),
  isArchived: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});

export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;
export type UpdateNoteInput = z.infer<typeof UpdateNoteSchema>;

export interface NoteResponse {
  id: string;
  title: string;
  slug: string;
  content: Record<string, unknown>;
  emoji: string | null;
  coverImage: string | null;
  isArchived: boolean;
  isPublished: boolean;
  createdById: string;
  lastEditedById: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    name: string | null;
    image: string | null;
  };
  lastEditor?: {
    id: string;
    name: string | null;
    image: string | null;
  };
}
