import type { SuggestionMenuProps, DefaultReactSuggestionItem } from '@blocknote/react';

// Replaces BlockNote's default Mantine suggestion-menu chrome (large boxy
// icon swatches, stacked title/subtitle rows) with a compact list styled
// like the app's own ContextMenu, so it reads as part of this app rather
// than a foreign widget dropped in.
export function CompactSuggestionMenu<T extends DefaultReactSuggestionItem>({ items, selectedIndex, onItemClick }: SuggestionMenuProps<T>) {
  if (items.length === 0) {
    return (
      <div className="bg-popover text-popover-foreground border border-border rounded-lg shadow-md ring-1 ring-foreground/10 p-2 min-w-48 text-[12px] text-muted-foreground/70">
        No results
      </div>
    );
  }

  const groups: { group: string | undefined; items: { item: T; index: number }[] }[] = [];
  items.forEach((item, index) => {
    const last = groups[groups.length - 1];
    if (last && last.group === item.group) last.items.push({ item, index });
    else groups.push({ group: item.group, items: [{ item, index }] });
  });

  return (
    <div className="bg-popover text-popover-foreground border border-border rounded-lg shadow-md ring-1 ring-foreground/10 p-1 min-w-80 max-w-96 max-h-80 overflow-y-auto select-none">
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.group && (
            <div className="px-2 pt-1.5 pb-0.5 text-[9px] uppercase tracking-wider text-muted-foreground/60 font-mono">
              {g.group}
            </div>
          )}
          {g.items.map(({ item, index }) => (
            <button
              key={index}
              // mousedown (not click) + preventDefault: a plain onClick lets
              // the browser shift focus off the editor's contentEditable on
              // mousedown first, which BlockNote reads as "editor blurred"
              // and closes the menu before the click fires — so the first
              // press does nothing and only a second click "works".
              // Preventing default on mousedown keeps focus in the editor.
              onMouseDown={(e) => { e.preventDefault(); onItemClick?.(item); }}
              className={[
                'w-full flex items-center gap-2 rounded-md px-2 py-1 text-[12px] text-left transition-colors',
                index === selectedIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'text-popover-foreground hover:bg-accent hover:text-accent-foreground',
              ].join(' ')}
            >
              {item.icon && (
                <span className="opacity-70 shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">{item.icon}</span>
              )}
              <span className="shrink-0 max-w-[40%] truncate">{item.title}</span>
              {item.subtext && (
                <span className="ml-auto min-w-0 text-[10px] text-muted-foreground/50 truncate">{item.subtext}</span>
              )}
              {item.badge && (
                <span className="ml-auto text-[9px] text-muted-foreground/40 font-mono shrink-0">{item.badge}</span>
              )}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
