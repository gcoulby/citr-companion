import { useMysteryStore } from '../../store/mysteryStore';
import { useSceneUiStore } from '../../store/sceneUiStore';
import { ChooseScene } from './ChooseScene';
import { ObligationResolver } from './ObligationResolver';
import { RestResolver } from './RestResolver';
import { TruthResolver } from './TruthResolver';
import { InvestigationResolver } from './InvestigationResolver';
import { SmallButton } from '../play/ui';

interface Props {
  onSaved: () => void;
  onOpenResolve: () => void;
  onOpenDiceOracles: () => void;
  onOpenPlay: () => void;
}

function MysteryHeader() {
  const m = useMysteryStore();
  return (
    <div className="flex items-center gap-4 px-6 py-2.5 border-b border-border bg-card/60 shrink-0 text-[11px] font-mono">
      <span className="text-muted-foreground">Day <span className="text-foreground">{m.day}</span></span>
      <span className="text-muted-foreground">Danger <span className="text-primary">{m.danger}</span></span>
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">Clock</span>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`w-2.5 h-2.5 rounded-full border ${i < m.clockMarks ? 'bg-primary/40 border-primary/60' : 'border-border'}`} />
        ))}
      </div>
      {m.problem.location && (
        <span className="text-muted-foreground/70 truncate">
          {m.problem.location} · {m.problem.object} {m.problem.treachery}
        </span>
      )}
    </div>
  );
}

export function SceneView({ onSaved, onOpenResolve, onOpenDiceOracles, onOpenPlay }: Props) {
  const started = useMysteryStore((s) => s.started);
  const activeKind = useSceneUiStore((s) => s.activeKind);

  if (!started) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto bg-background">
        <div className="p-6 max-w-md space-y-3">
          <h2 className="font-display text-lg text-foreground">No mystery yet</h2>
          <p className="text-[12px] text-muted-foreground">
            Start a mystery from the Mystery tab in the Play panel before playing a scene.
          </p>
          <SmallButton onClick={onOpenPlay}>Open Play panel</SmallButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-background">
      <MysteryHeader />
      <div className="flex-1 overflow-y-auto">
        {activeKind === null && <ChooseScene />}
        {activeKind === 'obligation' && <ObligationResolver onSaved={onSaved} />}
        {activeKind === 'rest' && <RestResolver onSaved={onSaved} />}
        {activeKind === 'truth' && <TruthResolver onSaved={onSaved} onOpenDiceOracles={onOpenDiceOracles} />}
        {activeKind === 'investigation' && <InvestigationResolver onSaved={onSaved} onOpenResolve={onOpenResolve} />}
      </div>
    </div>
  );
}
