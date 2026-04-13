import type { FastifyInstance } from 'fastify';
import { requireAuth, type AuthenticatedRequest } from '../../plugins/auth.js';
import { extractWorkspace, type WorkspaceRequest } from '../../middleware/workspace.js';

// Branch name generation helpers
function sanitizeBranchName(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\-]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
}

function generateBranchName(teamKey: string, issueNumber: number, title: string): string {
  const sanitized = sanitizeBranchName(title);
  return `${teamKey.toLowerCase()}/${issueNumber}-${sanitized}`;
}

export default async function gitIntegrationRoutes(fastify: FastifyInstance) {
  // Get git integration status for workspace
  fastify.get('/status', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const workspaceId = request.workspace!.id;

    const integration = await fastify.prisma.gitIntegration.findUnique({
      where: { workspaceId },
      include: {
        pullRequests: {
          where: { state: 'OPEN' },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!integration) {
      return {
        connected: false,
        provider: null,
        organization: null,
      };
    }

    return {
      connected: integration.isActive,
      provider: integration.provider,
      organization: integration.organization,
      openPullRequests: integration.pullRequests.length,
    };
  });

  // Generate suggested branch name for issue
  fastify.get('/branch-suggestion/:issueId', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { issueId } = request.params as { issueId: string };
    const workspaceId = request.workspace!.id;

    const issue = await fastify.prisma.issue.findFirst({
      where: {
        id: issueId,
        workspaceId,
        deletedAt: null,
      },
      include: {
        team: {
          select: { key: true },
        },
      },
    });

    if (!issue) {
      return reply.status(404).send({ error: 'Issue not found' });
    }

    // Parse issue number from identifier (e.g., "TEAM-123" -> 123)
    const issueNumber = parseInt(issue.identifier.split('-')[1]) || 0;
    const branchName = generateBranchName(issue.team.key, issueNumber, issue.title);

    // Get existing branches for this issue
    const existingLinks = await fastify.prisma.issueGitLink.findMany({
      where: {
        issueId,
        branchName: { not: null },
      },
      select: { branchName: true },
    });

    return {
      suggestedBranch: branchName,
      existingBranches: existingLinks.map((l) => l.branchName),
      copyCommand: `git checkout -b ${branchName}`,
    };
  });

  // Get linked PRs and commits for an issue
  fastify.get('/issue/:issueId/links', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { issueId } = request.params as { issueId: string };
    const workspaceId = request.workspace!.id;

    const issue = await fastify.prisma.issue.findFirst({
      where: {
        id: issueId,
        workspaceId,
        deletedAt: null,
      },
    });

    if (!issue) {
      return reply.status(404).send({ error: 'Issue not found' });
    }

    const links = await fastify.prisma.issueGitLink.findMany({
      where: { issueId },
      include: {
        pullRequest: {
          include: {
            repository: {
              select: { fullName: true, url: true },
            },
          },
        },
        commit: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const pullRequests = links
      .filter((l) => l.pullRequest)
      .map((l) => ({
        id: l.pullRequest!.id,
        number: l.pullRequest!.number,
        title: l.pullRequest!.title,
        state: l.pullRequest!.state,
        url: l.pullRequest!.url,
        branchName: l.pullRequest!.branchName,
        draft: l.pullRequest!.draft,
        author: {
          name: l.pullRequest!.authorName,
          avatar: l.pullRequest!.authorAvatar,
        },
        repository: l.pullRequest!.repository,
        mergedAt: l.pullRequest!.mergedAt?.toISOString(),
        createdAt: l.pullRequest!.createdAt.toISOString(),
        linkType: l.linkType,
      }));

    const commits = links
      .filter((l) => l.commit)
      .map((l) => ({
        id: l.commit!.id,
        sha: l.commit!.sha.substring(0, 7),
        fullSha: l.commit!.sha,
        message: l.commit!.message,
        author: {
          name: l.commit!.authorName,
          email: l.commit!.authorEmail,
        },
        url: l.commit!.url,
        authorDate: l.commit!.authorDate.toISOString(),
        linkType: l.linkType,
      }));

    const branches = links
      .filter((l) => l.branchName && !l.pullRequestId)
      .map((l) => l.branchName!)
      .filter((v, i, a) => a.indexOf(v) === i); // Unique

    return {
      pullRequests,
      commits,
      branches,
      summary: {
        openPRs: pullRequests.filter((pr) => pr.state === 'OPEN').length,
        mergedPRs: pullRequests.filter((pr) => pr.state === 'MERGED').length,
        totalCommits: commits.length,
      },
    };
  });

  // Manually link a branch/PR to an issue
  fastify.post('/issue/:issueId/link', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { issueId } = request.params as { issueId: string };
    const workspaceId = request.workspace!.id;
    const { branchName, prUrl, prNumber, prTitle } = request.body as {
      branchName?: string;
      prUrl?: string;
      prNumber?: number;
      prTitle?: string;
    };

    const issue = await fastify.prisma.issue.findFirst({
      where: {
        id: issueId,
        workspaceId,
        deletedAt: null,
      },
    });

    if (!issue) {
      return reply.status(404).send({ error: 'Issue not found' });
    }

    // Check for existing link with same branch
    if (branchName) {
      const existing = await fastify.prisma.issueGitLink.findFirst({
        where: {
          issueId,
          branchName,
        },
      });

      if (existing) {
        return reply.status(400).send({ error: 'Branch already linked to this issue' });
      }
    }

    const link = await fastify.prisma.issueGitLink.create({
      data: {
        issueId,
        branchName: branchName || null,
        linkType: 'MANUAL',
      },
    });

    return {
      success: true,
      link: {
        id: link.id,
        branchName: link.branchName,
        linkType: link.linkType,
      },
    };
  });

  // Unlink a branch/PR from an issue
  fastify.delete('/issue/:issueId/link/:linkId', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { issueId, linkId } = request.params as { issueId: string; linkId: string };
    const workspaceId = request.workspace!.id;

    const issue = await fastify.prisma.issue.findFirst({
      where: {
        id: issueId,
        workspaceId,
        deletedAt: null,
      },
    });

    if (!issue) {
      return reply.status(404).send({ error: 'Issue not found' });
    }

    const link = await fastify.prisma.issueGitLink.findFirst({
      where: {
        id: linkId,
        issueId,
      },
    });

    if (!link) {
      return reply.status(404).send({ error: 'Link not found' });
    }

    await fastify.prisma.issueGitLink.delete({
      where: { id: linkId },
    });

    return { success: true };
  });

  // Get all pull requests for workspace
  fastify.get('/pull-requests', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const workspaceId = request.workspace!.id;
    const { state = 'OPEN', page = '1', limit = '20' } = request.query as {
      state?: 'OPEN' | 'CLOSED' | 'MERGED' | 'ALL';
      page?: string;
      limit?: string;
    };

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      integration: { workspaceId },
    };

    if (state !== 'ALL') {
      where.state = state;
    }

    const [pullRequests, total] = await Promise.all([
      fastify.prisma.gitPullRequest.findMany({
        where,
        include: {
          repository: {
            select: { fullName: true },
          },
          issueLinks: {
            include: {
              issue: {
                select: {
                  id: true,
                  identifier: true,
                  title: true,
                  state: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      fastify.prisma.gitPullRequest.count({ where }),
    ]);

    return {
      pullRequests: pullRequests.map((pr) => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        state: pr.state,
        url: pr.url,
        branchName: pr.branchName,
        draft: pr.draft,
        author: {
          name: pr.authorName,
          avatar: pr.authorAvatar,
        },
        repository: pr.repository,
        linkedIssues: pr.issueLinks.map((link) => link.issue),
        mergedAt: pr.mergedAt?.toISOString(),
        createdAt: pr.createdAt.toISOString(),
        updatedAt: pr.updatedAt.toISOString(),
      })),
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        hasMore: skip + pullRequests.length < total,
      },
    };
  });

  // Webhook endpoint for GitHub/GitLab events
  fastify.post('/webhook/:workspaceId', async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const signature = request.headers['x-hub-signature-256'] || request.headers['x-gitlab-token'];
    
    // Verify webhook signature (implementation depends on provider)
    // This is a simplified version - real implementation should verify signatures
    
    const event = request.headers['x-github-event'] || request.headers['x-gitlab-event'];
    const payload = request.body as any;

    try {
      const integration = await fastify.prisma.gitIntegration.findUnique({
        where: { workspaceId },
      });

      if (!integration || !integration.isActive) {
        return reply.status(404).send({ error: 'Integration not found' });
      }

      // Handle pull request events
      if (event === 'pull_request' || event === 'merge_request') {
        const pr = payload.pull_request || payload.merge_request;
        
        // Update or create PR
        const prData = {
          integrationId: integration.id,
          externalId: pr.id.toString(),
          number: pr.number,
          title: pr.title,
          description: pr.body,
          state: pr.merged ? 'MERGED' : pr.state === 'closed' ? 'CLOSED' : 'OPEN',
          url: pr.html_url || pr.web_url,
          branchName: pr.head?.ref || pr.source_branch,
          baseBranch: pr.base?.ref || pr.target_branch,
          authorName: pr.user?.login || pr.author?.username,
          authorAvatar: pr.user?.avatar_url || pr.author?.avatar_url,
          draft: pr.draft || false,
          mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
          closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
        };

        const upsertedPR = await fastify.prisma.gitPullRequest.upsert({
          where: { externalId: pr.id.toString() },
          update: prData,
          create: prData,
        });

        // Try to auto-link to issues based on branch name or PR title
        const branchMatch = prData.branchName.match(/([a-z]+)-(\d+)/i);
        if (branchMatch) {
          const [_, teamKey, issueNum] = branchMatch;
          
          const issue = await fastify.prisma.issue.findFirst({
            where: {
              workspaceId,
              identifier: { equals: `${teamKey.toUpperCase()}-${issueNum}`, mode: 'insensitive' },
              deletedAt: null,
            },
          });

          if (issue) {
            await fastify.prisma.issueGitLink.upsert({
              where: {
                issueId_pullRequestId_commitId: {
                  issueId: issue.id,
                  pullRequestId: upsertedPR.id,
                  commitId: '0', // Use special value for null since we can't have actual null in unique constraint
                },
              },
              update: {},
              create: {
                issueId: issue.id,
                pullRequestId: upsertedPR.id,
                branchName: prData.branchName,
                linkType: 'AUTO',
              },
            });
          }
        }
      }

      // Handle push events (for commits)
      if (event === 'push') {
        const commits = payload.commits || [];
        
        for (const commit of commits) {
          // Parse commit message for issue references
          const refs = commit.message.match(/([a-z]+)-(\d+)/gi);
          
          if (refs) {
            for (const ref of refs) {
              const [teamKey, issueNum] = ref.split('-');
              
              const issue = await fastify.prisma.issue.findFirst({
                where: {
                  workspaceId,
                  identifier: { equals: `${teamKey.toUpperCase()}-${issueNum}`, mode: 'insensitive' },
                  deletedAt: null,
                },
              });

              if (issue) {
                // Create or update commit
                const commitData = {
                  integrationId: integration.id,
                  sha: commit.id,
                  message: commit.message,
                  authorName: commit.author?.name || 'Unknown',
                  authorEmail: commit.author?.email || '',
                  authorDate: new Date(commit.timestamp),
                  url: commit.url,
                };

                const upsertedCommit = await fastify.prisma.gitCommit.upsert({
                  where: { sha: commit.id },
                  update: commitData,
                  create: commitData,
                });

                // Link to issue
                await fastify.prisma.issueGitLink.upsert({
                  where: {
                    issueId_pullRequestId_commitId: {
                      issueId: issue.id,
                      pullRequestId: '0',
                      commitId: upsertedCommit.id,
                    },
                  },
                  update: {},
                  create: {
                    issueId: issue.id,
                    commitId: upsertedCommit.id,
                    linkType: 'AUTO',
                  },
                });
              }
            }
          }
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Git webhook error:', error);
      return reply.status(500).send({ error: 'Failed to process webhook' });
    }
  });
}
