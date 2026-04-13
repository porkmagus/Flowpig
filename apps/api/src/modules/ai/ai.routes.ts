import type { FastifyInstance } from 'fastify';
import { requireAuth, type AuthenticatedRequest } from '../../plugins/auth.js';
import { extractWorkspace, type WorkspaceRequest } from '../../middleware/workspace.js';
import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';

const aiProvider = process.env.AI_PROVIDER || 'openai';
const openAiApiKey = process.env.OPENAI_API_KEY
  || (aiProvider === 'openai' ? process.env.AI_API_KEY : undefined);
const anthropicApiKey = process.env.ANTHROPIC_API_KEY
  || (aiProvider === 'anthropic' ? process.env.AI_API_KEY : undefined);
const defaultModel = process.env.AI_MODEL
  || (aiProvider === 'anthropic' ? 'claude-3-5-sonnet-latest' : 'gpt-4o-mini');

// Initialize AI clients
const openai = openAiApiKey ? new OpenAI({
  apiKey: openAiApiKey,
  baseURL: process.env.AI_API_URL || undefined,
}) : null;

const anthropic = anthropicApiKey ? new Anthropic({
  apiKey: anthropicApiKey,
}) : null;

export default async function aiRoutes(fastify: FastifyInstance) {
  // Non-streaming chat endpoint
  fastify.post('/chat', { 
    preHandler: [requireAuth, extractWorkspace] 
  }, async (request: WorkspaceRequest, reply) => {
    const userId = (request as any).user!.id;
    const workspaceId = request.workspace!.id;
    const { messages, model = defaultModel, temperature = 0.7 } = request.body as {
      messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
      model?: string;
      temperature?: number;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return reply.status(400).send({ error: 'Messages are required' });
    }

    try {
      let response;

      if (model.startsWith('claude') && anthropic) {
        // Anthropic
        response = await anthropic.messages.create({
          model: model || defaultModel,
          max_tokens: 4096,
          temperature,
          messages: messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
        });

        return {
          message: {
            role: 'assistant',
            content: response.content[0].type === 'text' ? response.content[0].text : '',
          },
          usage: {
            input_tokens: response.usage.input_tokens,
            output_tokens: response.usage.output_tokens,
          },
        };
      } else if (openai) {
        // OpenAI
        response = await openai.chat.completions.create({
          model: model || defaultModel,
          temperature,
          messages,
        });

        return {
          message: response.choices[0].message,
          usage: response.usage,
        };
      } else {
        return reply.status(503).send({ 
          error: 'AI service not configured',
          message: 'Please configure AI_PROVIDER with AI_API_KEY, or set OPENAI_API_KEY / ANTHROPIC_API_KEY directly.' 
        });
      }
    } catch (error) {
      console.error('AI chat error:', error);
      return reply.status(500).send({ 
        error: 'AI request failed',
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Streaming chat endpoint with SSE
  fastify.post('/stream', { 
    preHandler: [requireAuth, extractWorkspace] 
  }, async (request: WorkspaceRequest, reply) => {
    const userId = (request as any).user!.id;
    const workspaceId = request.workspace!.id;
    const { messages, model = defaultModel, temperature = 0.7, conversationId } = request.body as {
      messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
      model?: string;
      temperature?: number;
      conversationId?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return reply.status(400).send({ error: 'Messages are required' });
    }

    // Set up SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    try {
      if (model.startsWith('claude') && anthropic) {
        // Anthropic streaming
        const stream = await anthropic.messages.create({
          model: model || defaultModel,
          max_tokens: 4096,
          temperature,
          messages: messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
          stream: true,
        });

        let fullContent = '';

        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta') {
            const delta = chunk.delta;
            if (delta.type === 'text_delta') {
              fullContent += delta.text;
              
              const event = {
                type: 'token',
                data: {
                  token: delta.text,
                  fullContent,
                },
              };
              
              reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
            }
          }
        }

        // Send completion event
        reply.raw.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        
      } else if (openai) {
        // OpenAI streaming
        const stream = await openai.chat.completions.create({
          model: model || defaultModel,
          temperature,
          messages,
          stream: true,
        });

        let fullContent = '';

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            fullContent += content;
            
            const event = {
              type: 'token',
              data: {
                token: content,
                fullContent,
              },
            };
            
            reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
          }
        }

        // Send completion event
        reply.raw.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);

        // If conversationId provided, save the message
        if (conversationId) {
          await fastify.prisma.agentMessage.create({
            data: {
              conversationId,
              role: 'ASSISTANT',
              content: fullContent,
            },
          });
        }

      } else {
        const error = {
          type: 'error',
          error: 'AI service not configured',
          message: 'Please configure AI_PROVIDER with AI_API_KEY, or set OPENAI_API_KEY / ANTHROPIC_API_KEY directly.',
        };
        reply.raw.write(`data: ${JSON.stringify(error)}\n\n`);
      }

      reply.raw.end();

    } catch (error) {
      console.error('AI streaming error:', error);
      const errorEvent = {
        type: 'error',
        error: 'Streaming failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
      reply.raw.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
      reply.raw.end();
    }
  });

  // Action confirmation endpoint
  fastify.post('/actions/:actionId/confirm', { 
    preHandler: [requireAuth, extractWorkspace] 
  }, async (request: WorkspaceRequest, reply) => {
    const userId = (request as any).user!.id;
    const { actionId } = request.params as { actionId: string };
    const { confirmed, data } = request.body as { confirmed: boolean; data?: any };

    if (typeof confirmed !== 'boolean') {
      return reply.status(400).send({ error: 'confirmed (boolean) is required' });
    }

    try {
      // Get the action
      const action = await fastify.prisma.agentAction.findFirst({
        where: {
          id: actionId,
          status: 'CONFIRMATION_REQUIRED',
        },
      });

      if (!action) {
        return reply.status(404).send({ error: 'Action not found or not awaiting confirmation' });
      }

      if (!confirmed) {
        // User rejected the action
        await fastify.prisma.agentAction.update({
          where: { id: actionId },
          data: {
            status: 'CANCELLED',
            confirmedAt: new Date(),
            confirmedBy: userId,
          },
        });

        return { success: true, status: 'cancelled' };
      }

      // User confirmed - execute the action
      await fastify.prisma.agentAction.update({
        where: { id: actionId },
        data: {
          status: 'EXECUTING',
          confirmedAt: new Date(),
          confirmedBy: userId,
        },
      });

      // Execute based on action type
      let result;
      try {
        switch (action.type) {
          case 'CREATE_ISSUE':
            result = await executeCreateIssue(fastify, action.payload, userId);
            break;
          case 'UPDATE_ISSUE':
            result = await executeUpdateIssue(fastify, action.payload, userId);
            break;
          case 'CREATE_NOTE':
            result = await executeCreateNote(fastify, action.payload, userId);
            break;
          case 'ADD_COMMENT':
            result = await executeAddComment(fastify, action.payload, userId);
            break;
          default:
            throw new Error(`Unknown action type: ${action.type}`);
        }

        // Mark as completed
        await fastify.prisma.agentAction.update({
          where: { id: actionId },
          data: {
            status: 'COMPLETED',
            executedAt: new Date(),
            result: JSON.stringify(result),
          },
        });

        return { 
          success: true, 
          status: 'completed',
          result,
        };

      } catch (execError) {
        // Mark as failed
        await fastify.prisma.agentAction.update({
          where: { id: actionId },
          data: {
            status: 'FAILED',
            executedAt: new Date(),
            error: execError instanceof Error ? execError.message : 'Execution failed',
          },
        });

        return reply.status(500).send({
          success: false,
          status: 'failed',
          error: execError instanceof Error ? execError.message : 'Execution failed',
        });
      }

    } catch (error) {
      console.error('Action confirmation error:', error);
      return reply.status(500).send({
        error: 'Failed to process action',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}

// Action execution helpers
async function executeCreateIssue(
  fastify: FastifyInstance,
  payload: any,
  userId: string
) {
  const { workspaceId, title, description, teamId, priority } = payload;

  // Similar to the issue create route logic
  const team = await fastify.prisma.team.findFirst({
    where: { id: teamId, workspaceId },
  });

  if (!team) throw new Error('Team not found');

  const lastIssue = await fastify.prisma.issue.findFirst({
    where: { teamId },
    orderBy: { identifier: 'desc' },
  });

  const issueNumber = lastIssue 
    ? parseInt(lastIssue.identifier.split('-')[1]) + 1 
    : 1;
  const identifier = `${team.key}-${issueNumber}`;

  const defaultState = await fastify.prisma.teamWorkflowState.findFirst({
    where: { teamId, isDefault: true },
  });

  const issue = await fastify.prisma.issue.create({
    data: {
      identifier,
      title,
      description: description || {},
      workspaceId,
      teamId,
      creatorId: userId,
      priority: priority || 'NO_PRIORITY',
      workflowStateId: defaultState?.id,
    },
  });

  return { issueId: issue.id, identifier: issue.identifier };
}

async function executeUpdateIssue(
  fastify: FastifyInstance,
  payload: any,
  userId: string
) {
  const { issueId, ...updates } = payload;

  const issue = await fastify.prisma.issue.update({
    where: { id: issueId },
    data: updates,
  });

  return { issueId: issue.id, identifier: issue.identifier };
}

async function executeCreateNote(
  fastify: FastifyInstance,
  payload: any,
  userId: string
) {
  const { workspaceId, title, content } = payload;

  let slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50);
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
      workspaceId,
      createdById: userId,
      lastEditedById: userId,
    },
  });

  return { noteId: note.id, slug: note.slug };
}

async function executeAddComment(
  fastify: FastifyInstance,
  payload: any,
  userId: string
) {
  const { workspaceId, issueId, content } = payload;

  const comment = await fastify.prisma.comment.create({
    data: {
      content,
      issueId,
      workspaceId,
      createdById: userId,
    },
  });

  return { commentId: comment.id };
}
