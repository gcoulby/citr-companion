import { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  separator?: boolean; // show divider BEFORE this item
}

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const itemCount = items.length;
  const menuHeight = itemCount * 30 + 16;

  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(x, window.innerWidth - 180),
    top: Math.min(y, window.innerHeight - menuHeight),
    zIndex: 1000,
  };

  return (
    <div
      ref={ref}
      style={style}
      className="bg-popover text-popover-foreground border border-border rounded-lg shadow-md ring-1 ring-foreground/10 p-1 min-w-40 select-none"
    >
      {items.map((item, i) => (
        <div key={i}>
          {item.separator && <div className="my-1 border-t border-border" />}
          <button
            onClick={() => { item.onClick(); onClose(); }}
            className={[
              'w-full flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] text-left transition-colors',
              item.danger
                ? 'text-destructive hover:bg-destructive/10'
                : 'text-popover-foreground hover:bg-accent hover:text-accent-foreground',
            ].join(' ')}
          >
            {item.icon && <span className="opacity-60 flex-shrink-0">{item.icon}</span>}
            {item.label}
          </button>
        </div>
      ))}
    </div>
  );
}
