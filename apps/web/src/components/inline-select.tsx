import { useState, useRef, useEffect } from 'react';
import { cn } from '~/lib/utils';

interface InlineSelectOption {
  value: string;
  label: string;
  color?: string;
}

interface InlineSelectProps {
  value: string;
  options: InlineSelectOption[];
  onChange: (value: string) => void;
  children: React.ReactNode;
  align?: 'left' | 'right';
}

export function InlineSelect({ value, options, onChange, children, align = 'left' }: InlineSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="inline-flex items-center"
      >
        {children}
      </button>
      {open && (
        <div
          className={cn(
            'absolute z-50 mt-1 w-44 rounded-lg border border-linear-border bg-linear-elevated shadow-xl shadow-black/40 py-1',
            align === 'right' ? 'right-0' : 'left-0'
          )}
          style={{ top: '100%' }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                'flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left transition-colors',
                opt.value === value ? 'bg-linear-accent/10 text-linear-text' : 'text-linear-text-secondary hover:bg-linear-surface'
              )}
            >
              {opt.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
