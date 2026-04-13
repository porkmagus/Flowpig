import type { FastifyInstance } from 'fastify';
import { requireAuth, type AuthenticatedRequest } from '../../plugins/auth.js';
import { extractWorkspace, type WorkspaceRequest } from '../../middleware/workspace.js';

export default async function databaseRoutes(fastify: FastifyInstance) {
  // List databases in workspace
  fastify.get('/', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const workspaceId = request.workspace!.id;

    const databases = await fastify.prisma.database.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: { rows: true },
        },
        views: {
          select: { id: true, name: true, type: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      databases: databases.map(db => ({
        id: db.id,
        name: db.name,
        description: db.description,
        rowCount: db._count.rows,
        views: db.views,
        createdAt: db.createdAt.toISOString(),
        updatedAt: db.updatedAt.toISOString(),
      })),
    };
  });

  // Create database
  fastify.post('/', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const userId = (request as any).user!.id;
    const workspaceId = request.workspace!.id;
    const { name, description, properties } = request.body as {
      name: string;
      description?: string;
      properties?: Array<{
        name: string;
        type: string;
        config?: any;
      }>;
    };

    // Create database
    const db = await fastify.prisma.database.create({
      data: {
        workspaceId,
        name,
        description,
        accessSettings: {},
      },
    });

    // Create default properties if none provided
    const defaultProperties = properties || [
      { name: 'Name', type: 'TITLE', order: 0 },
      { name: 'Status', type: 'STATUS', order: 1 },
      { name: 'Assignee', type: 'PERSON', order: 2 },
    ];

    await fastify.prisma.databaseProperty.createMany({
      data: defaultProperties.map((prop, index) => ({
        databaseId: db.id,
        name: prop.name,
        type: prop.type,
        config: prop.config || {},
        order: prop.order ?? index,
      })),
    });

    // Create default view (table)
    await fastify.prisma.databaseView.create({
      data: {
        databaseId: db.id,
        name: 'Table',
        type: 'TABLE',
        config: {},
      },
    });

    return reply.status(201).send({ database: { id: db.id, name: db.name } });
  });

  // Get database with properties and rows
  fastify.get('/:databaseId', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { databaseId } = request.params as { databaseId: string };
    const { viewId, page = '1', limit = '50' } = request.query as {
      viewId?: string;
      page?: string;
      limit?: string;
    };

    const database = await fastify.prisma.database.findFirst({
      where: {
        id: databaseId,
        workspaceId: request.workspace!.id,
        deletedAt: null,
      },
      include: {
        properties: {
          orderBy: { order: 'asc' },
        },
        views: true,
      },
    });

    if (!database) {
      return reply.status(404).send({ error: 'Database not found' });
    }

    // Get rows
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const [rows, total] = await Promise.all([
      fastify.prisma.databaseRow.findMany({
        where: {
          databaseId,
          deletedAt: null,
        },
        include: {
          cells: {
            include: {
              property: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      fastify.prisma.databaseRow.count({
        where: { databaseId, deletedAt: null },
      }),
    ]);

    return {
      database: {
        id: database.id,
        name: database.name,
        description: database.description,
        properties: database.properties,
        views: database.views,
        accessSettings: database.accessSettings,
      },
      rows: rows.map(row => ({
        id: row.id,
        cells: row.cells.reduce((acc, cell) => {
          acc[cell.property.name] = cell.value;
          return acc;
        }, {} as Record<string, any>),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        hasMore: pageNum * limitNum < total,
      },
    };
  });

  // Create database row
  fastify.post('/:databaseId/rows', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { databaseId } = request.params as { databaseId: string };
    const { cells } = request.body as { cells: Record<string, any> };

    const database = await fastify.prisma.database.findFirst({
      where: {
        id: databaseId,
        workspaceId: request.workspace!.id,
        deletedAt: null,
      },
      include: { properties: true },
    });

    if (!database) {
      return reply.status(404).send({ error: 'Database not found' });
    }

    // Create row
    const row = await fastify.prisma.databaseRow.create({
      data: {
        databaseId,
      },
    });

    // Create cells
    for (const [propertyName, value] of Object.entries(cells)) {
      const property = database.properties.find(p => p.name === propertyName);
      if (property) {
        await fastify.prisma.databaseCell.create({
          data: {
            rowId: row.id,
            propertyId: property.id,
            value: value,
          },
        });
      }
    }

    return reply.status(201).send({ row: { id: row.id } });
  });

  // Update database row
  fastify.patch('/:databaseId/rows/:rowId', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { databaseId, rowId } = request.params as { databaseId: string; rowId: string };
    const { cells } = request.body as { cells: Record<string, any> };

    const database = await fastify.prisma.database.findFirst({
      where: {
        id: databaseId,
        workspaceId: request.workspace!.id,
        deletedAt: null,
      },
      include: { properties: true },
    });

    if (!database) {
      return reply.status(404).send({ error: 'Database not found' });
    }

    // Update cells
    for (const [propertyName, value] of Object.entries(cells)) {
      const property = database.properties.find(p => p.name === propertyName);
      if (property) {
        await fastify.prisma.databaseCell.upsert({
          where: {
            rowId_propertyId: {
              rowId,
              propertyId: property.id,
            },
          },
          update: { value },
          create: {
            rowId,
            propertyId: property.id,
            value,
          },
        });
      }
    }

    return { success: true };
  });

  // Delete database row
  fastify.delete('/:databaseId/rows/:rowId', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { rowId } = request.params as { rowId: string };

    await fastify.prisma.databaseRow.update({
      where: { id: rowId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  });
}
