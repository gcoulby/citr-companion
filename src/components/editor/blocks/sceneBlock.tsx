import { createReactBlockSpec } from '@blocknote/react';
import { Search, Gem, AlertTriangle, Moon, CircleDashed, Award } from 'lucide-react';

export type SceneType = 'investigation' | 'truth' | 'obligation' | 'rest' | 'resolve' | 'other';
export type InvestigationStageOrNone = '' | 'infiltration' | 'discovery' | 'acquisition' | 'escape';

export const SCENE_TYPE_CONFIG: Record<SceneType, { label: string; icon: React.ReactNode; color: string }> = {
  investigation: { label: 'Investigation', icon: <Search size={12} />, color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30' },
  truth:         { label: 'Truth',         icon: <Gem size={12} />,    color: 'text-yellow-300 bg-yellow-300/10 border-yellow-300/30' },
  obligation:    { label: 'Obligation',    icon: <AlertTriangle size={12} />, color: 'text-red-400 bg-red-400/10 border-red-400/30' },
  rest:          { label: 'Rest',          icon: <Moon size={12} />,   color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
  resolve:       { label: 'The Solve',     icon: <Award size={12} />,  color: 'text-purple-400 bg-purple-400/10 border-purple-400/30' },
  other:         { label: 'Scene',         icon: <CircleDashed size={12} />, color: 'text-muted-foreground bg-muted border-border' },
};

export const sceneBlockFactory = createReactBlockSpec(
  {
    type: 'scene',
    propSchema: {
      sceneType: { default: 'other' as SceneType, values: ['investigation', 'truth', 'obligation', 'rest', 'resolve', 'other'] as const },
      stage: { default: '' as InvestigationStageOrNone, values: ['', 'infiltration', 'discovery', 'acquisition', 'escape'] as const },
      day: { default: 0 },
      danger: { default: 0 },
    },
    content: 'inline',
  },
  {
    render: (props) => {
      const { block, editor, contentRef } = props;
      const cfg = SCENE_TYPE_CONFIG[block.props.sceneType];
      return (
        <div className="w-full border-l-2 border-primary/40 pl-3 py-1.5 my-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <select
              value={block.props.sceneType}
              onChange={(e) => editor.updateBlock(block, { props: { ...block.props, sceneType: e.target.value as SceneType } })}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] uppercase tracking-wider font-mono ${cfg.color}`}
            >
              {(Object.keys(SCENE_TYPE_CONFIG) as SceneType[]).map((t) => (
                <option key={t} value={t}>{SCENE_TYPE_CONFIG[t].label}</option>
              ))}
            </select>
            {block.props.sceneType === 'investigation' && block.props.stage && (
              // Legacy documents only — current saves show the full
              // stage-by-stage breakdown in the investigationRecord block
              // below instead of a single editable "ended at" dropdown.
              <span className="px-1.5 py-0.5 rounded border border-border bg-background text-[10px] font-mono text-muted-foreground">
                {block.props.stage}
              </span>
            )}
            <span className="text-[10px] font-mono text-muted-foreground/60">
              Day {block.props.day} · Danger {block.props.danger}
            </span>
          </div>
          <div ref={contentRef} className="text-[15px] font-medium text-foreground outline-none" />
        </div>
      );
    },
  },
);
