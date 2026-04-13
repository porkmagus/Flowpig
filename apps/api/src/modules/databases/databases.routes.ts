import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import { extractWorkspace, type WorkspaceRequest } from '../../middleware/workspace.js';

export default async function databaseRoutes(fastify: FastifyInstance) {
  // List databases in workspace
  fastify.get('/', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest) => {
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
    const { page = '1', limit = '50' } = request.query as {
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
  }, async (request: WorkspaceRequest) => {
    const { rowId } = request.params as { rowId: string };

    await fastify.prisma.databaseRow.update({
      where: { id: rowId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  });

  // Calculate rollup values for a row
  fastify.get('/:databaseId/rows/:rowId/rollup', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { databaseId, rowId } = request.params as { databaseId: string; rowId: string };
    const workspaceId = request.workspace!.id;

    // Get database with rollup properties
    const database = await fastify.prisma.database.findFirst({
      where: {
        id: databaseId,
        workspaceId,
        deletedAt: null,
      },
      include: {
        properties: {
          where: { type: 'ROLLUP' },
        },
      },
    });

    if (!database) {
      return reply.status(404).send({ error: 'Database not found' });
    }

    const rollups: Record<string, any> = {};

    for (const property of database.properties) {
      const config = (property.config as any) || {};
      const {
        relationPropertyId,
        rollupPropertyId,
        function: rollupFunction = 'COUNT'
      } = config;

      if (!relationPropertyId) {
        rollups[property.name] = null;
        continue;
      }

      // Get the relation value to find related rows
      const relationCell = await fastify.prisma.databaseCell.findFirst({
        where: {
          rowId,
          property: {
            id: relationPropertyId,
          },
        },
      });

      const relatedRowIds: string[] = relationCell?.value?.rowIds || [];

      if (relatedRowIds.length === 0) {
        rollups[property.name] = rollupFunction === 'COUNT' ? 0 : null;
        continue;
      }

      // Calculate rollup based on function
      let value: any = null;

      switch (rollupFunction) {
        case 'COUNT':
          value = relatedRowIds.length;
          break;

        case 'SUM':
        case 'AVERAGE':
        case 'MIN':
        case 'MAX':
          if (rollupPropertyId) {
            const relatedCells = await fastify.prisma.databaseCell.findMany({
              where: {
                rowId: { in: relatedRowIds },
                propertyId: rollupPropertyId,
              },
            });

            const numbers = relatedCells
              .map(c => c.value)
              .filter(v => typeof v === 'number');

            if (numbers.length > 0) {
              switch (rollupFunction) {
                case 'SUM':
                  value = numbers.reduce((a, b) => a + b, 0);
                  break;
                case 'AVERAGE':
                  value = numbers.reduce((a, b) => a + b, 0) / numbers.length;
                  break;
                case 'MIN':
                  value = Math.min(...numbers);
                  break;
                case 'MAX':
                  value = Math.max(...numbers);
                  break;
              }
            }
          }
          break;

        case 'COUNT_VALUES':
          if (rollupPropertyId) {
            const relatedCells = await fastify.prisma.databaseCell.findMany({
              where: {
                rowId: { in: relatedRowIds },
                propertyId: rollupPropertyId,
              },
            });

            const allValues = relatedCells.flatMap(c => {
              const v = c.value;
              if (Array.isArray(v)) return v;
              if (v) return [v];
              return [];
            });

            value = allValues.length;
          }
          break;

        case 'UNIQUE_VALUES':
          if (rollupPropertyId) {
            const relatedCells = await fastify.prisma.databaseCell.findMany({
              where: {
                rowId: { in: relatedRowIds },
                propertyId: rollupPropertyId,
              },
            });

            const uniqueValues = new Set(
              relatedCells.map(c => JSON.stringify(c.value))
            );
            value = uniqueValues.size;
          }
          break;

        case 'SHOW_ORIGINAL':
          if (rollupPropertyId) {
            const relatedCells = await fastify.prisma.databaseCell.findMany({
              where: {
                rowId: { in: relatedRowIds },
                propertyId: rollupPropertyId,
              },
            });

            value = relatedCells.map(c => c.value);
          }
          break;

        default:
          value = relatedRowIds.length;
      }

      rollups[property.name] = value;
    }

    return { rollups };
  });

  // Get database statistics (counts, aggregations)
  fastify.get('/:databaseId/stats', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { databaseId } = request.params as { databaseId: string };
    const workspaceId = request.workspace!.id;

    const database = await fastify.prisma.database.findFirst({
      where: {
        id: databaseId,
        workspaceId,
        deletedAt: null,
      },
      include: {
        properties: true,
        _count: {
          select: { rows: { where: { deletedAt: null } } },
        },
      },
    });

    if (!database) {
      return reply.status(404).send({ error: 'Database not found' });
    }

    // Get property statistics
    const propertyStats = await Promise.all(
      database.properties
        .filter(p => ['SELECT', 'MULTI_SELECT', 'STATUS'].includes(p.type))
        .map(async (property) => {
          const cells = await fastify.prisma.databaseCell.findMany({
            where: {
              propertyId: property.id,
              row: { deletedAt: null },
            },
            select: { value: true },
          });

          const valueCounts: Record<string, number> = {};
          cells.forEach(cell => {
            const values = Array.isArray(cell.value)
              ? cell.value
              : [cell.value];
            values.forEach((v: any) => {
              if (v) {
                const key = typeof v === 'string' ? v : JSON.stringify(v);
                valueCounts[key] = (valueCounts[key] || 0) + 1;
              }
            });
          });

          return {
            propertyId: property.id,
            propertyName: property.name,
            type: property.type,
            valueCounts,
          };
        })
    );

    return {
      stats: {
        totalRows: database._count.rows,
        properties: propertyStats,
      },
    };
  });
}
