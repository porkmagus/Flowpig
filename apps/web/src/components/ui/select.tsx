import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '~/lib/utils';

interface SelectOption {
  value: string;
  label: string;
  color?: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function Select({ value, onChange, options, placeholder = 'Select...', className, disabled, size = 'md' }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, close]);

  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.value === value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  }, [open, options, value]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, options.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const opt = options[highlightedIndex];
        if (opt) {
          onChange(opt.value);
          close();
        }
      } else if (e.key === 'Escape') {
        close();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, options, highlightedIndex, onChange, close]);

  const heightClass = size === 'sm' ? 'h-7 text-xs px-2' : 'h-9 text-sm px-3';

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={cn(
          'flex items-center justify-between gap-2 w-full rounded-md border border-linear-border bg-linear-surface text-linear-text transition-colors focus:outline-none focus:ring-2 focus:ring-linear-accent/40',
          heightClass,
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-linear-border-hover cursor-pointer'
        )}
      >
        <span className="truncate">
          {selected ? (
            <span className="flex items-center gap-1.5">
              {selected.color && (
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selected.color }} />
              )}
              {selected.label}
            </span>
          ) : (
            <span className="text-linear-text-tertiary">{placeholder}</span>
          )}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-linear-text-tertiary transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[160px] rounded-md border border-linear-border bg-linear-elevated shadow-xl shadow-black/40 py-1">
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                close();
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={cn(
                'flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left transition-colors',
                index === highlightedIndex ? 'bg-linear-surface text-linear-text' : 'text-linear-text-secondary'
              )}
            >
              <span className="w-4 flex items-center justify-center">
                {option.value === value && <Check className="w-3.5 h-3.5 text-linear-accent" />}
              </span>
              {option.color && (
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: option.color }} />
              )}
              <span className="truncate">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
