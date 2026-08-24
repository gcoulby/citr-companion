import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useMysteryStore } from '../../store/mysteryStore';
import { useSceneUiStore } from '../../store/sceneUiStore';
import { SectionLabel, SmallButton, TextArea, DiceRoller } from '../play/ui';
import { appendSceneBlockToCaseNotes } from '../../lib/sceneNotes';

interface Props {
  onSaved: () => void;
}

export function RestResolver({ onSaved }: Props) {
  const m = useMysteryStore();
  const ui = useSceneUiStore((s) => s.rest);
  const setUi = useSceneUiStore((s) => s.setRest);
  const resetUi = useSceneUiStore((s) => s.resetRest);
  const setActiveKind = useSceneUiStore((s) => s.setActiveKind);
  const [saving, setSaving] = useState(false);

  // Rolling is the commit point — like a physical die, once it's rolled the
  // fatigue/strikes/discard already happened for real, and the scene already
  // counted against the clock. Backing out after this can't un-roll it, so
  // the back link disappears and the only way forward is to finish the
  // record — otherwise the mechanical benefit is kept with no trace of it.
  const committed = ui.rolled !== null;

  const handleRoll = (rolled: number) => {
    setUi({ rolled });
    m.endScene();
  };

  const handleSave = async () => {
    setSaving(true);
    await appendSceneBlockToCaseNotes({
      sceneType: 'rest',
      text: `Cleared ${ui.rolled} fatigue, strikes cleared, discarded a clue card.\n\n${ui.text.trim()}`,
    });
    resetUi();
    setActiveKind(null);
    onSaved();
  };

  return (
    <div className="p-6 space-y-4 max-w-lg">
      {!committed && (
        <button
          onClick={() => { resetUi(); setActiveKind(null); }}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={12} /> Choose a different scene
        </button>
      )}
      <h2 className="font-display text-lg text-foreground">Rest</h2>

      {!committed ? (
        <div>
          <SectionLabel>Roll 1d6 — clears that many fatigue boxes (right to left), all attribute strikes, and signature keyword strikes</SectionLabel>
          <DiceRoller
            dice={1}
            label="Roll rest"
            onRoll={() => handleRoll(m.runRestScene())}
            onManual={([a]) => handleRoll(m.runRestSceneManual(a))}
          />
        </div>
      ) : (
        <>
          <div className="text-[12px] text-green-400">
            Cleared {ui.rolled} fatigue, strikes cleared, discarded a card from the clue deck.
          </div>
          <div>
            <SectionLabel>How does your investigator rest?</SectionLabel>
            <TextArea rows={5} value={ui.text} onChange={(e) => setUi({ text: e.target.value })} placeholder="What happens…" />
          </div>
          <SmallButton onClick={() => void handleSave()} disabled={saving || !ui.text.trim()}>
            Add to Field Notes
          </SmallButton>
        </>
      )}
    </div>
  );
}
