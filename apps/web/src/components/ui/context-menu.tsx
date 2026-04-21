import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '~/lib/utils';

interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

interface ContextMenuGroup {
  items: ContextMenuItem[];
}

interface ContextMenuProps {
  children: React.ReactNode;
  groups: ContextMenuGroup[];
}

export function ContextMenu({ children, groups }: ContextMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({
      x: Math.min(e.clientX, window.innerWidth - 220),
      y: Math.min(e.clientY, window.innerHeight - 200),
    });
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClick = () => setOpen(false);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} onContextMenu={handleContextMenu} className="relative">
      {children}
      {open && (
        <div
          className="fixed z-50 w-56 rounded-lg border border-linear-border bg-linear-elevated shadow-xl shadow-black/40 py-1"
          style={{ top: pos.y, left: pos.x }}
        >
          {groups.map((group, gi) => (
            <div key={gi}>
              {gi > 0 && <div className="my-1 border-t border-linear-border" />}
              {group.items.map((item, ii) => (
                <button
                  key={ii}
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!item.disabled) {
                      item.onClick();
                      setOpen(false);
                    }
                  }}
                  disabled={item.disabled}
                  className={cn(
                    'flex items-center gap-2.5 w-full px-3 py-1.5 text-sm text-left transition-colors',
                    item.destructive
                      ? 'text-rose-400 hover:bg-rose-500/10'
                      : item.disabled
                        ? 'text-linear-text-tertiary opacity-50 cursor-not-allowed'
                        : 'text-linear-text hover:bg-linear-surface'
                  )}
                >
                  {item.icon && <span className="w-4 h-4 flex items-center justify-center">{item.icon}</span>}
                  <span className="flex-1">{item.label}</span>
                  {item.shortcut && (
                    <span className="text-[10px] text-linear-text-tertiary">{item.shortcut}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
