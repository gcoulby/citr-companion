// Presentational only — an ordered phase track shown at the top of the
// Investigation resolver so the player always knows what stage they're in,
// and can see when a phase was skipped (quiet start, no-threat acquisition,
// a fatigue interrupt) rather than it silently disappearing.

export type PhaseStatus = 'done' | 'current' | 'skipped' | 'upcoming';

export interface Phase {
  id: string;
  label: string;
  status: PhaseStatus;
}

const STATUS_CLASSES: Record<PhaseStatus, string> = {
  done: 'border-green-400/40 text-green-400 bg-green-400/10',
  current: 'border-primary text-primary bg-primary/15',
  skipped: 'border-border text-muted-foreground/40 line-through',
  upcoming: 'border-border text-muted-foreground/60',
};

export function PhaseTracker({ phases }: { phases: Phase[] }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto py-1">
      {phases.map((p, i) => (
        <div key={p.id} className="flex items-center gap-1 shrink-0">
          <div
            className={`px-2 py-1 rounded border text-[10px] font-mono uppercase tracking-wide whitespace-nowrap ${STATUS_CLASSES[p.status]}`}
          >
            {p.label}
          </div>
          {i < phases.length - 1 && <span className="text-muted-foreground/25 text-xs">&rarr;</span>}
        </div>
      ))}
    </div>
  );
}
