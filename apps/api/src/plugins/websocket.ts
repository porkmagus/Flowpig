import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import websocket from '@fastify/websocket';
import { prisma } from '@flowpigdev/db';

// Store connected clients
interface Client {
  socket: WebSocket;
  userId: string;
  workspaceId?: string;
  subscriptions: Set<string>;
}

const clients = new Map<string, Client>();

// Extend Fastify instance
declare module 'fastify' {
  interface FastifyInstance {
    websocket: typeof websocket;
    broadcastToWorkspace: (workspaceId: string, event: any) => void;
    broadcastToUser: (userId: string, event: any) => void;
  }
}

export const websocketPlugin = fp(async (fastify: FastifyInstance) => {
  await fastify.register(websocket);

  // WebSocket route
  fastify.get('/ws', { websocket: true }, (connection, req: FastifyRequest) => {
    const clientId = Math.random().toString(36).substring(7);
    
    const client: Client = {
      socket: connection.socket,
      userId: '', // Will be set after auth
      subscriptions: new Set(),
    };

    clients.set(clientId, client);

    console.log(`WebSocket client connected: ${clientId}`);

    // Handle messages
    connection.socket.on('message', async (rawMessage: Buffer) => {
      try {
        const message = JSON.parse(rawMessage.toString());

        switch (message.type) {
          case 'auth':
            // Authenticate client with session token
            try {
              const response = await fetch(`${process.env.BETTER_AUTH_URL}/auth/session`, {
                headers: {
                  'Cookie': `better-auth.session_token=${message.token}`,
                },
              });

              if (response.ok) {
                const session = await response.json();
                client.userId = session.user.id;
                
                // Send auth success
                connection.socket.send(JSON.stringify({
                  type: 'auth_success',
                  userId: client.userId,
                }));
              } else {
                connection.socket.send(JSON.stringify({
                  type: 'auth_error',
                  error: 'Invalid session',
                }));
              }
            } catch (error) {
              connection.socket.send(JSON.stringify({
                type: 'auth_error',
                error: 'Authentication failed',
              }));
            }
            break;

          case 'subscribe':
            // Subscribe to workspace updates
            if (message.workspaceId && client.userId) {
              // Verify user has access to workspace
              const member = await prisma.workspaceMember.findFirst({
                where: {
                  workspaceId: message.workspaceId,
                  userId: client.userId,
                  deletedAt: null,
                },
              });

              if (member) {
                client.workspaceId = message.workspaceId;
                client.subscriptions.add(`workspace:${message.workspaceId}`);
                
                connection.socket.send(JSON.stringify({
                  type: 'subscribed',
                  workspaceId: message.workspaceId,
                }));
              }
            }
            break;

          case 'unsubscribe':
            if (message.workspaceId) {
              client.subscriptions.delete(`workspace:${message.workspaceId}`);
              connection.socket.send(JSON.stringify({
                type: 'unsubscribed',
                workspaceId: message.workspaceId,
              }));
            }
            break;

          case 'ping':
            connection.socket.send(JSON.stringify({ type: 'pong' }));
            break;

          default:
            connection.socket.send(JSON.stringify({
              type: 'error',
              error: 'Unknown message type',
            }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        connection.socket.send(JSON.stringify({
          type: 'error',
          error: 'Invalid message format',
        }));
      }
    });

    // Handle disconnect
    connection.socket.on('close', () => {
      console.log(`WebSocket client disconnected: ${clientId}`);
      clients.delete(clientId);
    });

    // Send welcome message
    connection.socket.send(JSON.stringify({
      type: 'connected',
      clientId,
    }));
  });

  // Helper to broadcast to workspace
  fastify.decorate('broadcastToWorkspace', (workspaceId: string, event: any) => {
    const channel = `workspace:${workspaceId}`;
    
    clients.forEach((client) => {
      if (client.subscriptions.has(channel) && client.socket.readyState === 1) {
        client.socket.send(JSON.stringify(event));
      }
    });
  });

  // Helper to broadcast to specific user
  fastify.decorate('broadcastToUser', (userId: string, event: any) => {
    clients.forEach((client) => {
      if (client.userId === userId && client.socket.readyState === 1) {
        client.socket.send(JSON.stringify(event));
      }
    });
  });
});

// Hook to broadcast database changes
export async function broadcastIssueUpdated(
  fastify: FastifyInstance,
  workspaceId: string,
  issueId: string,
  changes: any
) {
  fastify.broadcastToWorkspace(workspaceId, {
    type: 'issue.updated',
    timestamp: Date.now(),
    payload: {
      workspaceId,
      issueId,
      changes,
    },
  });
}

export async function broadcastCommentCreated(
  fastify: FastifyInstance,
  workspaceId: string,
  issueId: string | undefined,
  noteId: string | undefined,
  commentId: string,
  comment: any
) {
  fastify.broadcastToWorkspace(workspaceId, {
    type: 'comment.created',
    timestamp: Date.now(),
    payload: {
      workspaceId,
      issueId,
      noteId,
      commentId,
      comment,
    },
  });
}

export async function broadcastNoteUpdated(
  fastify: FastifyInstance,
  workspaceId: string,
  noteId: string,
  changes: any
) {
  fastify.broadcastToWorkspace(workspaceId, {
    type: 'note.updated',
    timestamp: Date.now(),
    payload: {
      workspaceId,
      noteId,
      changes,
    },
  });
}

export async function broadcastNotificationCreated(
  fastify: FastifyInstance,
  userId: string,
  notificationId: string,
  notification: any
) {
  fastify.broadcastToUser(userId, {
    type: 'notification.created',
    timestamp: Date.now(),
    payload: {
      userId,
      notificationId,
      notification,
    },
  });
}
