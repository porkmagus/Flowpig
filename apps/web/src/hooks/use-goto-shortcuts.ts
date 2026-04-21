import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';

const GOTO_MAP: Record<string, string> = {
  h: '',
  m: 'my-issues',
  i: 'inbox',
  s: 'issues',
  c: 'cycles',
  t: 'triage',
  r: 'roadmap',
  p: 'projects',
  a: 'analytics',
  n: 'notes',
  d: 'databases',
  e: 'team',
  ',': 'settings',
};

export function useGotoShortcuts() {
  const navigate = useNavigate();
  const params = useParams();
  const workspace = params.workspace;
  const pending = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if (pending.current) {
        e.preventDefault();
        clearTimeout(timeoutRef.current);
        pending.current = false;
        const url = GOTO_MAP[e.key.toLowerCase()];
        if (url !== undefined && workspace) {
          navigate(`/${workspace}/${url}`);
        }
        return;
      }

      if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        pending.current = true;
        timeoutRef.current = setTimeout(() => {
          pending.current = false;
        }, 800);
      }
    };

    window.addEventListener('keydown', down);
    return () => {
      window.removeEventListener('keydown', down);
      clearTimeout(timeoutRef.current);
    };
  }, [navigate, workspace]);
}
