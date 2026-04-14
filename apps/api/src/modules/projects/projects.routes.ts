import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import { extractWorkspace, type WorkspaceRequest } from '../../middleware/workspace.js';

const ProjectStatusSchema = z.enum(['PLANNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED']);
const InitiativeStatusSchema = z.enum(['DISCOVERY', 'PLANNED', 'IN_PROGRESS', 'PAUSED', 'LAUNCHED', 'COMPLETED', 'CANCELLED']);

const CreateProjectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required').max(120),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  status: ProjectStatusSchema.optional(),
  startDate: z.string().datetime().optional().or(z.literal('')),
  targetDate: z.string().datetime().optional().or(z.literal('')),
});

const UpdateProjectSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  status: ProjectStatusSchema.optional(),
  startDate: z.string().datetime().optional().or(z.literal('')),
  targetDate: z.string().datetime().optional().or(z.literal('')),
});

const CreateInitiativeSchema = z.object({
  name: z.string().trim().min(1, 'Initiative name is required').max(120),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  status: InitiativeStatusSchema.optional(),
  targetDate: z.string().datetime().optional().or(z.literal('')),
  problemStatement: z.string().trim().max(2000).optional().or(z.literal('')),
  customerOutcome: z.string().trim().max(2000).optional().or(z.literal('')),
  successMetric: z.string().trim().max(500).optional().or(z.literal('')),
  projectId: z.string().optional(),
});

type ProjectWithRelations = Awaited<ReturnType<typeof getProjectOrThrow>>;
type InitiativeWithProjects = Awaited<ReturnType<typeof getInitiatives>>[number];

type ProjectIssueSummary = {
  state: string;
  id?: string;
  identifier?: string;
  title?: string;
  priority?: string;
  assignee?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
};

type ProjectSummary = Omit<ProjectWithRelations, 'issues' | 'initiative'> & {
  issues: ProjectIssueSummary[];
  initiative: InitiativeWithProjects | null;
};

function toOptionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toOptionalDate(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? new Date(trimmed) : null;
}

function computeProgress(issues: Array<{ state: string }>) {
  if (issues.length === 0) {
    return 0;
  }

  const completed = issues.filter((issue) => issue.state === 'DONE').length;
  return Math.round((completed / issues.length) * 100);
}

function formatInitiative(initiative: InitiativeWithProjects) {
  const projectProgress = initiative.projects.map((project) => computeProgress(project.issues));
  const progress = projectProgress.length
    ? Math.round(projectProgress.reduce((sum, value) => sum + value, 0) / projectProgress.length)
    : 0;

  return {
    id: initiative.id,
    slug: initiative.id,
    name: initiative.name,
    description: initiative.description,
    status: initiative.status,
    targetDate: initiative.targetDate?.toISOString() || null,
    problemStatement: initiative.problemStatement,
    customerOutcome: initiative.customerOutcome,
    successMetric: initiative.successMetric,
    createdAt: initiative.createdAt.toISOString(),
    updatedAt: initiative.updatedAt.toISOString(),
    progress,
    projects: initiative.projects.map((project) => ({
      id: project.id,
      name: project.name,
      status: project.status,
      progress: computeProgress(project.issues),
      issueCount: project.issues.length,
    })),
  };
}

function formatProject(project: ProjectSummary, includeDetails = false) {
  const progress = computeProgress(project.issues);
  const initiative = project.initiative ? [formatInitiative(project.initiative)] : [];

  return {
    id: project.id,
    slug: project.id,
    name: project.name,
    description: project.description,
    emoji: '📁',
    color: null,
    status: project.status,
    startDate: project.startDate?.toISOString() || null,
    targetDate: project.targetDate?.toISOString() || null,
    progress,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    leadId: project.leadId,
    lead: null,
    teamId: null,
    team: null,
    _count: {
      issues: project.issues.length,
      initiatives: initiative.length,
    },
    initiatives: initiative,
    issues: includeDetails
      ? project.issues.map((issue) => ({
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          state: issue.state,
          priority: issue.priority,
          assignee: issue.assignee || null,
        }))
      : undefined,
  };
}

async function getProjectOrThrow(fastify: FastifyInstance, workspaceId: string, projectId: string) {
  const project = await fastify.prisma.project.findFirst({
    where: {
      id: projectId,
      workspaceId,
      deletedAt: null,
    },
    include: {
      issues: {
        where: { deletedAt: null },
        include: {
          assignee: {
            select: { id: true, name: true, image: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      initiative: {
        include: {
          projects: {
            where: { deletedAt: null },
            include: {
              issues: {
                where: { deletedAt: null },
                select: { state: true },
              },
            },
          },
        },
      },
    },
  });

  if (!project) {
    throw new Error('PROJECT_NOT_FOUND');
  }

  return project;
}

async function getInitiatives(fastify: FastifyInstance, workspaceId: string) {
  return fastify.prisma.initiative.findMany({
    where: {
      workspaceId,
      deletedAt: null,
    },
    include: {
      projects: {
        where: { deletedAt: null },
        include: {
          issues: {
            where: { deletedAt: null },
            select: { state: true },
          },
        },
      },
    },
    orderBy: [
      { updatedAt: 'desc' },
      { createdAt: 'desc' },
    ],
  });
}

export default async function projectRoutes(fastify: FastifyInstance) {
  fastify.get('/projects', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const workspaceId = request.workspace!.id;
    const { search, status } = request.query as { search?: string; status?: string };

    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
    };

    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    if (status?.trim()) {
      where.status = status.trim();
    }

    const projects = await fastify.prisma.project.findMany({
      where,
      include: {
        issues: {
          where: { deletedAt: null },
          select: { state: true },
        },
        initiative: {
          include: {
            projects: {
              where: { deletedAt: null },
              include: {
                issues: {
                  where: { deletedAt: null },
                  select: { state: true },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return reply.send({
      projects: projects.map((project) => formatProject(project, false)),
    });
  });

  fastify.post('/projects', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const parsed = CreateProjectSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid input',
        details: parsed.error.flatten(),
      });
    }

    const project = await fastify.prisma.project.create({
      data: {
        workspaceId: request.workspace!.id,
        name: parsed.data.name.trim(),
        description: toOptionalText(parsed.data.description),
        status: parsed.data.status,
        startDate: toOptionalDate(parsed.data.startDate),
        targetDate: toOptionalDate(parsed.data.targetDate),
      },
      include: {
        issues: {
          where: { deletedAt: null },
          select: { state: true },
        },
        initiative: {
          include: {
            projects: {
              where: { deletedAt: null },
              include: {
                issues: {
                  where: { deletedAt: null },
                  select: { state: true },
                },
              },
            },
          },
        },
      },
    });

    return reply.status(201).send({
      project: formatProject(project, false),
    });
  });

  fastify.get('/projects/:projectId', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { projectId } = request.params as { projectId: string };

    try {
      const project = await getProjectOrThrow(fastify, request.workspace!.id, projectId);
      return reply.send({ project: formatProject(project, true) });
    } catch (error) {
      if (error instanceof Error && error.message === 'PROJECT_NOT_FOUND') {
        return reply.status(404).send({ error: 'Project not found' });
      }

      throw error;
    }
  });

  fastify.patch('/projects/:projectId', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { projectId } = request.params as { projectId: string };
    const parsed = UpdateProjectSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid input',
        details: parsed.error.flatten(),
      });
    }

    const existing = await fastify.prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId: request.workspace!.id,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const project = await fastify.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
        ...(parsed.data.description !== undefined ? { description: toOptionalText(parsed.data.description) } : {}),
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
        ...(parsed.data.startDate !== undefined ? { startDate: toOptionalDate(parsed.data.startDate) } : {}),
        ...(parsed.data.targetDate !== undefined ? { targetDate: toOptionalDate(parsed.data.targetDate) } : {}),
      },
      include: {
        issues: {
          where: { deletedAt: null },
          include: {
            assignee: {
              select: { id: true, name: true, image: true },
            },
          },
        },
        initiative: {
          include: {
            projects: {
              where: { deletedAt: null },
              include: {
                issues: {
                  where: { deletedAt: null },
                  select: { state: true },
                },
              },
            },
          },
        },
      },
    });

    return reply.send({ project: formatProject(project, true) });
  });

  fastify.delete('/projects/:projectId', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { projectId } = request.params as { projectId: string };

    const existing = await fastify.prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId: request.workspace!.id,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    await fastify.prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date() },
    });

    return reply.status(204).send();
  });

  fastify.get('/initiatives', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const initiatives = await getInitiatives(fastify, request.workspace!.id);
    return reply.send({ initiatives: initiatives.map(formatInitiative) });
  });

  fastify.post('/initiatives', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const parsed = CreateInitiativeSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid input',
        details: parsed.error.flatten(),
      });
    }

    const workspaceId = request.workspace!.id;
    const { projectId } = parsed.data;

    if (projectId) {
      const project = await fastify.prisma.project.findFirst({
        where: {
          id: projectId,
          workspaceId,
          deletedAt: null,
        },
        select: { id: true, initiativeId: true },
      });

      if (!project) {
        return reply.status(404).send({ error: 'Project not found' });
      }

      if (project.initiativeId) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'This project is already linked to an initiative.',
        });
      }
    }

    const initiative = await fastify.prisma.$transaction(async (tx) => {
      const created = await tx.initiative.create({
        data: {
          workspaceId,
          name: parsed.data.name.trim(),
          description: toOptionalText(parsed.data.description),
          status: parsed.data.status,
          targetDate: toOptionalDate(parsed.data.targetDate),
          problemStatement: toOptionalText(parsed.data.problemStatement),
          customerOutcome: toOptionalText(parsed.data.customerOutcome),
          successMetric: toOptionalText(parsed.data.successMetric),
        },
      });

      if (projectId) {
        await tx.project.update({
          where: { id: projectId },
          data: { initiativeId: created.id },
        });
      }

      return tx.initiative.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          projects: {
            where: { deletedAt: null },
            include: {
              issues: {
                where: { deletedAt: null },
                select: { state: true },
              },
            },
          },
        },
      });
    });

    return reply.status(201).send({ initiative: formatInitiative(initiative) });
  });
}