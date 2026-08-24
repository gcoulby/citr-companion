import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useMysteryStore } from '../../store/mysteryStore';
import { useInvestigatorStore } from '../../store/investigatorStore';
import { useSceneUiStore } from '../../store/sceneUiStore';
import { SectionLabel, SmallButton, TextArea } from '../play/ui';
import { appendSceneBlockToCaseNotes } from '../../lib/sceneNotes';

interface Props {
  onSaved: () => void;
}

export function ObligationResolver({ onSaved }: Props) {
  const m = useMysteryStore();
  const inv = useInvestigatorStore();
  const ui = useSceneUiStore((s) => s.obligation);
  const setUi = useSceneUiStore((s) => s.setObligation);
  const resetUi = useSceneUiStore((s) => s.resetObligation);
  const setActiveKind = useSceneUiStore((s) => s.setActiveKind);
  const [saving, setSaving] = useState(false);

  const unstruck = inv.obligations.filter((o) => !o.struck);
  const obligation = inv.obligations.find((o) => o.id === ui.obligationId);

  // Striking is the commit point — like a physical die, once it's struck the
  // discard already happened for real, and the scene already counted against
  // the clock. Navigating away doesn't undo it (there's no "un-strike"), but
  // it also doesn't lose it — the struck/text state persists in
  // sceneUiStore, so picking Obligation again just resumes at this point.
  const handleStrike = () => {
    if (!ui.obligationId) return;
    m.runObligationScene(ui.obligationId); // strikes it + discards a clue card
    m.endScene();
    setUi({ struck: true });
  };

  const handleSave = async () => {
    if (!obligation) return;
    setSaving(true);
    await appendSceneBlockToCaseNotes({
      sceneType: 'obligation',
      text: `Struck obligation: ${obligation.text}\n\n${ui.text.trim()}`,
    });
    resetUi();
    setActiveKind(null);
    onSaved();
  };

  return (
    <div className="p-6 space-y-4 max-w-lg">
      {/* Always available — navigating away doesn't lose anything, since this
          resolver's session state (obligationId/text/struck) persists in
          sceneUiStore, so picking Obligation again resumes right here. */}
      <button
        onClick={() => setActiveKind(null)}
        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={12} /> Choose a different scene
      </button>
      <h2 className="font-display text-lg text-foreground">Obligation</h2>

      {unstruck.length === 0 && !ui.struck ? (
        <div className="text-[12px] text-muted-foreground">No unstruck obligations to attend to right now.</div>
      ) : !ui.struck ? (
        <div>
          <SectionLabel>Strike an obligation</SectionLabel>
          <select
            value={ui.obligationId}
            onChange={(e) => setUi({ obligationId: e.target.value })}
            className="w-full bg-background border border-border rounded px-2 py-1.5 text-[12px] text-foreground"
          >
            <option value="">Choose…</option>
            {unstruck.map((o) => (
              <option key={o.id} value={o.id}>{o.text}</option>
            ))}
          </select>
          <div className="mt-3">
            <SmallButton onClick={handleStrike} disabled={!ui.obligationId}>Strike it</SmallButton>
          </div>
        </div>
      ) : (
        <>
          <div className="text-[12px] text-green-400">
            Struck "{obligation?.text}" — discarded a card from the clue deck.
          </div>
          <div>
            <SectionLabel>How does your investigator attend to this obligation?</SectionLabel>
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
