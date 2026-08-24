import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useMysteryStore } from '../../store/mysteryStore';
import { useGraphStore } from '../../store/graphStore';
import { useSceneUiStore } from '../../store/sceneUiStore';
import { SectionLabel, SmallButton, TextArea, TextInput } from '../play/ui';
import { PlayingCardView } from '../play/PlayingCard';
import { appendSceneBlockToCaseNotes } from '../../lib/sceneNotes';
import type { TruthRecordPayload } from '../editor/blocks/truthRecordBlock';

interface Props {
  onSaved: () => void;
  onOpenDiceOracles: () => void;
}

export function TruthResolver({ onSaved, onOpenDiceOracles }: Props) {
  const m = useMysteryStore();
  const addNode = useGraphStore((s) => s.addNode);
  const addEdge = useGraphStore((s) => s.addEdge);
  const nodes = useGraphStore((s) => s.nodes);
  const ui = useSceneUiStore((s) => s.truth);
  const setUi = useSceneUiStore((s) => s.setTruth);
  const resetUi = useSceneUiStore((s) => s.resetTruth);
  const setActiveKind = useSceneUiStore((s) => s.setActiveKind);
  const [saving, setSaving] = useState(false);

  const candidates = Object.values(m.clueSets)
    .filter((cs) => cs.status !== 'truth' && cs.status !== 'falseLead')
    .sort((a, b) => a.rank.localeCompare(b.rank, undefined, { numeric: true }));
  const clueSet = m.clueSets[ui.clueSetId];
  const linkedNode = clueSet?.boardNodeId ? nodes[clueSet.boardNodeId] : undefined;
  const clueText = linkedNode?.summary || clueSet?.description || '';

  // Rotating is the commit point — the clue set is marked toward truth and
  // the truth cards are drawn (removed from the game) for real at this
  // moment, and the scene already counts against the clock. There's no clean
  // way back after this, like a physical die once it's rolled, so the back
  // link disappears and the only way forward is to finish the record.
  const committed = ui.drawn !== null;

  const handleRotate = () => {
    if (!ui.clueSetId) return;
    const drawn = m.runTruthScene(ui.clueSetId);
    m.endScene();
    setUi({ drawn: drawn ?? [] });
  };

  const handleSubmit = async () => {
    if (!clueSet) return;
    setSaving(true);
    const text = ui.text.trim();

    const truthNode = addNode({
      label: `Truth — Clue ${clueSet.rank}`,
      summary: text,
      tags: [],
      hasContent: false,
      properties: {},
      nodeType: 'truth',
      truth: { connection: text, card: ui.drawn?.[0] },
    });
    if (clueSet.boardNodeId) addEdge({ source: clueSet.boardNodeId, target: truthNode.id, label: 'confirms' });

    const truthRecord: TruthRecordPayload = {
      clueRank: clueSet.rank,
      clueCards: clueSet.cards,
      clueText,
      truthCards: (ui.drawn ?? []).map((c) => ({ card: c, note: ui.cardNotes[c.id] ?? '' })),
    };

    await appendSceneBlockToCaseNotes({ sceneType: 'truth', text, truthRecord });

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
      <h2 className="font-display text-lg text-foreground">Truth</h2>

      {candidates.length === 0 && !committed ? (
        <div className="text-[12px] text-muted-foreground">No clue sets are ready to be confirmed as a truth yet.</div>
      ) : !committed ? (
        <div className="space-y-3">
          <div>
            <SectionLabel>Choose a clue set to rotate toward the truth</SectionLabel>
            <select
              value={ui.clueSetId}
              onChange={(e) => setUi({ clueSetId: e.target.value })}
              className="w-full bg-background border border-border rounded px-2 py-1.5 text-[12px] text-foreground"
            >
              <option value="">Choose…</option>
              {candidates.map((cs) => (
                <option key={cs.id} value={cs.id}>Clue {cs.rank} ({cs.cards.length} cards)</option>
              ))}
            </select>
          </div>
          {clueSet && (
            <div className="p-2.5 rounded border border-border bg-background space-y-2">
              {clueText ? (
                <div className="text-[12px] text-foreground">{clueText}</div>
              ) : (
                <div className="text-[11px] text-muted-foreground/60 italic">No notes on this clue yet.</div>
              )}
              {clueSet.cards.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {clueSet.cards.map((c) => <PlayingCardView key={c.id} card={c} size="sm" />)}
                </div>
              )}
            </div>
          )}
          <SmallButton onClick={handleRotate} disabled={!ui.clueSetId}>Rotate &amp; draw truth cards</SmallButton>
        </div>
      ) : (
        <>
          <div className="text-[12px] text-foreground">
            Clue {clueSet?.rank} rotated — drew {ui.drawn?.length ?? 0} truth card{(ui.drawn?.length ?? 0) === 1 ? '' : 's'}, removed from the game.
          </div>
          {(ui.drawn?.length ?? 0) > 0 && (
            <div className="space-y-2">
              {ui.drawn!.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <PlayingCardView card={c} size="sm" />
                  <TextInput
                    placeholder="How does this truth card modify the clue?"
                    value={ui.cardNotes[c.id] ?? ''}
                    onChange={(e) => setUi({ cardNotes: { ...ui.cardNotes, [c.id]: e.target.value } })}
                    className="flex-1 h-8 text-[11px]"
                  />
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between">
            <SectionLabel>What connection does your investigator make to confirm this truth?</SectionLabel>
            <SmallButton onClick={onOpenDiceOracles}>Dice &amp; Oracles</SmallButton>
          </div>
          <TextArea rows={4} value={ui.text} onChange={(e) => setUi({ text: e.target.value })} placeholder="What happens…" />
          <div className="flex items-center gap-2.5">
            <SmallButton onClick={() => void handleSubmit()} disabled={saving || !ui.text.trim()}>
              Submit
            </SmallButton>
            <span className="text-[10px] text-muted-foreground/70">Will update Field Notes and create a board node for this truth.</span>
          </div>
        </>
      )}
    </div>
  );
}
