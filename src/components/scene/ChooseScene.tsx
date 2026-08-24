import { Search, AlertTriangle, Gem, Moon } from 'lucide-react';
import { useSceneUiStore, type SceneKind } from '../../store/sceneUiStore';

const KINDS: SceneKind[] = ['investigation', 'obligation', 'truth', 'rest'];

const ICON: Record<SceneKind, React.ReactNode> = {
  investigation: <Search size={16} />,
  obligation: <AlertTriangle size={16} />,
  truth: <Gem size={16} />,
  rest: <Moon size={16} />,
};

const LABEL: Record<SceneKind, string> = {
  investigation: 'Investigation',
  obligation: 'Obligation',
  truth: 'Truth',
  rest: 'Rest',
};

const BLURB: Record<SceneKind, string> = {
  investigation: 'Roll to see how it starts, then work the location: infiltrate, discover, acquire, escape.',
  obligation: 'Strike an obligation and describe how your investigator attends to it.',
  truth: 'Rotate a clue set toward the truth and draw truth cards to confirm it.',
  rest: 'Clear fatigue and strikes, and describe how your investigator recovers.',
};

export function ChooseScene() {
  const setActiveKind = useSceneUiStore((s) => s.setActiveKind);

  return (
    <div className="p-6">
      <h2 className="font-display text-lg text-foreground mb-1">Choose Your Scene</h2>
      <p className="text-[12px] text-muted-foreground mb-5 max-w-md">
        Pick which kind of scene your investigator is about to play.
      </p>
      <div className="grid grid-cols-2 gap-3 max-w-md">
        {KINDS.map((k) => (
          <button
            key={k}
            onClick={() => setActiveKind(k)}
            className="flex flex-col items-start gap-2 p-4 rounded border border-border bg-card/40 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <span className="text-muted-foreground">{ICON[k]}</span>
            <span className="font-mono text-[12px] uppercase tracking-wider text-foreground">{LABEL[k]}</span>
            <span className="text-[11px] text-muted-foreground leading-snug">{BLURB[k]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
