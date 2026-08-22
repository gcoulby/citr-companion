import { useSearch } from '../../hooks/useSearch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '../ui/command';

interface Props {
  onSelectNode: (nodeId: string) => void;
  onClose: () => void;
}

export function SearchPanel({ onSelectNode, onClose }: Props) {
  const { query, setQuery, results } = useSearch();

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="top-1/3 translate-y-0 overflow-hidden rounded-xl! p-0 sm:max-w-130" showCloseButton={false}>
        <DialogHeader className="sr-only">
          <DialogTitle>Search nodes</DialogTitle>
          <DialogDescription>Search across labels, summaries, tags, and properties</DialogDescription>
        </DialogHeader>
        <Command shouldFilter={false} className="rounded-xl!">
          <CommandInput value={query} onValueChange={setQuery} placeholder="Search nodes..." />
          <CommandList>
            {query && results.length === 0 && <CommandEmpty>No results</CommandEmpty>}
            {results.length > 0 && (
              <CommandGroup>
                {results.map((node) => (
                  <CommandItem
                    key={node.id}
                    value={node.id}
                    onSelect={() => { onSelectNode(node.id); onClose(); }}
                    className="flex-col items-start gap-0.5 py-2"
                  >
                    <div className="text-sm font-medium text-foreground">{node.label}</div>
                    {node.summary && (
                      <div className="text-xs text-muted-foreground">{node.summary}</div>
                    )}
                    {node.tags.length > 0 && (
                      <div className="flex gap-1 mt-0.5">
                        {node.tags.map((t) => (
                          <span key={t} className="text-[10px] px-1 rounded bg-muted text-muted-foreground">{t}</span>
                        ))}
                      </div>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
