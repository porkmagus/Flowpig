import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

// Extend request with workspace context
export interface WorkspaceRequest extends FastifyRequest {
  workspace?: {
    id: string;
    slug: string;
    role: string;
  };
}

export const workspaceContextPlugin = fp(async (fastify: FastifyInstance) => {
  // No global hook - we'll check workspace per-route
  // This plugin just prepares the type extension
});

// Middleware to extract and validate workspace from URL params
export async function extractWorkspace(
  request: WorkspaceRequest,
  reply: FastifyReply
) {
  const { workspaceId } = request.params as { workspaceId: string };
  
  if (!workspaceId) {
    reply.status(400).send({ error: 'Workspace identifier is required' });
    return;
  }

  // Frontend routes are slug-based, while some internal callers still use IDs.
  // Accept either form here so all workspace-scoped APIs resolve consistently.
  const member = await request.server.prisma.workspaceMember.findFirst({
    where: {
      userId: (request as any).user?.id,
      deletedAt: null,
      OR: [
        {
          workspace: {
            id: workspaceId,
            deletedAt: null,
          },
        },
        {
          workspace: {
            slug: workspaceId,
            deletedAt: null,
          },
        },
      ],
    },
    include: {
      workspace: {
        select: {
          id: true,
          slug: true,
        },
      },
    },
  });

  if (!member) {
    reply.status(403).send({ 
      error: 'Forbidden',
      message: 'You do not have access to this workspace' 
    });
    return;
  }

  request.workspace = {
    id: member.workspace.id,
    slug: member.workspace.slug,
    role: member.role,
  };
}
