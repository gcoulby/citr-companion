import { createReactBlockSpec } from '@blocknote/react';
import { useMysteryStore } from '../../../store/mysteryStore';
import type { ThreatEntry } from '../../../game/types';

export interface SnapshotPayload {
  day: number;
  danger: number;
  clockMarks: number;
  threats: Pick<ThreatEntry, 'name' | 'level' | 'kind' | 'defeated'>[];
}

export function captureSnapshot(): SnapshotPayload {
  const m = useMysteryStore.getState();
  return {
    day: m.day,
    danger: m.danger,
    clockMarks: m.clockMarks,
    threats: m.threats.map(({ name, level, kind, defeated }) => ({ name, level, kind, defeated })),
  };
}

// A stamped, read-only record of mystery state at the moment it was
// inserted — a log entry, not a live dashboard widget.
export const snapshotBlockFactory = createReactBlockSpec(
  {
    type: 'snapshot',
    propSchema: {
      data: { default: '{}' }, // JSON-stringified SnapshotPayload
    },
    content: 'none',
  },
  {
    render: (props) => {
      let data: SnapshotPayload;
      try {
        data = JSON.parse(props.block.props.data) as SnapshotPayload;
      } catch {
        data = { day: 0, danger: 0, clockMarks: 0, threats: [] };
      }
      return (
        <div className="w-full my-1 px-3 py-2 rounded border border-border bg-background/60 text-[11px] font-mono">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span>Day <span className="text-foreground">{data.day}</span></span>
            <span>Danger <span className="text-foreground">{data.danger}</span></span>
            <span>Clock <span className="text-foreground">{data.clockMarks}/4</span></span>
          </div>
          {data.threats.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {data.threats.map((t, i) => (
                <span
                  key={i}
                  className={`px-1.5 py-0.5 rounded border text-[10px] ${
                    t.defeated ? 'border-border text-muted-foreground/40 line-through' : 'border-red-400/30 text-red-400'
                  }`}
                >
                  {t.name || 'Unknown threat'} · L{t.level} {t.kind === 'rival' ? '(rival)' : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    },
  },
);
