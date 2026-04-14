import type { FastifyInstance } from 'fastify';

export default async function notePublicRoutes(fastify: FastifyInstance) {
  fastify.get('/:token', async (request, reply) => {
    const { token } = request.params as { token: string };

    const note = await fastify.prisma.note.findUnique({
      where: { shareToken: token },
      include: {
        creator: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    if (!note || note.deletedAt) {
      return reply.status(404).send({ error: 'Note not found' });
    }

    if (note.publicAccess === 'PRIVATE') {
      return reply.status(403).send({ error: 'Note is not publicly accessible' });
    }

    return {
      note: {
        id: note.id,
        title: note.title,
        slug: note.slug,
        content: note.content,
        emoji: note.emoji,
        coverImage: note.coverImage,
        publicAccess: note.publicAccess,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
        creator: note.creator,
      },
      accessLevel: note.publicAccess,
    };
  });
}