import { createReactBlockSpec } from '@blocknote/react';
import type { InvestigationStage } from '../../../game/types';

export interface InvestigationStageRecord {
  stage: InvestigationStage;
  label: string;
  lines: string[];
}

export interface InvestigationRecordPayload {
  day: number;
  dangerStart: number;
  dangerEnd: number;
  fatigueStart: number;
  fatigueEnd: number;
  cluesStart: number;
  cluesEnd: number;
  threatsDefeated: number;
  threatsRemaining: number;
  finalStage: InvestigationStage | '';
  /** Lines logged before the first stage began (the investigation roll's
   *  flavour text, threat naming) — not attributable to any one stage. */
  intro: string[];
  stages: InvestigationStageRecord[];
}

const STAGE_LABEL: Record<InvestigationStage, string> = {
  infiltration: 'Infiltration', discovery: 'Discovery', acquisition: 'Acquisition', escape: 'Escape',
};

// A read-only, stamped breakdown of a completed Investigation scene, grouped
// by the stage each event happened in — replaces dumping the whole stage/
// roll log into one flat paragraph behind a single "stage" dropdown that
// could only ever describe where the scene *ended*, not what happened at
// each stage along the way.
export const investigationRecordBlockFactory = createReactBlockSpec(
  {
    type: 'investigationRecord',
    propSchema: {
      data: { default: '{}' }, // JSON-stringified InvestigationRecordPayload
    },
    content: 'none',
  },
  {
    render: (props) => {
      let data: InvestigationRecordPayload;
      try {
        data = JSON.parse(props.block.props.data) as InvestigationRecordPayload;
      } catch {
        data = {
          day: 0, dangerStart: 0, dangerEnd: 0, fatigueStart: 0, fatigueEnd: 0,
          cluesStart: 0, cluesEnd: 0, threatsDefeated: 0, threatsRemaining: 0,
          finalStage: '', intro: [], stages: [],
        };
      }
      return (
        <div className="w-full my-1 px-3 py-2.5 rounded border border-cyan-400/30 bg-cyan-400/5 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400">
              Investigation{data.finalStage ? ` — ended at ${STAGE_LABEL[data.finalStage]}` : ''}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground/60">Day {data.day}</div>
          </div>

          {data.intro.length > 0 && (
            <div className="text-[12px] text-foreground/90 space-y-0.5">
              {data.intro.map((line, i) => <div key={i}>{line}</div>)}
            </div>
          )}

          {data.stages.length > 0 && (
            <div className="space-y-2">
              {data.stages.map((s) => (
                <div key={s.stage}>
                  <div className="text-[10px] text-muted-foreground/70 mb-0.5">{s.label}</div>
                  <div className="text-[12px] text-foreground/90 space-y-0.5 pl-2 border-l border-border">
                    {s.lines.map((line, i) => <div key={i}>{line}</div>)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-mono text-muted-foreground pt-1 border-t border-border/60">
            <span>Danger {data.dangerStart} → {data.dangerEnd}</span>
            <span>Fatigue {data.fatigueStart} → {data.fatigueEnd}</span>
            <span>Clues {data.cluesStart} → {data.cluesEnd}</span>
            <span>Threats defeated {data.threatsDefeated} · remaining {data.threatsRemaining}</span>
          </div>
        </div>
      );
    },
  },
);
