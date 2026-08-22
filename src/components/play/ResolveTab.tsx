import { useState } from 'react'
import { useMysteryStore } from '../../store/mysteryStore'
import type { ResolveQuestion } from '../../game/types'

import { SectionLabel, SmallButton, TextArea } from './ui'
import { PlayingCardView } from '@/components/play/PlayingCard'

const QUESTION_LABEL: Record<ResolveQuestion, string> = {
  location: 'Why was the location significant?',
  object: 'Why was the object significant?',
  treachery: 'Why did this treachery befall the object?',
}

export function ResolveTab() {
  const m = useMysteryStore()
  const [confirmAbandon, setConfirmAbandon] = useState(false)

  if (!m.started) {
    return (
      <div className="p-4 text-[11px] text-muted-foreground/40">
        Begin a mystery first, on the Mystery tab.
      </div>
    )
  }

  const clueOptions = Object.values(m.clueSets).filter(
    (cs) => cs.status !== 'falseLead',
  )
  const allGuessed = m.sealed.every((s) => s.guessedClueSetId)

  return (
    <div className="space-y-4 p-4">
      {m.resolved && (
        <div className="bg-green-400/10 px-2.5 py-1.5 border border-green-400/30 rounded text-[11px] text-green-400">
          Mystery resolved.
        </div>
      )}

      <div className="text-[11px] text-muted-foreground leading-relaxed">
        Three truth cards were sealed at the start of this mystery — never
        inspected until now. Guess which clue set confirms each, then reveal.
      </div>

      <div className="p-2.5 rounded border border-destructive/30 bg-destructive/5">
        {confirmAbandon ? (
          <div className="space-y-2">
            <div className="text-[11px] text-destructive">
              Abandon this mystery and start a new one? The clock, decks, threats, and sealed truths reset — board nodes you've already created stay put.
            </div>
            <div className="flex gap-1.5">
              <SmallButton tone="red" onClick={() => { m.reset(); setConfirmAbandon(false) }}>Confirm abandon</SmallButton>
              <SmallButton onClick={() => setConfirmAbandon(false)}>Cancel</SmallButton>
            </div>
          </div>
        ) : (
          <SmallButton tone="red" onClick={() => setConfirmAbandon(true)}>Abandon mystery &amp; start over</SmallButton>
        )}
      </div>

      {m.sealed.map((slot) => (
        <div
          key={slot.question}
          className="space-y-2 bg-background p-2.5 border border-border rounded"
        >
          <div className="relative flex justify-between items-center">
            <span className="font-mono text-[11px] text-foreground capitalize">
              {slot.question}
            </span>
            {/* {m.revealed && <Badge tone="gold">{cardLabel(slot.card)}</Badge>} */}
            {m.revealed && <PlayingCardView card={slot.card} size="sm" />}
          </div>

          {!m.revealed ? (
            <select
              value={slot.guessedClueSetId ?? ''}
              onChange={(e) =>
                m.setGuess(slot.question, e.target.value || null)
              }
              className="bg-background px-2 py-1 border border-border rounded w-full text-[11px] text-foreground"
            >
              <option value="">— pick a clue set —</option>
              {clueOptions.map((cs) => (
                <option key={cs.id} value={cs.id}>
                  Clue {cs.rank} — {cs.description || 'no description'}
                </option>
              ))}
            </select>
          ) : (
            <>
              <div className="text-[10px] text-muted-foreground/70">
                guessed:{' '}
                {slot.guessedClueSetId
                  ? `Clue ${slot.guessedClueSetId}`
                  : 'no guess'}
              </div>
              <div className="flex gap-1.5">
                <SmallButton
                  tone={slot.correct === true ? 'amber' : 'default'}
                  onClick={() => m.setGuessCorrect(slot.question, true)}
                >
                  Correct
                </SmallButton>
                <SmallButton
                  tone={slot.correct === false ? 'red' : 'default'}
                  onClick={() => m.setGuessCorrect(slot.question, false)}
                >
                  Incorrect
                </SmallButton>
              </div>
              {slot.correct && (
                <div>
                  <SectionLabel>{QUESTION_LABEL[slot.question]}</SectionLabel>
                  <TextArea
                    rows={2}
                    value={slot.answer}
                    onChange={(e) =>
                      m.setGuessAnswer(slot.question, e.target.value)
                    }
                    placeholder="This is true…"
                  />
                </div>
              )}
            </>
          )}
        </div>
      ))}

      {!m.revealed ? (
        <SmallButton
          tone="amber"
          disabled={!allGuessed}
          onClick={() => m.revealTruths()}
        >
          Reveal truth cards
        </SmallButton>
      ) : (
        <div className="space-y-2">
          <div>
            <SectionLabel>Lingering question (optional)</SectionLabel>
            <TextArea
              rows={2}
              value={m.lingeringQuestion}
              onChange={(e) => m.setLingeringQuestion(e.target.value)}
              placeholder="What do you still wonder about this case?"
            />
          </div>
          <SmallButton
            tone="amber"
            disabled={m.resolved}
            onClick={() => m.finishResolve()}
          >
            Finish
          </SmallButton>
        </div>
      )}
    </div>
  )
}
