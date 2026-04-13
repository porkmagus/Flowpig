import type { FastifyInstance } from 'fastify';
import { requireAuth, type AuthenticatedRequest } from '../../plugins/auth.js';
import { extractWorkspace, type WorkspaceRequest } from '../../middleware/workspace.js';
import { CreateNoteSchema, UpdateNoteSchema } from '@flowpigdev/contracts';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

export default async function noteRoutes(fastify: FastifyInstance) {
  // List notes in workspace
  fastify.get('/', { 
    preHandler: [requireAuth, extractWorkspace] 
  }, async (request: WorkspaceRequest, reply) => {
    const { search, parentId, page = '1', limit = '50' } = 
      request.query as { 
        search?: string;
        parentId?: string;
        page?: string;
        limit?: string;
      };

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      workspaceId: request.workspace!.id,
      deletedAt: null,
      isArchived: false,
    };

    if (parentId) {
      where.parentId = parentId;
    } else {
      where.parentId = null; // Root notes only by default
    }

    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const [notes, total] = await Promise.all([
      fastify.prisma.note.findMany({
        where,
        include: {
          creator: {
            select: { id: true, name: true, image: true },
          },
          lastEditor: {
            select: { id: true, name: true, image: true },
          },
          _count: {
            select: { 
              children: { where: { deletedAt: null, isArchived: false } },
              comments: { where: { deletedAt: null } },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limitNum,
      }),
      fastify.prisma.note.count({ where }),
    ]);

    return {
      notes: notes.map(note => ({
        id: note.id,
        title: note.title,
        slug: note.slug,
        emoji: note.emoji,
        coverImage: note.coverImage,
        isArchived: note.isArchived,
        isPublished: note.isPublished,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
        creator: note.creator,
        lastEditor: note.lastEditor,
        childCount: note._count.children,
        commentCount: note._count.comments,
      })),
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        hasMore: skip + notes.length < total,
      },
    };
  });

  // Get single note
  fastify.get('/:noteId', { 
    preHandler: [requireAuth, extractWorkspace] 
  }, async (request: WorkspaceRequest, reply) => {
    const { noteId } = request.params as { noteId: string };

    const note = await fastify.prisma.note.findFirst({
      where: {
        OR: [
          { id: noteId },
          { slug: noteId, workspaceId: request.workspace!.id },
        ],
        workspaceId: request.workspace!.id,
        deletedAt: null,
      },
      include: {
        creator: {
          select: { id: true, name: true, image: true, email: true },
        },
        lastEditor: {
          select: { id: true, name: true, image: true, email: true },
        },
        parent: {
          select: { id: true, title: true, slug: true },
        },
        children: {
          where: { deletedAt: null, isArchived: false },
          select: {
            id: true,
            title: true,
            slug: true,
            emoji: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
        comments: {
          where: { deletedAt: null },
          include: {
            creator: {
              select: { id: true, name: true, image: true },
            },
            reactions: {
              where: { deletedAt: null },
              include: {
                user: {
                  select: { id: true, name: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        subscriptions: {
          where: { userId: (request as any).user!.id },
        },
      },
    });

    if (!note) {
      return reply.status(404).send({ error: 'Note not found' });
    }

    return {
      note: {
        id: note.id,
        title: note.title,
        slug: note.slug,
        content: note.content,
        emoji: note.emoji,
        coverImage: note.coverImage,
        isArchived: note.isArchived,
        isPublished: note.isPublished,
        accessSettings: note.accessSettings,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
        creator: note.creator,
        lastEditor: note.lastEditor,
        parent: note.parent,
        children: note.children,
        comments: note.comments.map(comment => ({
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt.toISOString(),
          updatedAt: comment.updatedAt.toISOString(),
          creator: comment.creator,
          reactions: comment.reactions,
        })),
        isSubscribed: note.subscriptions.length > 0,
      },
    };
  });

  // Create note
  fastify.post('/', { 
    preHandler: [requireAuth, extractWorkspace] 
  }, async (request: WorkspaceRequest, reply) => {
    const parseResult = CreateNoteSchema.safeParse(request.body);
    
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid input',
        details: parseResult.error.flatten(),
      });
    }

    const { title, content, emoji, parentId } = parseResult.data;
    const userId = (request as any).user!.id;
    const workspaceId = request.workspace!.id;

    // Generate unique slug
    let slug = generateSlug(title);
    let slugExists = await fastify.prisma.note.findUnique({
      where: { workspaceId_slug: { workspaceId, slug } },
    });

    let counter = 1;
    const baseSlug = slug;
    while (slugExists) {
      slug = `${baseSlug}-${counter}`;
      slugExists = await fastify.prisma.note.findUnique({
        where: { workspaceId_slug: { workspaceId, slug } },
      });
      counter++;
    }

    const note = await fastify.prisma.note.create({
      data: {
        title,
        slug,
        content: content || { type: 'doc', content: [] },
        emoji: emoji || '📄',
        workspaceId,
        createdById: userId,
        lastEditedById: userId,
        parentId: parentId || null,
      },
      include: {
        creator: {
          select: { id: true, name: true, image: true },
        },
        lastEditor: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    return reply.status(201).send({
      note: {
        id: note.id,
        title: note.title,
        slug: note.slug,
        emoji: note.emoji,
        coverImage: note.coverImage,
        isArchived: note.isArchived,
        isPublished: note.isPublished,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
        creator: note.creator,
        lastEditor: note.lastEditor,
      },
    });
  });

  // Update note
  fastify.patch('/:noteId', { 
    preHandler: [requireAuth, extractWorkspace] 
  }, async (request: WorkspaceRequest, reply) => {
    const { noteId } = request.params as { noteId: string };
    const userId = (request as any).user!.id;

    const parseResult = UpdateNoteSchema.safeParse(request.body);
    
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid input',
        details: parseResult.error.flatten(),
      });
    }

    const { title, content, emoji, coverImage, isArchived, isPublished } = parseResult.data;

    const existingNote = await fastify.prisma.note.findFirst({
      where: {
        OR: [
          { id: noteId },
          { slug: noteId, workspaceId: request.workspace!.id },
        ],
        workspaceId: request.workspace!.id,
        deletedAt: null,
      },
    });

    if (!existingNote) {
      return reply.status(404).send({ error: 'Note not found' });
    }

    const updateData: any = {
      lastEditedById: userId,
    };

    if (title !== undefined) {
      updateData.title = title;
      // Regenerate slug if title changed
      let slug = generateSlug(title);
      if (slug !== existingNote.slug) {
        let slugExists = await fastify.prisma.note.findUnique({
          where: { 
            workspaceId_slug: { 
              workspaceId: request.workspace!.id, 
              slug 
            } 
          },
        });

        let counter = 1;
        const baseSlug = slug;
        while (slugExists && slugExists.id !== existingNote.id) {
          slug = `${baseSlug}-${counter}`;
          slugExists = await fastify.prisma.note.findUnique({
            where: { 
              workspaceId_slug: { 
                workspaceId: request.workspace!.id, 
                slug 
              } 
            },
          });
          counter++;
        }
        updateData.slug = slug;
      }
    }

    if (content !== undefined) updateData.content = content;
    if (emoji !== undefined) updateData.emoji = emoji;
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    if (isArchived !== undefined) updateData.isArchived = isArchived;
    if (isPublished !== undefined) updateData.isPublished = isPublished;

    const note = await fastify.prisma.note.update({
      where: { id: existingNote.id },
      data: updateData,
      include: {
        creator: {
          select: { id: true, name: true, image: true },
        },
        lastEditor: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    return {
      note: {
        id: note.id,
        title: note.title,
        slug: note.slug,
        content: note.content,
        emoji: note.emoji,
        coverImage: note.coverImage,
        isArchived: note.isArchived,
        isPublished: note.isPublished,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
        creator: note.creator,
        lastEditor: note.lastEditor,
      },
    };
  });

  // Delete note (soft delete)
  fastify.delete('/:noteId', { 
    preHandler: [requireAuth, extractWorkspace] 
  }, async (request: WorkspaceRequest, reply) => {
    const { noteId } = request.params as { noteId: string };

    const existingNote = await fastify.prisma.note.findFirst({
      where: {
        OR: [
          { id: noteId },
          { slug: noteId, workspaceId: request.workspace!.id },
        ],
        workspaceId: request.workspace!.id,
        deletedAt: null,
      },
    });

    if (!existingNote) {
      return reply.status(404).send({ error: 'Note not found' });
    }

    await fastify.prisma.note.update({
      where: { id: existingNote.id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  });
}
