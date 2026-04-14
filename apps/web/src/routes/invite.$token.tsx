import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  LogIn,
  Mail,
  ShieldCheck,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { API_URL } from '~/lib/api';
import { useAuth } from '~/lib/auth-client';

interface InvitationDetails {
  id: string;
  email: string;
  role: 'ADMIN' | 'MEMBER' | 'GUEST';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  expiresAt: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
    color: string;
  };
  invitedBy: {
    id: string;
    name: string | null;
    email: string;
  };
}

export default function InviteTokenRoute() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [isLoadingInvitation, setIsLoadingInvitation] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invitation token is missing.');
      setIsLoadingInvitation(false);
      return;
    }

    let isMounted = true;

    async function loadInvitation() {
      setIsLoadingInvitation(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/workspaces/invitations/${token}`, {
          credentials: 'include',
        });
        const json = await response.json();

        if (!response.ok) {
          throw new Error(json.message || 'Could not load invitation.');
        }

        if (isMounted) {
          setInvitation(json.invitation as InvitationDetails);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Could not load invitation.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingInvitation(false);
        }
      }
    }

    void loadInvitation();

    return () => {
      isMounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !user || !invitation || isAuthLoading || isAccepting) {
      return;
    }

    if (invitation.status !== 'PENDING') {
      return;
    }

    let isMounted = true;

    async function acceptInvitation() {
      setIsAccepting(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/workspaces/invitations/${token}/accept`, {
          method: 'POST',
          credentials: 'include',
        });
        const json = await response.json();

        if (!response.ok) {
          throw new Error(json.message || 'Could not accept invitation.');
        }

        if (!isMounted) {
          return;
        }

        setInvitation((current) => (
          current
            ? {
                ...current,
                status: 'ACCEPTED',
                workspace: json.workspace ?? current.workspace,
              }
            : current
        ));
        setSuccessMessage(json.message || 'Invitation accepted. Redirecting...');

        window.setTimeout(() => {
          navigate(`/${json.workspace.slug}`);
        }, 1200);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Could not accept invitation.');
        }
      } finally {
        if (isMounted) {
          setIsAccepting(false);
        }
      }
    }

    void acceptInvitation();

    return () => {
      isMounted = false;
    };
  }, [invitation, isAccepting, isAuthLoading, navigate, token, user]);

  const inviteQuery = token ? `?invite=${encodeURIComponent(token)}` : '';

  return (
    <div className="min-h-screen overflow-hidden bg-linear-bg px-5 py-10 text-linear-text sm:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-24 h-88 w-88 rounded-full bg-linear-accent/12 blur-3xl" />
        <div className="absolute -right-40 top-[18%] h-104 w-104 rounded-full bg-emerald-300/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden rounded-xl border border-white/8 bg-white/4 shadow-2xl shadow-black/30 backdrop-blur-xl"
        >
          <div className="border-b border-white/8 bg-linear-to-r from-linear-accent/12 via-transparent to-emerald-300/10 px-6 py-5 sm:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.22em] text-white/60">
              <Mail className="h-3.5 w-3.5 text-linear-accent" />
              Workspace invitation
            </div>
            <h1 className="font-display mt-4 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
              Join {invitation?.workspace.name || 'your workspace'}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-white/65 sm:text-base">
              Accept the invite to get into the workspace, keep planning context intact,
              and start collaborating without another handoff.
            </p>
          </div>

          <div className="space-y-5 px-6 py-6 sm:px-8 sm:py-8">
            {isLoadingInvitation ? (
              <div className="flex items-center gap-3 rounded-lg border border-white/8 bg-black/20 px-4 py-4 text-sm text-white/70">
                <Loader2 className="h-4 w-4 animate-spin text-linear-accent" />
                Checking invitation details...
              </div>
            ) : error ? (
              <div className="rounded-lg border border-linear-error/30 bg-linear-error/10 px-4 py-4 text-sm text-red-100">
                <div className="inline-flex items-center gap-2 font-medium">
                  <XCircle className="h-4 w-4" />
                  {error}
                </div>
              </div>
            ) : invitation ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-white/8 bg-black/20 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-white/45">Workspace</div>
                    <div className="mt-2 text-sm font-semibold text-white">{invitation.workspace.name}</div>
                  </div>
                  <div className="rounded-lg border border-white/8 bg-black/20 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-white/45">Role</div>
                    <div className="mt-2 text-sm font-semibold text-white">{invitation.role}</div>
                  </div>
                  <div className="rounded-lg border border-white/8 bg-black/20 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-white/45">Invited email</div>
                    <div className="mt-2 text-sm font-semibold text-white">{invitation.email}</div>
                  </div>
                </div>

                <div className="rounded-lg border border-white/8 bg-linear-surface/90 px-4 py-4 text-sm text-white/72">
                  <div className="inline-flex items-center gap-2 font-medium text-white/86">
                    <ShieldCheck className="h-4 w-4 text-emerald-200" />
                    Invited by {invitation.invitedBy.name || invitation.invitedBy.email}
                  </div>
                  <div className="mt-2 text-white/55">
                    This invite expires on {new Date(invitation.expiresAt).toLocaleString()}.
                  </div>
                </div>

                {successMessage && (
                  <div className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-4 py-4 text-sm text-emerald-100">
                    <span className="inline-flex items-center gap-2 font-medium">
                      <CheckCircle2 className="h-4 w-4" />
                      {successMessage}
                    </span>
                  </div>
                )}

                {!user && invitation.status === 'PENDING' && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Link
                      to={`/signup${inviteQuery}`}
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-linear-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-linear-accent-hover"
                    >
                      <UserPlus className="h-4 w-4" />
                      Create account to accept
                    </Link>
                    <Link
                      to={`/login${inviteQuery}`}
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-white/4 px-4 py-3 text-sm font-medium text-white/82 transition hover:border-white/18 hover:bg-white/7"
                    >
                      <LogIn className="h-4 w-4 text-linear-accent" />
                      Sign in with invited account
                    </Link>
                  </div>
                )}

                {user && invitation.status === 'PENDING' && (
                  <div className="flex items-center gap-3 rounded-lg border border-white/8 bg-black/20 px-4 py-4 text-sm text-white/70">
                    <Loader2 className="h-4 w-4 animate-spin text-linear-accent" />
                    Accepting invitation for {user.email}...
                  </div>
                )}

                {invitation.status === 'ACCEPTED' && !successMessage && (
                  <Link
                    to={`/${invitation.workspace.slug}`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-linear-accent hover:text-linear-accent-hover"
                  >
                    Open workspace
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}

                {invitation.status === 'EXPIRED' && (
                  <div className="rounded-lg border border-linear-warning/30 bg-linear-warning/10 px-4 py-4 text-sm text-amber-100">
                    This invitation has expired. Ask a workspace admin to send a fresh one.
                  </div>
                )}

                {invitation.status === 'DECLINED' && (
                  <div className="rounded-lg border border-linear-warning/30 bg-linear-warning/10 px-4 py-4 text-sm text-amber-100">
                    This invitation was declined. Ask a workspace admin to send another invite if you still need access.
                  </div>
                )}
              </>
            ) : null}
          </div>
        </motion.div>
      </div>
    </div>
  );
}