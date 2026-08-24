import { Search, AlertTriangle, Gem, Moon, Award } from 'lucide-react';
import { useMysteryStore } from '../../store/mysteryStore';
import { useSceneUiStore, type SceneKind } from '../../store/sceneUiStore';

type ChoosableKind = Exclude<SceneKind, 'resolve'>;

const KINDS: ChoosableKind[] = ['investigation', 'obligation', 'truth', 'rest'];

const ICON: Record<ChoosableKind, React.ReactNode> = {
  investigation: <Search size={16} />,
  obligation: <AlertTriangle size={16} />,
  truth: <Gem size={16} />,
  rest: <Moon size={16} />,
};

const LABEL: Record<ChoosableKind, string> = {
  investigation: 'Investigation',
  obligation: 'Obligation',
  truth: 'Truth',
  rest: 'Rest',
};

const BLURB: Record<ChoosableKind, string> = {
  investigation: 'Roll to see how it starts, then work the location: infiltrate, discover, acquire, escape.',
  obligation: 'Strike an obligation and describe how your investigator attends to it.',
  truth: 'Rotate a clue set toward the truth and draw truth cards to confirm it.',
  rest: 'Clear fatigue and strikes, and describe how your investigator recovers.',
};

export function ChooseScene() {
  const setActiveKind = useSceneUiStore((s) => s.setActiveKind);
  const clueDeckEmpty = useMysteryStore((s) => s.clueDeck.length === 0);
  const resolved = useMysteryStore((s) => s.resolved);

  return (
    <div className="p-6">
      <h2 className="font-display text-lg text-foreground mb-1">Choose Your Scene</h2>
      <p className="text-[12px] text-muted-foreground mb-5 max-w-md">
        Pick which kind of scene your investigator is about to play — or, when the scene
        ends, choose to resolve the mystery instead.
      </p>

      {clueDeckEmpty && !resolved && (
        <div className="max-w-md mb-4 px-2.5 py-1.5 border border-purple-400/30 bg-purple-400/10 rounded text-[11px] text-purple-300">
          The clue deck is empty — the game ends here. It's time for the Solve.
        </div>
      )}

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

      {!resolved && (
        <button
          onClick={() => setActiveKind('resolve')}
          className={`flex items-center gap-2 mt-3 p-3 rounded border text-left transition-colors max-w-md w-full ${
            clueDeckEmpty
              ? 'border-purple-400/50 bg-purple-400/10 hover:bg-purple-400/15'
              : 'border-border bg-card/40 hover:border-purple-400/40 hover:bg-purple-400/5'
          }`}
        >
          <Award size={16} className="text-purple-300 shrink-0" />
          <span>
            <span className="block font-mono text-[12px] uppercase tracking-wider text-foreground">Resolve the mystery</span>
            <span className="block text-[11px] text-muted-foreground leading-snug">Guess the sealed truths and bring the case to a close.</span>
          </span>
        </button>
      )}
    </div>
  );
}
