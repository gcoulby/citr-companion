import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useMysteryStore } from '../../store/mysteryStore';
import { useSceneUiStore } from '../../store/sceneUiStore';
import { SectionLabel, SmallButton, TextArea } from '../play/ui';
import { PlayingCardView } from '../play/PlayingCard';
import { appendSceneBlockToCaseNotes } from '../../lib/sceneNotes';
import { TRUTH_RANKS, SUITS, type ResolveQuestion, type Suit, type TruthRank } from '../../game/types';

interface Props {
  onSaved: () => void;
}

const QUESTIONS_IN_ORDER: ResolveQuestion[] = ['location', 'object', 'treachery'];
const QUESTION_LABEL: Record<ResolveQuestion, string> = {
  location: 'Why was the location significant?',
  object: 'Why was the object significant?',
  treachery: 'Why did this treachery befall the object?',
};

const RANK_LABEL: Record<TruthRank, string> = { J: 'Jack', Q: 'Queen', K: 'King' };
const SUIT_LABEL: Record<Suit, string> = { hearts: 'Hearts', diamonds: 'Diamonds', clubs: 'Clubs', spades: 'Spades' };

function cardKey(rank: TruthRank, suit: Suit) {
  return `${rank}-${suit}`;
}

// The Solve (p.35-36): a dedicated final scene, not a settings-panel tab —
// framing text first ("use the end of game trigger to inform what this final
// scene could look like"), then guess the 3 sealed truth cards, reveal them
// all at once, and answer questions in fixed order (i, then ii, then iii),
// one per correct guess.
//
// The 3 guesses are a SET, not tied to a specific question — p.36 says
// "write down your guesses for each of the truth cards", not "guess which
// card is the location's". However many of your 3 guesses match a sealed
// card (in any position) is how many of the fixed questions you answer,
// always starting from the first. The candidate pool for guessing is every
// face card *not* already revealed via a Truth scene — those are proven not
// to be sealed.
export function ResolveResolver({ onSaved }: Props) {
  const m = useMysteryStore();
  const ui = useSceneUiStore((s) => s.resolve);
  const setUi = useSceneUiStore((s) => s.setResolve);
  const resetUi = useSceneUiStore((s) => s.resetResolve);
  const setActiveKind = useSceneUiStore((s) => s.setActiveKind);
  const [saving, setSaving] = useState(false);

  const candidates = TRUTH_RANKS.flatMap((rank) =>
    SUITS.map((suit) => ({ rank, suit })),
  ).filter(
    (c) => !m.truthDiscard.some((d) => d.rank === c.rank && d.suit === c.suit),
  );

  const readyToReveal = m.guesses.length === 3;
  const answerableQuestions = QUESTIONS_IN_ORDER.slice(0, m.correctGuessCount ?? 0);
  const answeredOk = m.sealed
    .filter((s) => answerableQuestions.includes(s.question))
    .every((s) => s.answer.trim());

  const handleSave = async () => {
    setSaving(true);
    const lines = QUESTIONS_IN_ORDER.map((q) => {
      const slot = m.sealed.find((s) => s.question === q);
      const answered = answerableQuestions.includes(q);
      return `${QUESTION_LABEL[q]} (${answered ? 'answered' : 'unanswered'})${answered ? `\n${slot?.answer.trim() ?? ''}` : ''}`;
    });
    const text = [
      ui.framingText.trim(),
      '',
      `Guessed ${m.correctGuessCount ?? 0} of 3 sealed truths correctly.`,
      ...lines,
      m.lingeringQuestion.trim() ? `\nLingering question: ${m.lingeringQuestion.trim()}` : '',
    ].filter(Boolean).join('\n\n');
    await appendSceneBlockToCaseNotes({ sceneType: 'resolve', text });
    m.finishResolve();
    resetUi();
    setActiveKind(null);
    onSaved();
  };

  return (
    <div className="p-6 space-y-4 max-w-lg">
      <button
        onClick={() => setActiveKind(null)}
        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={12} /> Choose a different scene
      </button>
      <h2 className="font-display text-lg text-foreground">The Solve</h2>

      {!ui.introDone ? (
        <>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            Your investigator attempts to piece together their clues to uncover the truth.
            This could involve them presenting the case to someone significant to them, or
            a final showdown with the culprit. Set the scene — what brought this on?
          </p>
          <div>
            <SectionLabel>How does this final scene play out?</SectionLabel>
            <TextArea
              rows={4}
              value={ui.framingText}
              onChange={(e) => setUi({ framingText: e.target.value })}
              placeholder="What happens…"
            />
          </div>
          <SmallButton tone="amber" disabled={!ui.framingText.trim()} onClick={() => setUi({ introDone: true })}>
            Begin the guess
          </SmallButton>
        </>
      ) : !m.revealed ? (
        <>
          <div className="text-[11px] text-muted-foreground leading-relaxed">
            Three truth cards were sealed at the start of this mystery — never inspected
            until now. Write down 3 guesses, then reveal them together — order doesn't
            matter, only how many match. Cards already surfaced by a Truth scene are ruled
            out below.
          </div>
          <div className="text-[11px] text-foreground">{m.guesses.length} of 3 guessed</div>
          <div className="flex flex-wrap gap-1">
            {candidates.map((c) => {
              const selected = m.guesses.some((g) => g.rank === c.rank && g.suit === c.suit);
              const disabled = !selected && m.guesses.length >= 3;
              return (
                <button
                  key={cardKey(c.rank, c.suit)}
                  type="button"
                  disabled={disabled}
                  title={`${RANK_LABEL[c.rank]} of ${SUIT_LABEL[c.suit]}`}
                  onClick={() => m.toggleGuess(c)}
                  className={`rounded transition-all ${selected ? 'ring-2 ring-primary' : disabled ? 'opacity-30' : 'opacity-70 hover:opacity-100'}`}
                >
                  <PlayingCardView card={{ id: cardKey(c.rank, c.suit), rank: c.rank, suit: c.suit }} size="sm" />
                </button>
              );
            })}
          </div>
          <SmallButton tone="amber" disabled={!readyToReveal} onClick={() => m.revealTruths()}>
            Reveal truth cards
          </SmallButton>
        </>
      ) : (
        <>
          <div className="space-y-2 bg-background p-2.5 border border-border rounded">
            <div className="text-[12px] text-foreground">
              {m.correctGuessCount} of 3 guesses matched a sealed card.
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground/70 mb-1">Your guesses</div>
              <div className="flex flex-wrap gap-2">
                {m.guesses.map((g) => {
                  const hit = m.sealed.some((s) => s.card.rank === g.rank && s.card.suit === g.suit);
                  return (
                    <div key={cardKey(g.rank, g.suit)} className="flex items-center gap-1.5">
                      <PlayingCardView card={{ id: cardKey(g.rank, g.suit), rank: g.rank, suit: g.suit }} size="sm" />
                      <span className={`text-[10px] ${hit ? 'text-green-400' : 'text-red-400'}`}>
                        {hit ? 'correct' : 'incorrect'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground/70 mb-1">The sealed truths</div>
              <div className="flex flex-wrap gap-3">
                {m.sealed.map((slot) => (
                  <div key={slot.question} className="flex items-center gap-1.5">
                    <PlayingCardView card={slot.card} size="sm" />
                    <span className="text-[10px] text-muted-foreground/70 capitalize">{slot.question}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {answerableQuestions.length === 0 ? (
            <div className="text-[11px] text-muted-foreground">
              No guesses matched — none of the questions can be answered this time.
            </div>
          ) : (
            answerableQuestions.map((q, i) => {
              const slot = m.sealed.find((s) => s.question === q)!;
              return (
                <div key={q} className="space-y-1">
                  <SectionLabel>{`${['i', 'ii', 'iii'][i]}. ${QUESTION_LABEL[q]}`}</SectionLabel>
                  <TextArea
                    rows={2}
                    value={slot.answer}
                    onChange={(e) => m.setGuessAnswer(q, e.target.value)}
                    placeholder="This is true…"
                  />
                </div>
              );
            })
          )}

          <div>
            <SectionLabel>Lingering question (optional)</SectionLabel>
            <TextArea
              rows={2}
              value={m.lingeringQuestion}
              onChange={(e) => m.setLingeringQuestion(e.target.value)}
              placeholder="What do you still wonder about this case?"
            />
          </div>
          <SmallButton tone="amber" disabled={saving || !answeredOk} onClick={() => void handleSave()}>
            Add to Field Notes
          </SmallButton>
        </>
      )}
    </div>
  );
}
