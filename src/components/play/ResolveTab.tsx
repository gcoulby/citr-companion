import { useMysteryStore } from '../../store/mysteryStore';
import type { ResolveQuestion } from '../../game/types';
import { cardLabel } from '../../game/deck';
import { SectionLabel, Badge, SmallButton, TextArea } from './ui';

const QUESTION_LABEL: Record<ResolveQuestion, string> = {
  location: 'Why was the location significant?',
  object: 'Why was the object significant?',
  treachery: 'Why did this treachery befall the object?',
};

export function ResolveTab() {
  const m = useMysteryStore();

  if (!m.started) {
    return <div className="p-4 text-[11px] text-[#3a3f47]">Begin a mystery first, on the Mystery tab.</div>;
  }

  const clueOptions = Object.values(m.clueSets).filter((cs) => cs.status !== 'falseLead');
  const allGuessed = m.sealed.every((s) => s.guessedClueSetId);

  return (
    <div className="p-4 space-y-4">
      {m.resolved && (
        <div className="px-2.5 py-1.5 rounded bg-green-400/10 border border-green-400/30 text-[11px] text-green-400">
          Mystery resolved.
        </div>
      )}

      <div className="text-[11px] text-[#8b949e] leading-relaxed">
        Three truth cards were sealed at the start of this mystery — never inspected until now. Guess which clue set
        confirms each, then reveal.
      </div>

      {m.sealed.map((slot) => (
        <div key={slot.question} className="p-2.5 rounded border border-[#30363d] bg-[#0d1117] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-[#e6edf3] capitalize">{slot.question}</span>
            {m.revealed && <Badge tone="gold">{cardLabel(slot.card)}</Badge>}
          </div>

          {!m.revealed ? (
            <select
              value={slot.guessedClueSetId ?? ''}
              onChange={(e) => m.setGuess(slot.question, e.target.value || null)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-[11px] text-[#e6edf3]"
            >
              <option value="">— pick a clue set —</option>
              {clueOptions.map((cs) => <option key={cs.id} value={cs.id}>Clue {cs.rank} — {cs.description || 'no description'}</option>)}
            </select>
          ) : (
            <>
              <div className="text-[10px] text-[#484f58]">
                guessed: {slot.guessedClueSetId ? `Clue ${slot.guessedClueSetId}` : 'no guess'}
              </div>
              <div className="flex gap-1.5">
                <SmallButton tone={slot.correct === true ? 'amber' : 'default'} onClick={() => m.setGuessCorrect(slot.question, true)}>Correct</SmallButton>
                <SmallButton tone={slot.correct === false ? 'red' : 'default'} onClick={() => m.setGuessCorrect(slot.question, false)}>Incorrect</SmallButton>
              </div>
              {slot.correct && (
                <div>
                  <SectionLabel>{QUESTION_LABEL[slot.question]}</SectionLabel>
                  <TextArea rows={2} value={slot.answer} onChange={(e) => m.setGuessAnswer(slot.question, e.target.value)} placeholder="This is true…" />
                </div>
              )}
            </>
          )}
        </div>
      ))}

      {!m.revealed ? (
        <SmallButton tone="amber" disabled={!allGuessed} onClick={() => m.revealTruths()}>Reveal truth cards</SmallButton>
      ) : (
        <div className="space-y-2">
          <div>
            <SectionLabel>Lingering question (optional)</SectionLabel>
            <TextArea rows={2} value={m.lingeringQuestion} onChange={(e) => m.setLingeringQuestion(e.target.value)} placeholder="What do you still wonder about this case?" />
          </div>
          <SmallButton tone="amber" disabled={m.resolved} onClick={() => m.finishResolve()}>Finish</SmallButton>
        </div>
      )}
    </div>
  );
}
