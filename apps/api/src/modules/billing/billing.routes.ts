import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth, type AuthenticatedRequest } from '../../plugins/auth.js';
import { extractWorkspace, type WorkspaceRequest } from '../../middleware/workspace.js';
import { prisma } from '@flowpigdev/db';

const PLAN_LIMITS = {
  FREE: {
    members: 5,
    issues: 500,
    storage_gb: 1,
    ai_requests_per_month: 50,
  },
  PRO: {
    members: 25,
    issues: 10000,
    storage_gb: 20,
    ai_requests_per_month: 500,
  },
  ENTERPRISE: {
    members: Infinity,
    issues: Infinity,
    storage_gb: Infinity,
    ai_requests_per_month: Infinity,
  },
} as const;

const STRIPE_PRICE_IDS: Record<string, string | undefined> = {
  PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY,
  PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY,
  ENTERPRISE_MONTHLY: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
};

async function getOrCreateBilling(workspaceId: string) {
  let billing = await prisma.billing.findUnique({ where: { workspaceId } });
  if (!billing) {
    billing = await prisma.billing.create({
      data: { workspaceId, plan: 'FREE', status: 'ACTIVE' },
    });
  }
  return billing;
}

export default async function billingRoutes(fastify: FastifyInstance) {
  // GET current billing status & usage
  fastify.get(
    '/',
    { preHandler: [requireAuth, extractWorkspace] },
    async (request: WorkspaceRequest, reply: FastifyReply) => {
      const workspaceId = request.workspace!.id;

      const billing = await getOrCreateBilling(workspaceId);
      const invoices = await prisma.invoice.findMany({
        where: { billingId: billing.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      const [memberCount, issueCount] = await Promise.all([
        prisma.workspaceMember.count({ where: { workspaceId } }),
        prisma.issue.count({ where: { workspaceId, deletedAt: null } }),
      ]);

      const plan = billing.plan as keyof typeof PLAN_LIMITS;
      const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;

      return reply.send({
        billing: {
          plan: billing.plan,
          status: billing.status,
          currentPeriodEnd: billing.currentPeriodEnd,
          cancelAtPeriodEnd: billing.cancelAtPeriodEnd,
          stripeCustomerId: billing.stripeCustomerId,
          hasStripeSubscription: !!billing.stripeSubscriptionId,
        },
        usage: {
          members: memberCount,
          issues: issueCount,
        },
        limits: {
          members: limits.members === Infinity ? null : limits.members,
          issues: limits.issues === Infinity ? null : limits.issues,
          storage_gb: limits.storage_gb === Infinity ? null : limits.storage_gb,
          ai_requests_per_month: limits.ai_requests_per_month === Infinity ? null : limits.ai_requests_per_month,
        },
        invoices,
        stripeConfigured: !!(process.env.STRIPE_SECRET_KEY),
      });
    }
  );

  // POST create Stripe checkout session to upgrade plan
  fastify.post(
    '/checkout',
    { preHandler: [requireAuth, extractWorkspace] },
    async (request: WorkspaceRequest, reply: FastifyReply) => {
      const workspaceId = request.workspace!.id;
      const workspaceSlug = request.workspace!.slug;
      const { plan, interval = 'monthly' } = request.body as {
        plan: 'PRO' | 'ENTERPRISE';
        interval?: 'monthly' | 'yearly';
      };

      if (!['PRO', 'ENTERPRISE'].includes(plan)) {
        return reply.status(400).send({ error: 'Invalid plan' });
      }

      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) {
        return reply.status(503).send({
          error: 'Billing not configured',
          message: 'Stripe is not configured on this server. Contact the team to enable billing.',
        });
      }

      // Lazy import Stripe to avoid hard dependency when not configured
      const { default: Stripe } = await import('stripe').catch(() => ({ default: null }));
      if (!Stripe) {
        return reply.status(503).send({ error: 'Stripe SDK not installed' });
      }

      const stripe = new Stripe(stripeKey, { apiVersion: '2024-04-10' as any });
      const billing = await getOrCreateBilling(workspaceId);

      const priceKey = `${plan}_${interval.toUpperCase()}`;
      const priceId = STRIPE_PRICE_IDS[priceKey];
      if (!priceId) {
        return reply.status(503).send({
          error: 'Price not configured',
          message: `No Stripe price ID found for ${plan} ${interval}. Set STRIPE_PRICE_${priceKey} in environment.`,
        });
      }

      const appUrl = process.env.APP_URL || 'http://localhost:5173';
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer: billing.stripeCustomerId || undefined,
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: { workspaceId, plan },
        success_url: `${appUrl}/${workspaceSlug}/settings?billing=success`,
        cancel_url: `${appUrl}/${workspaceSlug}/settings?billing=cancel`,
      });

      return reply.send({ url: session.url });
    }
  );

  // POST create Stripe customer portal session
  fastify.post(
    '/portal',
    { preHandler: [requireAuth, extractWorkspace] },
    async (request: WorkspaceRequest, reply: FastifyReply) => {
      const workspaceId = request.workspace!.id;
      const workspaceSlug = request.workspace!.slug;

      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) {
        return reply.status(503).send({ error: 'Billing not configured' });
      }

      const billing = await getOrCreateBilling(workspaceId);
      if (!billing.stripeCustomerId) {
        return reply.status(400).send({ error: 'No billing account found. Please subscribe first.' });
      }

      const { default: Stripe } = await import('stripe').catch(() => ({ default: null }));
      if (!Stripe) {
        return reply.status(503).send({ error: 'Stripe SDK not installed' });
      }

      const stripe = new Stripe(stripeKey, { apiVersion: '2024-04-10' as any });
      const appUrl = process.env.APP_URL || 'http://localhost:5173';

      const session = await stripe.billingPortal.sessions.create({
        customer: billing.stripeCustomerId,
        return_url: `${appUrl}/${workspaceSlug}/settings`,
      });

      return reply.send({ url: session.url });
    }
  );
}

// Stripe webhook handler — mounted separately at /webhooks/stripe (raw body needed)
export async function stripeWebhookRoute(fastify: FastifyInstance) {
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    async (_request: FastifyRequest, body: Buffer) => body
  );

  fastify.post(
    '/stripe',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!stripeKey || !webhookSecret) {
        return reply.status(503).send({ error: 'Stripe not configured' });
      }

      const { default: Stripe } = await import('stripe').catch(() => ({ default: null }));
      if (!Stripe) return reply.status(503).send({ error: 'Stripe SDK not installed' });

      const stripe = new Stripe(stripeKey, { apiVersion: '2024-04-10' as any });

      const sig = request.headers['stripe-signature'] as string;
      let event: import('stripe').Stripe.Event;
      try {
        const rawBody = request.body as Buffer;
        event = stripe.webhooks.constructEvent(
          rawBody,
          sig,
          webhookSecret
        );
      } catch (err) {
        return reply.status(400).send({ error: 'Webhook signature verification failed' });
      }

      try {
        switch (event.type) {
          case 'checkout.session.completed': {
            const session = event.data.object as import('stripe').Stripe.Checkout.Session;
            const workspaceId = session.metadata?.workspaceId;
            const plan = session.metadata?.plan;
            if (!workspaceId || !plan) break;

            const subscription = typeof session.subscription === 'string'
              ? await stripe.subscriptions.retrieve(session.subscription)
              : session.subscription;

            await prisma.billing.upsert({
              where: { workspaceId },
              create: {
                workspaceId,
                plan,
                status: 'ACTIVE',
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: subscription?.id,
                currentPeriodStart: subscription ? new Date((subscription as any).current_period_start * 1000) : undefined,
                currentPeriodEnd: subscription ? new Date((subscription as any).current_period_end * 1000) : undefined,
              },
              update: {
                plan,
                status: 'ACTIVE',
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: subscription?.id,
                currentPeriodStart: subscription ? new Date((subscription as any).current_period_start * 1000) : undefined,
                currentPeriodEnd: subscription ? new Date((subscription as any).current_period_end * 1000) : undefined,
              },
            });

            await prisma.workspace.update({
              where: { id: workspaceId },
              data: { plan },
            });
            break;
          }

          case 'customer.subscription.updated': {
            const sub = event.data.object as import('stripe').Stripe.Subscription;
            const billing = await prisma.billing.findFirst({
              where: { stripeSubscriptionId: sub.id },
            });
            if (!billing) break;

            const plan = (sub.metadata?.plan as string) || billing.plan;
            const status = sub.status === 'active' ? 'ACTIVE'
              : sub.status === 'past_due' ? 'PAST_DUE'
              : sub.status === 'canceled' ? 'CANCELED'
              : 'INACTIVE';

            await prisma.billing.update({
              where: { id: billing.id },
              data: {
                plan,
                status,
                cancelAtPeriodEnd: sub.cancel_at_period_end,
                currentPeriodStart: new Date((sub as any).current_period_start * 1000),
                currentPeriodEnd: new Date((sub as any).current_period_end * 1000),
              },
            });

            if (status === 'ACTIVE') {
              await prisma.workspace.update({
                where: { id: billing.workspaceId },
                data: { plan },
              });
            }
            break;
          }

          case 'customer.subscription.deleted': {
            const sub = event.data.object as import('stripe').Stripe.Subscription;
            const billing = await prisma.billing.findFirst({
              where: { stripeSubscriptionId: sub.id },
            });
            if (!billing) break;

            await prisma.billing.update({
              where: { id: billing.id },
              data: { plan: 'FREE', status: 'CANCELED', stripeSubscriptionId: null },
            });
            await prisma.workspace.update({
              where: { id: billing.workspaceId },
              data: { plan: 'FREE' },
            });
            break;
          }

          case 'invoice.paid': {
            const invoice = event.data.object as import('stripe').Stripe.Invoice;
            const billing = await prisma.billing.findFirst({
              where: { stripeCustomerId: invoice.customer as string },
            });
            if (!billing) break;

            await prisma.invoice.upsert({
              where: { stripeInvoiceId: invoice.id },
              create: {
                billingId: billing.id,
                stripeInvoiceId: invoice.id,
                amount: invoice.amount_paid,
                currency: invoice.currency.toUpperCase(),
                status: 'PAID',
                pdfUrl: invoice.invoice_pdf || undefined,
                hostedUrl: invoice.hosted_invoice_url || undefined,
                periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : undefined,
                periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : undefined,
              },
              update: { status: 'PAID', pdfUrl: invoice.invoice_pdf || undefined },
            });

            await prisma.billing.update({
              where: { id: billing.id },
              data: {
                lastInvoiceId: invoice.id,
                lastInvoiceUrl: invoice.hosted_invoice_url || undefined,
                status: 'ACTIVE',
              },
            });
            break;
          }

          case 'invoice.payment_failed': {
            const invoice = event.data.object as import('stripe').Stripe.Invoice;
            const billing = await prisma.billing.findFirst({
              where: { stripeCustomerId: invoice.customer as string },
            });
            if (!billing) break;

            await prisma.billing.update({
              where: { id: billing.id },
              data: { status: 'PAST_DUE' },
            });
            break;
          }
        }
      } catch (err) {
        fastify.log.error(err, 'Stripe webhook processing error');
        return reply.status(500).send({ error: 'Webhook processing failed' });
      }

      return reply.send({ received: true });
    }
  );
}
