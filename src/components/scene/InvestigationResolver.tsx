import { useState } from 'react'
import { ArrowLeft, Dices, Pencil } from 'lucide-react'
import { useMysteryStore, type ClueDrawResult } from '../../store/mysteryStore'
import { useInvestigatorStore } from '../../store/investigatorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useGraphStore } from '../../store/graphStore'
import {
  useSceneUiStore,
  type InvestigationUiState,
} from '../../store/sceneUiStore'
import {
  ATTRIBUTES,
  SUITS,
  type Attribute,
  type ClueRank,
  type InvestigationStage,
  type Suit,
  type ThreatEntry,
} from '../../game/types'
import type {
  AttributeOutcome,
  ConsequenceRollResult,
  D66Roll,
} from '../../game/dice'
import { d66FromDice } from '../../game/dice'
import {
  rollSubjectOracle,
  subjectOracleFromRolls,
  rollOracleTable,
} from '../../game/oracles'
import { GENRE_TABLES, type GenreTableSet } from '../../game/genreTables'
import {
  SectionLabel,
  Badge,
  SmallButton,
  TextArea,
  TextInput,
  DiceRoller,
  CopyButton,
} from '../play/ui'
import { ClueDrawControl } from '../play/MysteryTab'
import { PlayingCardView } from '../play/PlayingCard'
import { PhaseTracker, type Phase } from './PhaseTracker'
import { appendSceneBlockToCaseNotes } from '../../lib/sceneNotes'
import { useClueText, setClueText } from '../../lib/clueText'

const ATTRIBUTE_LABELS: Record<Attribute, string> = {
  power: 'Power',
  insight: 'Insight',
  method: 'Method',
}
const STAGE_ORDER: InvestigationStage[] = [
  'infiltration',
  'discovery',
  'acquisition',
  'escape',
]
const STAGE_LABELS: Record<InvestigationStage, string> = {
  infiltration: 'Infiltration',
  discovery: 'Discovery',
  acquisition: 'Acquisition',
  escape: 'Escape',
}
const STAGE_FRAME: Record<InvestigationStage, string> = {
  infiltration: 'Find a way into the location.',
  discovery: 'Learn where to find a clue.',
  acquisition: 'Discover a clue.',
  escape: 'Flee the location.',
}
const SUIT_SYMBOL: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
}
const PROMPT_LABEL: Record<AttributeOutcome, string> = {
  failure: "What's in their way?",
  cost: "What's the complication, and how do they respond?",
  success: 'What do they do next?',
}

function summarizeTest(test: InvestigationUiState['test']): string {
  if (!test) return 'nothing rolled yet'
  return `${test.roll.a}+${test.roll.b}+${test.attributeValue}=${test.total} (${test.outcome})`
}

interface Props {
  onSaved: () => void
  onOpenResolve: () => void
}

// Full state of both game stores plus this attempt's UI slice, captured
// right before the attempt's first attribute-test roll. The "Re-roll an
// attribute test" keyword action (p.31) needs to undo everything that roll
// caused (danger, threats, clues, fatigue, prompts) before rolling again —
// restoring these snapshots wholesale is the only reliable way to do that
// without hand-tracking every possible side effect individually.
interface StoreSnapshot {
  mystery: ReturnType<typeof useMysteryStore.getState>
  investigator: ReturnType<typeof useInvestigatorStore.getState>
  ui: InvestigationUiState
}

interface RerollPending {
  keywordId: string
  // State as it stood right before restoring to the pre-roll snapshot —
  // i.e. what "keep the previous outcome" needs to restore back to.
  previous: StoreSnapshot
}

export function InvestigationResolver({ onSaved, onOpenResolve }: Props) {
  const m = useMysteryStore()
  const inv = useInvestigatorStore()
  const genre = useSettingsStore((s) => s.genre)
  const genreTables = GENRE_TABLES[genre]
  const ui = useSceneUiStore((s) => s.investigation)
  const startInvestigation = useSceneUiStore((s) => s.startInvestigation)
  const updateInvestigation = useSceneUiStore((s) => s.updateInvestigation)
  const appendLog = useSceneUiStore((s) => s.appendInvestigationLog)
  const resetStageAttempt = useSceneUiStore((s) => s.resetStageAttempt)
  const resetInvestigation = useSceneUiStore((s) => s.resetInvestigation)
  const setActiveKind = useSceneUiStore((s) => s.setActiveKind)
  const [saving, setSaving] = useState(false)
  const [preTestSnapshot, setPreTestSnapshot] = useState<StoreSnapshot | null>(
    null,
  )
  const [rerollPending, setRerollPending] = useState<RerollPending | null>(
    null,
  )
  // A drawn Joker (p.17) pauses a clue draw mid-action: pick a clue set
  // (that isn't already a truth) to become a false lead, then the draw
  // continues automatically. `context` tracks which of the two draw slots
  // (the stage's own clue, or the 10+ bonus clue) is waiting.
  const [jokerChoice, setJokerChoice] = useState<{
    context: 'stage' | 'bonus'
    candidateClueSetIds: string[]
  } | null>(null)
  // A fresh stage attempt invalidates any in-progress reroll bookkeeping
  // from the attempt just left behind.
  const startFreshAttempt = () => {
    setPreTestSnapshot(null)
    setRerollPending(null)
    setJokerChoice(null)
    resetStageAttempt()
  }

  // ── Not started yet ──────────────────────────────────────────────────────
  if (!ui) {
    const handleStart = (
      result: ReturnType<typeof m.startInvestigationScene>,
    ) => {
      startInvestigation(
        m.day,
        m.danger,
        inv.fatigue,
        Object.keys(m.clueSets).length,
      )
      const flavour =
        result.outcome === 'quiet'
          ? 'Quiet entry. You start at the Discovery stage.'
          : result.outcome === 'threatLevel1'
            ? "Something or someone is in your investigator's way. You must start by infiltrating the location."
            : "Your investigator's been noticed. You must start by infiltrating the location."
      const newThreatId =
        result.outcome !== 'quiet'
          ? (useMysteryStore.getState().scene.threatIds[0] ?? '')
          : ''
      updateInvestigation({ roll: result, threatNaming: newThreatId })
      appendLog(flavour, null)
    }
    return (
      <div className="space-y-4 p-6 max-w-lg">
        <BackButton onClick={() => setActiveKind(null)} />
        <h2 className="font-display text-foreground text-lg">Investigation</h2>
        <div>
          <SectionLabel>
            Investigation roll — 1d6 + danger ({m.danger})
          </SectionLabel>
          <DiceRoller
            dice={1}
            label="Roll investigation"
            onRoll={() => handleStart(m.startInvestigationScene())}
            onManual={([a]) => handleStart(m.startInvestigationSceneManual(a))}
          />
        </div>
      </div>
    )
  }

  const stage = m.scene.stage
  const active = m.scene.active
  const test = ui.test
  const eligibleThreats = test
    ? m.threats.filter(
        (t) =>
          !t.defeated &&
          t.id !== test.addedThreatId &&
          !ui.threatResults.some((r) => r.threatId === t.id),
      )
    : []
  const threatsResolved = eligibleThreats.length === 0
  const canAdvance =
    !!test &&
    test.outcome !== 'failure' &&
    threatsResolved &&
    (stage !== 'acquisition' || ui.stageClueDrawn) &&
    // Bonus clues on a 10+ only apply at Acquisition — the only stage that
    // grants clues at all — not on a 10+ at any other stage.
    (test.outcome !== 'success' || stage !== 'acquisition' || ui.bonusClueDrawn)

  // What's actually holding Continue back, spelled out — so a disabled
  // button doesn't just sit there unexplained.
  const advanceBlockers: string[] = []
  if (test && test.outcome !== 'failure') {
    if (!threatsResolved)
      advanceBlockers.push(
        `${eligibleThreats.length} threat${eligibleThreats.length === 1 ? '' : 's'} still need${eligibleThreats.length === 1 ? 's' : ''} to act`,
      )
    if (stage === 'acquisition' && !ui.stageClueDrawn)
      advanceBlockers.push('discover a clue')
    if (
      test.outcome === 'success' &&
      stage === 'acquisition' &&
      !ui.bonusClueDrawn
    )
      advanceBlockers.push('draw the bonus clue')
  }

  // ── Phase tracker ────────────────────────────────────────────────────────
  const skippedInfiltration = ui.roll?.outcome === 'quiet'
  const phases: Phase[] = [
    { id: 'roll', label: 'Investigation Roll', status: 'done' },
    ...STAGE_ORDER.map((s): Phase => {
      if (skippedInfiltration && s === 'infiltration')
        return { id: s, label: STAGE_LABELS[s], status: 'skipped' }
      if (active && s === stage)
        return { id: s, label: STAGE_LABELS[s], status: 'current' }
      // Only stages that actually completed count as done — a fatigue
      // interrupt can jump straight to Escape, so a later stage (Escape)
      // being reached does NOT mean earlier ones (Infiltration/Discovery/
      // Acquisition) were ever played; index position alone can't tell.
      if (ui.completedStages.includes(s))
        return { id: s, label: STAGE_LABELS[s], status: 'done' }
      if (!active) return { id: s, label: STAGE_LABELS[s], status: 'skipped' }
      const idx = STAGE_ORDER.indexOf(s)
      const curIdx = STAGE_ORDER.indexOf(stage)
      return {
        id: s,
        label: STAGE_LABELS[s],
        status: idx > curIdx ? 'upcoming' : 'skipped',
      }
    }),
    { id: 'end', label: 'End Scene', status: ui.ended ? 'done' : 'upcoming' },
  ]

  // ── Shared consequence-roll runner — every consequence roll (the test's
  // own, or a threat acting) can push fatigue past the track's cap, so every
  // one is checked for the fatigue interrupt in the same place. ────────────
  const runConsequence = (
    rollFn: () => ConsequenceRollResult,
    forThreatId?: string,
  ) => {
    const before = useInvestigatorStore.getState().struckAttributes
    const result = rollFn()
    const after = useInvestigatorStore.getState().struckAttributes
    const cur = useSceneUiStore.getState().investigation
    if (!cur) return
    if (forThreatId) {
      const threat = m.threats.find((t) => t.id === forThreatId)
      appendLog(
        `${threat?.name ?? 'A threat'} acts: ${result.roll}+${result.bonus}=${result.total} → ${result.outcome}`,
        stage,
      )
      updateInvestigation({
        threatResults: [
          ...cur.threatResults,
          { threatId: forThreatId, roll: result },
        ],
      })
    } else {
      appendLog(
        `Consequences: ${result.roll}+${result.bonus}=${result.total} → ${result.outcome}`,
        stage,
      )
      updateInvestigation({ consequence: result })
    }
    if (after.length > before.length) {
      // Name exactly which attribute got struck — the track resets to its
      // remainder in the same instant it fills, so without this line
      // there's no visible moment where the track reads "full" to explain
      // why an attribute just got struck.
      const newlyStruck = after.find((a) => !before.includes(a))
      if (newlyStruck) {
        appendLog(
          `Fatigue track filled — ${ATTRIBUTE_LABELS[newlyStruck]} struck.`,
          stage,
        )
      }
      triggerFatigueInterrupt()
    }
  }

  const triggerFatigueInterrupt = () => {
    const s = useMysteryStore.getState()
    if (!s.scene.active || s.scene.stage === 'escape') return
    // Pause instead of silently jumping — ask why the investigator was
    // forced to flee before the stage skip actually happens.
    updateInvestigation({
      awaitingForcedEscape: true,
      fatigueInterrupted: true,
    })
  }

  const confirmForcedEscape = () => {
    const cur = useSceneUiStore.getState().investigation
    if (!cur) return
    const s = useMysteryStore.getState()
    if (!s.threats.some((t) => !t.defeated)) s.addThreat(1)
    while (
      useMysteryStore.getState().scene.active &&
      useMysteryStore.getState().scene.stage !== 'escape'
    ) {
      useMysteryStore.getState().advanceStage()
    }
    appendLog(
      'Fatigue track filled — jumping straight to the Escape stage.',
      null,
    )
    const note = cur.forcedEscapeNote.trim()
    updateInvestigation({
      awaitingForcedEscape: false,
      forcedEscapeNote: '',
      stageNotes: note ? { ...cur.stageNotes, escape: note } : cur.stageNotes,
    })
    startFreshAttempt()
  }

  const finalizeEnd = () => {
    const cur = useSceneUiStore.getState().investigation
    if (!cur) return
    // Draft the closing summary from what was actually hand-written during
    // play (the intro flavour + each stage's "why"/"what happened" answer)
    // instead of the raw mechanical roll log — that stays visible, but
    // collapsed, in the saved record instead of duplicated here.
    const introText = cur.log
      .filter((l) => !l.stage)
      .map((l) => l.text)
      .join(' ')
    const draft = [
      introText,
      ...STAGE_ORDER.map((s) => cur.stageNotes[s]).filter(Boolean),
    ].join('\n\n')
    // Snapshot the stage now — mysteryStore.endScene() resets scene.stage
    // back to 'discovery' as part of clearing the scene, so `stage` (read
    // from live store state) can no longer be trusted once that's happened.
    updateInvestigation({
      ended: true,
      finalStage: stage,
      fieldNotesText: draft,
    })
  }

  const captureSnapshot = (): StoreSnapshot => ({
    mystery: useMysteryStore.getState(),
    investigator: useInvestigatorStore.getState(),
    ui: useSceneUiStore.getState().investigation!,
  })

  const handleAttributeRoll = (a?: number, b?: number) => {
    // Snapshot right before this attempt's first roll — the baseline the
    // "Re-roll an attribute test" keyword restores to. A roll made while
    // ui.test is already set is a reroll continuing from that same baseline,
    // not a new attempt, so it doesn't get its own snapshot.
    if (!ui.test) setPreTestSnapshot(captureSnapshot())
    const result =
      a !== undefined && b !== undefined
        ? m.runAttributeTestManual(ui.attribute, a, b)
        : m.runAttributeTest(ui.attribute)
    // Doubles just flags that a random event is available — rolling it is a
    // separate, player-triggered action (below), not automatic.
    updateInvestigation({ test: result, randomEvent: null })
    appendLog(
      `${ATTRIBUTE_LABELS[ui.attribute]} test: ${result.roll.a}+${result.roll.b}+${result.attributeValue}=${result.total} (${result.outcome})`,
      stage,
    )
  }

  const drawnCardLabel = (rank: ClueRank): string => {
    const cs = useMysteryStore.getState().clueSets[rank]
    const card = cs?.cards[cs.cards.length - 1]
    if (!card) return ''
    return card.suit
      ? ` (${card.rank}${SUIT_SYMBOL[card.suit]})`
      : ` (${card.rank})`
  }

  // Every clue-draw outcome, including the two the old draw handling used to
  // drop silently: a Joker (p.17) either pauses for a false-lead pick, or —
  // with no clue sets left to sacrifice — doubles danger outright.
  const handleClueDrawResult = (
    context: 'stage' | 'bonus',
    result: ClueDrawResult,
    action: string,
    manual: boolean,
  ) => {
    const suffix = manual ? ' (physical draw)' : ''
    if (result.kind === 'established' || result.kind === 'strengthened') {
      appendLog(`${action}${suffix}.${drawnCardLabel(result.rank)}`, stage)
      updateInvestigation(
        context === 'stage'
          ? { stageClueDrawn: true, stageClueRank: result.rank }
          : { bonusClueDrawn: true, bonusClueRank: result.rank },
      )
      return
    }
    if (result.kind === 'jokerChoice') {
      appendLog(
        `${action}${suffix} drew a Joker — choose a clue set to become a false lead.`,
        stage,
      )
      setJokerChoice({ context, candidateClueSetIds: result.candidateClueSetIds })
      return
    }
    if (result.kind === 'doubleDanger') {
      appendLog(
        `${action}${suffix} drew a Joker with no clue sets to sacrifice — danger doubled to ${useMysteryStore.getState().danger}.`,
        stage,
      )
      updateInvestigation(
        context === 'stage'
          ? { stageClueDrawn: true, stageClueRank: '' }
          : { bonusClueDrawn: true, bonusClueRank: '' },
      )
      return
    }
    // Discarded into an existing false lead/truth, or the deck is empty —
    // nothing more to show, but the draw action is still used up.
    appendLog(`${action}${suffix} gained no clue.`, stage)
    updateInvestigation(
      context === 'stage'
        ? { stageClueDrawn: true, stageClueRank: '' }
        : { bonusClueDrawn: true, bonusClueRank: '' },
    )
  }

  const handleResolveJoker = (clueSetId: string) => {
    if (!jokerChoice) return
    const cs = m.clueSets[clueSetId]
    m.resolveJoker(clueSetId)
    appendLog(`Clue ${cs?.rank ?? clueSetId} becomes a false lead.`, stage)
    setJokerChoice(null)
  }

  // ── Keyword actions (p.31) ───────────────────────────────────────────────
  const handleReroll = (keywordId: string) => {
    if (!preTestSnapshot || !ui.test) return
    // Capture what currently exists (this attempt's roll + everything it
    // caused) as the "previous outcome" the player can still choose to keep,
    // then roll back to right before that roll happened.
    const previous = captureSnapshot()
    useMysteryStore.setState(preTestSnapshot.mystery)
    useInvestigatorStore.setState(preTestSnapshot.investigator)
    updateInvestigation(preTestSnapshot.ui)
    // Strike the keyword on the now-restored investigator state so it
    // sticks regardless of which outcome ends up kept.
    useInvestigatorStore.getState().useKeyword(keywordId)
    appendLog('Used a keyword to reroll the attribute test.', stage)
    setRerollPending({ keywordId, previous })
  }

  const handleKeepPreviousRoll = () => {
    if (!rerollPending) return
    useMysteryStore.setState(rerollPending.previous.mystery)
    useInvestigatorStore.setState(rerollPending.previous.investigator)
    updateInvestigation(rerollPending.previous.ui)
    // Re-strike — `previous` was captured before the keyword strike above,
    // so restoring it wholesale would otherwise un-strike it.
    useInvestigatorStore.getState().useKeyword(rerollPending.keywordId)
    setRerollPending(null)
  }

  const handleStrengthenClue = (
    keywordId: string,
    rank: ClueRank,
    suit?: Suit,
  ) => {
    m.drawClueCardManual(rank, suit)
    appendLog(`Used a keyword to strengthen Clue ${rank}.`, stage)
    inv.useKeyword(keywordId)
  }

  const handleEliminateThreat = (keywordId: string, threatId: string) => {
    const threat = m.threats.find((t) => t.id === threatId)
    m.defeatThreat(threatId)
    appendLog(
      `Used a keyword to eliminate ${threat?.name ?? 'a threat'}.`,
      stage,
    )
    inv.useKeyword(keywordId)
  }

  const applyRandomEvent = (oracle: ReturnType<typeof rollSubjectOracle>) => {
    updateInvestigation({ randomEvent: oracle })
    const summary = `${oracle.action.result} the ${oracle.descriptor.result} ${oracle.focus.result}.`
    appendLog(`Random event: ${summary}`, stage)
    // Visible on the board immediately, same as clues/threats — not a
    // separate manual step.
    useGraphStore.getState().addNode({
      label: 'Random event',
      summary,
      tags: [],
      hasContent: false,
      properties: {},
      nodeType: 'event',
    })
  }
  const handleRandomEvent = () => applyRandomEvent(rollSubjectOracle())
  const handleRandomEventManual = (
    action: D66Roll,
    descriptor: D66Roll,
    focus: D66Roll,
  ) => applyRandomEvent(subjectOracleFromRolls(action, descriptor, focus))

  const saveStageNote = () => {
    const answer = ui.wayPrompt.trim()
    if (!answer) return
    const existing = ui.stageNotes[stage]
    updateInvestigation({
      stageNotes: {
        ...ui.stageNotes,
        [stage]: existing ? `${existing}\n${answer}` : answer,
      },
    })
  }

  const markStageCompleted = () => {
    const cur = useSceneUiStore.getState().investigation
    if (!cur || cur.completedStages.includes(stage)) return
    updateInvestigation({ completedStages: [...cur.completedStages, stage] })
  }

  const handleComplete = () => {
    saveStageNote()
    markStageCompleted()
    if (stage === 'escape') {
      m.endScene()
      finalizeEnd()
      return
    }
    m.setDanger(m.danger + 1)
    appendLog(`Danger rises to ${m.danger + 1}.`, stage)
    m.advanceStage()
    if (!useMysteryStore.getState().scene.active) {
      finalizeEnd()
    } else {
      startFreshAttempt()
    }
  }

  const handleSave = async () => {
    if (!ui.ended) return
    setSaving(true)
    const intro: string[] = []
    const grouped = new Map<InvestigationStage, string[]>()
    for (const line of ui.log) {
      if (!line.stage) {
        intro.push(line.text)
        continue
      }
      const bucket = grouped.get(line.stage) ?? []
      bucket.push(line.text)
      grouped.set(line.stage, bucket)
    }
    const stages = STAGE_ORDER.filter(
      (s) => grouped.has(s) || ui.stageNotes[s],
    ).map((s) => ({
      stage: s,
      label: STAGE_LABELS[s],
      narrative: ui.stageNotes[s] ?? '',
      lines: grouped.get(s) ?? [],
    }))

    await appendSceneBlockToCaseNotes({
      sceneType: 'investigation',
      stage: ui.finalStage || undefined,
      text: ui.fieldNotesText,
      includeSnapshot: true,
      investigationRecord: {
        day: ui.startedAt.day,
        dangerStart: ui.startedAt.danger,
        dangerEnd: m.danger,
        fatigueStart: ui.startedAt.fatigue,
        fatigueEnd: inv.fatigue,
        cluesStart: ui.startedAt.clueCount,
        cluesEnd: Object.keys(m.clueSets).length,
        threatsDefeated: m.threats.filter((t) => t.defeated).length,
        threatsRemaining: m.threats.filter((t) => !t.defeated).length,
        finalStage: ui.finalStage,
        intro,
        stages,
      },
    })
    resetInvestigation()
    setActiveKind(null)
    onSaved()
  }

  return (
    <div className="space-y-4 p-6 max-w-2xl">
      {/* Always available — every roll past this point is a real, committed
          effect (like physical dice), so leaving doesn't undo any of it. But
          nothing is lost either: this whole attempt lives in sceneUiStore, so
          picking Investigation again from Choose Your Scene resumes exactly
          here, mid-stage rolls and all. */}
      <BackButton onClick={() => setActiveKind(null)} />
      <h2 className="font-display text-foreground text-lg">Investigation</h2>
      <PhaseTracker phases={phases} />

      {ui.roll && (
        <div className="text-[11px] text-muted-foreground/80">
          rolled {ui.roll.roll} + danger {ui.roll.danger} = {ui.roll.total}
        </div>
      )}

      {ui.threatNaming && (
        <ThreatNamePrompt
          threatId={ui.threatNaming}
          genreTables={genreTables}
          onDone={() => updateInvestigation({ threatNaming: '' })}
        />
      )}

      {ui.awaitingForcedEscape && (
        <div className="space-y-1.5 bg-red-400/5 p-2.5 border border-red-400/30 rounded">
          <div className="text-[11px] text-red-400">
            Fatigue has taken its toll — forced to escape. Why?
          </div>
          <TextArea
            rows={2}
            value={ui.forcedEscapeNote}
            onChange={(e) =>
              updateInvestigation({ forcedEscapeNote: e.target.value })
            }
            placeholder="What breaks? How do they get out?"
          />
          <SmallButton onClick={confirmForcedEscape}>Continue</SmallButton>
        </div>
      )}

      {!ui.ended && active && !ui.threatNaming && !ui.awaitingForcedEscape && (
        <div className="space-y-3 bg-background p-3 border border-border rounded">
          <div className="flex justify-between items-center">
            <SectionLabel>
              {STAGE_LABELS[stage]} — {STAGE_FRAME[stage]}
            </SectionLabel>
            <Badge tone="amber">{stage}</Badge>
          </div>

          {!test ? (
            <div className="space-y-2">
              {rerollPending && (
                <div className="text-[11px] text-primary">
                  Rerolling — previous was{' '}
                  {summarizeTest(rerollPending.previous.ui.test)}.
                </div>
              )}
              <AttributeTestStart
                attribute={ui.attribute}
                onPick={(a) => updateInvestigation({ attribute: a })}
                onRoll={() => handleAttributeRoll()}
                onManual={(a, b) => handleAttributeRoll(a, b)}
              />
            </div>
          ) : rerollPending ? (
            <div className="space-y-2 bg-primary/5 p-2 border border-primary/40 rounded">
              <div className="text-[11px] text-muted-foreground">
                Reroll — keep which outcome?
              </div>
              <div className="font-mono text-[11px] text-foreground">
                New: {summarizeTest(test)}
              </div>
              <div className="font-mono text-[11px] text-muted-foreground">
                Previous: {summarizeTest(rerollPending.previous.ui.test)}
              </div>
              <div className="flex items-center gap-1.5">
                <SmallButton onClick={() => setRerollPending(null)}>
                  Keep new
                </SmallButton>
                <SmallButton onClick={handleKeepPreviousRoll}>
                  Use previous
                </SmallButton>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="font-mono text-[11px] text-foreground">
                {test.roll.a}+{test.roll.b}+{test.attributeValue} = {test.total}{' '}
                —{' '}
                <span
                  className={
                    test.outcome === 'success'
                      ? 'text-green-400'
                      : test.outcome === 'cost'
                        ? 'text-primary'
                        : 'text-red-400'
                  }
                >
                  {test.outcome === 'success'
                    ? 'Success'
                    : test.outcome === 'cost'
                      ? 'Success at a cost'
                      : 'Failure'}
                </span>
              </div>
              {test.randomEvent && !ui.randomEvent && (
                <div className="flex items-center gap-1.5 text-[11px] text-primary">
                  <span>Doubles — a random event occurs.</span>
                  <RandomEventRoller
                    onRoll={handleRandomEvent}
                    onManual={handleRandomEventManual}
                  />
                </div>
              )}
              {ui.randomEvent && (
                <div className="flex items-center gap-1.5 text-[11px] text-primary">
                  <span>
                    Random event: {ui.randomEvent.action.result} the{' '}
                    {ui.randomEvent.descriptor.result}{' '}
                    {ui.randomEvent.focus.result}.
                  </span>
                  <CopyButton
                    text={`${ui.randomEvent.action.result} the ${ui.randomEvent.descriptor.result} ${ui.randomEvent.focus.result}`}
                  />
                </div>
              )}
              {test.belowDanger && (
                <div className="text-[11px] text-red-400">
                  Below danger — a new level 1 threat appears, danger halved to{' '}
                  {m.danger}.
                </div>
              )}
              {test.belowDanger && test.addedThreatId && (
                <ThreatNamePrompt
                  threatId={test.addedThreatId}
                  genreTables={genreTables}
                />
              )}

              <div>
                <SectionLabel>{PROMPT_LABEL[test.outcome]}</SectionLabel>
                <TextArea
                  rows={2}
                  value={ui.wayPrompt}
                  onChange={(e) =>
                    updateInvestigation({ wayPrompt: e.target.value })
                  }
                />
              </div>

              {test.outcome === 'failure' && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <SectionLabel>Gain a keyword</SectionLabel>
                    <button
                      onClick={() =>
                        updateInvestigation({
                          keywordPrompt: rollOracleTable(genreTables.keywords)
                            .result,
                        })
                      }
                      title="Roll a keyword for inspiration"
                      className="text-muted-foreground/60 hover:text-primary transition-colors"
                    >
                      <Dices size={11} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TextInput
                      value={ui.keywordPrompt}
                      onChange={(e) =>
                        updateInvestigation({ keywordPrompt: e.target.value })
                      }
                      className="flex-1 h-7 text-[11px]"
                      disabled={ui.keywordAdded}
                    />
                    <SmallButton
                      disabled={ui.keywordAdded || !ui.keywordPrompt.trim()}
                      onClick={() => {
                        inv.addKeyword(ui.keywordPrompt.trim())
                        appendLog(
                          `Gained keyword: ${ui.keywordPrompt.trim()}`,
                          stage,
                        )
                        updateInvestigation({ keywordAdded: true })
                      }}
                    >
                      {ui.keywordAdded ? 'Added' : 'Add keyword'}
                    </SmallButton>
                  </div>
                </div>
              )}

              {(test.outcome === 'failure' || test.outcome === 'cost') && (
                <div>
                  <SectionLabel>Consequences — 1d6</SectionLabel>
                  {!ui.consequence ? (
                    <DiceRoller
                      dice={1}
                      label="Roll consequences"
                      onRoll={() =>
                        runConsequence(() => m.applyConsequences(0))
                      }
                      onManual={([a]) =>
                        runConsequence(() => m.applyConsequencesManual(a, 0))
                      }
                    />
                  ) : (
                    <div className="text-[11px] text-muted-foreground">
                      {ui.consequence.roll}+{ui.consequence.bonus}=
                      {ui.consequence.total} → {ui.consequence.outcome}
                      {ui.consequence.outcome === 'mustStop' && (
                        <div className="bg-red-400/5 mt-1.5 p-2 border border-red-400/30 rounded text-red-400">
                          Your investigator can't continue. The mystery moves to
                          Resolve.
                          <div className="mt-1.5">
                            <SmallButton tone="red" onClick={onOpenResolve}>
                              Go to Resolve
                            </SmallButton>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {stage === 'acquisition' && test.outcome !== 'failure' && (
                <div>
                  <SectionLabel>Discover a clue</SectionLabel>
                  {jokerChoice?.context === 'stage' ? (
                    <JokerChoicePicker
                      candidateClueSetIds={jokerChoice.candidateClueSetIds}
                      onPick={handleResolveJoker}
                    />
                  ) : (
                    <ClueDrawControl
                      disabled={ui.stageClueDrawn}
                      onDraw={() =>
                        handleClueDrawResult('stage', m.drawClueCard(), 'Discovered a clue', false)
                      }
                      onManual={(rank, suit) =>
                        handleClueDrawResult(
                          'stage',
                          m.drawClueCardManual(rank, suit),
                          'Discovered a clue',
                          true,
                        )
                      }
                    />
                  )}
                  {ui.stageClueRank && (
                    <ClueDrawnPreview
                      rank={ui.stageClueRank}
                      genreTables={genreTables}
                    />
                  )}
                </div>
              )}

              {test.outcome === 'success' && stage === 'acquisition' && (
                <div>
                  <SectionLabel>Bonus clue (10+)</SectionLabel>
                  {jokerChoice?.context === 'bonus' ? (
                    <JokerChoicePicker
                      candidateClueSetIds={jokerChoice.candidateClueSetIds}
                      onPick={handleResolveJoker}
                    />
                  ) : (
                    <ClueDrawControl
                      disabled={ui.bonusClueDrawn}
                      onDraw={() =>
                        handleClueDrawResult('bonus', m.drawClueCard(), 'Gained a bonus clue', false)
                      }
                      onManual={(rank, suit) =>
                        handleClueDrawResult(
                          'bonus',
                          m.drawClueCardManual(rank, suit),
                          'Gained a bonus clue',
                          true,
                        )
                      }
                    />
                  )}
                  {ui.bonusClueRank && (
                    <ClueDrawnPreview
                      rank={ui.bonusClueRank}
                      genreTables={genreTables}
                    />
                  )}
                </div>
              )}

              {eligibleThreats.length > 0 && (
                <div className="bg-amber-400/5 my-4 p-2 border border-amber-400/40 rounded">
                  <SectionLabel>
                    Threats act — roll each before continuing
                  </SectionLabel>
                  <div className="space-y-1">
                    {eligibleThreats.map((t) => (
                      <div key={t.id} className="flex items-center gap-1.5">
                        <span className="flex-1 text-[11px] text-foreground">
                          {t.name}
                        </span>
                        <Badge tone={t.kind === 'rival' ? 'red' : 'default'}>
                          L{t.level}
                        </Badge>
                        <DiceRoller
                          dice={1}
                          label="Roll"
                          onRoll={() =>
                            runConsequence(
                              () => m.applyConsequences(t.level),
                              t.id,
                            )
                          }
                          onManual={([a]) =>
                            runConsequence(
                              () => m.applyConsequencesManual(a, t.level),
                              t.id,
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {ui.threatResults.length > 0 && (
                <div className="space-y-0.5">
                  {ui.threatResults.map((r) => {
                    const t = m.threats.find((x) => x.id === r.threatId)
                    return (
                      <div
                        key={r.threatId}
                        className="text-[10px] text-muted-foreground"
                      >
                        {t?.name}: {r.roll.roll}+{r.roll.bonus}={r.roll.total} →{' '}
                        {r.roll.outcome}
                      </div>
                    )
                  })}
                </div>
              )}

              {test.outcome === 'failure' ? (
                <SmallButton onClick={startFreshAttempt}>Try again</SmallButton>
              ) : (
                <div className="flex items-center gap-2">
                  <SmallButton onClick={handleComplete} disabled={!canAdvance}>
                    {stage === 'escape' ? 'Escape — end scene' : 'Continue'}
                  </SmallButton>
                  {advanceBlockers.length > 0 && (
                    <span className="text-[10px] text-amber-400/80">
                      First: {advanceBlockers.join(', ')}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!ui.ended && active && !ui.awaitingForcedEscape && !rerollPending && (
        <ActiveThreatsAndKeywords
          testAttribute={ui.attribute}
          canReroll={!!test && !!preTestSnapshot}
          onReroll={handleReroll}
          onStrengthenClue={handleStrengthenClue}
          onEliminateThreat={handleEliminateThreat}
        />
      )}

      {ui.ended && (
        <div className="space-y-3 bg-background p-3 border border-border rounded">
          <SectionLabel>Scene summary</SectionLabel>
          <div className="space-y-0.5 text-[11px] text-muted-foreground">
            <div>
              Danger: {ui.startedAt.danger} → {m.danger}
            </div>
            <div>
              Fatigue: {ui.startedAt.fatigue} → {inv.fatigue}
            </div>
            <div>
              Clues: {ui.startedAt.clueCount} → {Object.keys(m.clueSets).length}
            </div>
            <div>
              Threats remaining: {m.threats.filter((t) => !t.defeated).length} ·
              defeated: {m.threats.filter((t) => t.defeated).length}
            </div>
          </div>
          <div>
            <SectionLabel>Field Notes entry (editable)</SectionLabel>
            <TextArea
              rows={8}
              value={ui.fieldNotesText}
              onChange={(e) =>
                updateInvestigation({ fieldNotesText: e.target.value })
              }
            />
          </div>
          <SmallButton onClick={() => void handleSave()} disabled={saving}>
            Add to Field Notes
          </SmallButton>
        </div>
      )}
    </div>
  )
}

// Shows the card that just landed in a clue set, with the same "what is
// this clue?" scratch-note box the Mystery side panel's clue list uses —
// so the player can see and describe what they drew right where they drew
// it, instead of having to switch over to Play > Mystery to find it.
// The random-event subject oracle is three separate d66 rolls (Action /
// Descriptor / Focus tables) — mirrors DiceRoller's own digital-vs-manual
// toggle, just for three dice pairs at once instead of one.
function RandomEventRoller({
  onRoll,
  onManual,
}: {
  onRoll: () => void
  onManual: (action: D66Roll, descriptor: D66Roll, focus: D66Roll) => void
}) {
  const [manual, setManual] = useState(false)
  const [vals, setVals] = useState<number[]>([1, 1, 1, 1, 1, 1])

  if (!manual) {
    return (
      <div className="inline-flex items-center gap-1">
        <SmallButton onClick={onRoll}>Roll random event</SmallButton>
        <button
          onClick={() => setManual(true)}
          title="Enter a physical dice roll"
          className="text-muted-foreground/50 hover:text-primary transition-colors"
        >
          <Pencil size={10} />
        </button>
      </div>
    )
  }

  const rows: { label: string; base: number }[] = [
    { label: 'Action', base: 0 },
    { label: 'Descriptor', base: 2 },
    { label: 'Focus', base: 4 },
  ]
  return (
    <div className="space-y-1 bg-background/60 p-1.5 border border-border rounded">
      {rows.map(({ label, base }) => (
        <div key={label} className="flex items-center gap-1">
          <span className="w-16 text-[10px] text-muted-foreground">
            {label}
          </span>
          {[0, 1].map((j) => (
            <input
              key={j}
              type="number"
              min={1}
              max={6}
              value={vals[base + j]}
              onChange={(e) => {
                const n = Math.max(
                  1,
                  Math.min(6, Math.round(Number(e.target.value)) || 1),
                )
                setVals((prev) =>
                  prev.map((p, pi) => (pi === base + j ? n : p)),
                )
              }}
              className="bg-background border border-border rounded w-9 h-6 text-[11px] text-foreground text-center"
            />
          ))}
        </div>
      ))}
      <div className="flex items-center gap-1">
        <SmallButton
          onClick={() => {
            onManual(
              d66FromDice(vals[0], vals[1]),
              d66FromDice(vals[2], vals[3]),
              d66FromDice(vals[4], vals[5]),
            )
            setManual(false)
          }}
        >
          Use
        </SmallButton>
        <button
          onClick={() => setManual(false)}
          className="px-0.5 text-[10px] text-muted-foreground/50 hover:text-foreground"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

function ClueDrawnPreview({
  rank,
  genreTables,
}: {
  rank: ClueRank
  genreTables: GenreTableSet
}) {
  const m = useMysteryStore()
  const cs = m.clueSets[rank]
  const text = useClueText(
    cs ?? { id: rank, rank, description: '', cards: [], status: 'established' },
  )
  if (!cs || cs.cards.length === 0) return null
  const card = cs.cards[cs.cards.length - 1]
  return (
    <div className="flex items-start gap-2 bg-background/60 mt-1.5 p-2 border border-border rounded">
      <PlayingCardView card={card} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="font-mono text-[10px] text-muted-foreground">
            Clue {rank} drawn
          </span>
          <button
            onClick={() => {
              const word = rollOracleTable(genreTables.clues).result
              setClueText(cs, text ? `${text} — ${word}` : word)
            }}
            title="Roll a clue word for inspiration"
            className="ml-auto text-muted-foreground/60 hover:text-primary transition-colors"
          >
            <Dices size={11} />
          </button>
        </div>
        <TextArea
          rows={2}
          value={text}
          placeholder="What is this clue?"
          onChange={(e) => setClueText(cs, e.target.value)}
          className="text-[11px]"
        />
      </div>
    </div>
  )
}

// A drawn Joker (p.17) pauses the draw: pick a clue set to become a false
// lead (all its cards discarded), then the draw control reappears to try
// again — matching "discard the joker and the cards in the clue set, and
// draw a new card".
function JokerChoicePicker({
  candidateClueSetIds,
  onPick,
}: {
  candidateClueSetIds: string[]
  onPick: (clueSetId: string) => void
}) {
  const m = useMysteryStore()
  return (
    <div className="space-y-1.5 bg-red-400/5 p-2.5 border border-red-400/30 rounded">
      <div className="text-[11px] text-red-400">
        Joker! Choose a clue set to become a false lead:
      </div>
      <div className="flex flex-wrap gap-1.5">
        {candidateClueSetIds.map((id) => {
          const cs = m.clueSets[id]
          return (
            <SmallButton key={id} tone="red" onClick={() => onPick(id)}>
              Clue {cs?.rank ?? id}
            </SmallButton>
          )
        })}
      </div>
    </div>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft size={12} /> Choose a different scene
    </button>
  )
}

// Reused for every point a threat can be introduced — the initial
// investigation roll, and a below-danger threat mid-stage — so naming it
// always gets the same box + inspiration roller, wherever it happens.
function ThreatNamePrompt({
  threatId,
  genreTables,
  onDone,
}: {
  threatId: string
  genreTables: GenreTableSet
  onDone?: () => void
}) {
  const m = useMysteryStore()
  const threat = m.threats.find((t) => t.id === threatId)
  if (!threat) return null
  return (
    <div className="space-y-1.5 bg-red-400/5 p-2.5 border border-red-400/30 rounded">
      <div className="text-[11px] text-red-400">
        A level {threat.level} threat appears — name it:
      </div>
      <div className="flex items-center gap-1.5">
        <TextInput
          value={threat.name === 'Unknown threat' ? '' : threat.name}
          placeholder="Unknown threat"
          onChange={(e) => m.renameThreat(threat.id, e.target.value)}
          className="flex-1 h-7 text-[11px]"
        />
        <button
          onClick={() =>
            m.renameThreat(
              threat.id,
              rollOracleTable(genreTables.threats).result,
            )
          }
          title="Roll a threat name for inspiration"
          className="text-muted-foreground/60 hover:text-primary transition-colors"
        >
          <Dices size={12} />
        </button>
        {onDone && <SmallButton onClick={onDone}>Done</SmallButton>}
      </div>
    </div>
  )
}

function AttributeTestStart({
  attribute,
  onPick,
  onRoll,
  onManual,
}: {
  attribute: Attribute
  onPick: (a: Attribute) => void
  onRoll: () => void
  onManual: (a: number, b: number) => void
}) {
  const inv = useInvestigatorStore()
  return (
    <div>
      <div className="mb-1 text-[10px] text-muted-foreground">
        Attribute test
      </div>
      <div className="flex gap-1 mb-1.5">
        {ATTRIBUTES.map((a) => (
          <button
            key={a}
            disabled={inv.struckAttributes.includes(a)}
            onClick={() => onPick(a)}
            className={`flex-1 px-2 py-1 rounded border text-[10px] transition-colors disabled:opacity-30 ${attribute === a ? 'border-primary/60 text-primary bg-primary/10' : 'border-border text-muted-foreground'}`}
          >
            {ATTRIBUTE_LABELS[a]} ({inv.attributes[a]})
          </button>
        ))}
      </div>
      <DiceRoller
        dice={2}
        label="Roll test"
        onRoll={onRoll}
        onManual={([a, b]) => onManual(a, b)}
      />
    </div>
  )
}

// Always-available side actions: act against a threat instead of progressing
// the stage, or use an already-gained keyword. Each keyword resolves its
// chosen action (reroll / strengthen a clue / eliminate a threat) itself
// before striking — see KeywordRow below.
function ActiveThreatsAndKeywords({
  testAttribute,
  canReroll,
  onReroll,
  onStrengthenClue,
  onEliminateThreat,
}: {
  testAttribute: Attribute
  canReroll: boolean
  onReroll: (keywordId: string) => void
  onStrengthenClue: (keywordId: string, rank: ClueRank, suit?: Suit) => void
  onEliminateThreat: (keywordId: string, threatId: string) => void
}) {
  const m = useMysteryStore()
  const inv = useInvestigatorStore()
  const activeThreats = m.threats.filter((t) => !t.defeated)
  const unstruckKeywords = inv.keywords.filter((k) => !k.struck)
  const strengthenableRanks = Object.values(m.clueSets)
    .filter((cs) => cs.status === 'established' || cs.status === 'strengthened')
    .map((cs) => cs.rank)

  if (activeThreats.length === 0 && unstruckKeywords.length === 0) return null

  return (
    <div className="space-y-3">
      {activeThreats.length > 0 && (
        <div>
          <SectionLabel>
            Act against a threat instead of progressing
          </SectionLabel>
          <div className="space-y-1">
            {activeThreats.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center gap-1.5">
                <span className="flex-1 text-[11px] text-foreground">
                  {t.name}
                </span>
                <Badge tone={t.kind === 'rival' ? 'red' : 'default'}>
                  L{t.level} · {t.marks}/{t.level}
                </Badge>
                <DiceRoller
                  dice={2}
                  label="Act"
                  onRoll={() => m.actAgainstThreat(t.id, testAttribute)}
                  onManual={([a, b]) =>
                    m.actAgainstThreatManual(t.id, testAttribute, a, b)
                  }
                />
              </div>
            ))}
          </div>
        </div>
      )}
      {unstruckKeywords.length > 0 && (
        <div>
          <SectionLabel>Keywords</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {unstruckKeywords.map((k) => (
              <KeywordRow
                key={k.id}
                keyword={k}
                canReroll={canReroll}
                clueRanks={strengthenableRanks}
                threats={activeThreats}
                onReroll={onReroll}
                onStrengthenClue={onStrengthenClue}
                onEliminateThreat={onEliminateThreat}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// A keyword's "Use" expands into the three keyword actions from the
// rulebook (p.31): reroll the current attribute test, strengthen an
// established clue, or eliminate an active threat. Picking one resolves it
// immediately and strikes the keyword — nothing is left for the player to
// apply by hand.
function KeywordRow({
  keyword,
  canReroll,
  clueRanks,
  threats,
  onReroll,
  onStrengthenClue,
  onEliminateThreat,
}: {
  keyword: { id: string; text: string }
  canReroll: boolean
  clueRanks: ClueRank[]
  threats: ThreatEntry[]
  onReroll: (keywordId: string) => void
  onStrengthenClue: (keywordId: string, rank: ClueRank, suit?: Suit) => void
  onEliminateThreat: (keywordId: string, threatId: string) => void
}) {
  const [mode, setMode] = useState<'idle' | 'choosing' | 'clue' | 'threat'>(
    'idle',
  )
  const [rank, setRank] = useState<ClueRank>(clueRanks[0] ?? 'A')
  const [suit, setSuit] = useState<Suit>('hearts')
  const [threatId, setThreatId] = useState(threats[0]?.id ?? '')

  if (mode === 'idle') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 border border-border rounded text-[11px]">
        <span className="text-foreground">{keyword.text}</span>
        <SmallButton onClick={() => setMode('choosing')}>Use</SmallButton>
      </div>
    )
  }

  if (mode === 'choosing') {
    return (
      <div className="space-y-1.5 bg-primary/5 p-2 border border-primary/40 rounded text-[11px] w-full">
        <div className="text-muted-foreground">
          Use &ldquo;{keyword.text}&rdquo; to:
        </div>
        <div className="flex flex-wrap gap-1.5">
          <SmallButton
            disabled={!canReroll}
            onClick={() => {
              onReroll(keyword.id)
              setMode('idle')
            }}
          >
            Re-roll attribute test
          </SmallButton>
          <SmallButton
            disabled={clueRanks.length === 0}
            onClick={() => setMode('clue')}
          >
            Strengthen a clue
          </SmallButton>
          <SmallButton
            disabled={threats.length === 0}
            onClick={() => setMode('threat')}
          >
            Eliminate a threat
          </SmallButton>
        </div>
        <button
          onClick={() => setMode('idle')}
          className="text-[10px] text-muted-foreground/50 hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    )
  }

  if (mode === 'clue') {
    return (
      <div className="space-y-1.5 bg-primary/5 p-2 border border-primary/40 rounded text-[11px] w-full">
        <div className="text-muted-foreground">Strengthen which clue?</div>
        <div className="flex items-center gap-1.5">
          <select
            value={rank}
            onChange={(e) => setRank(e.target.value as ClueRank)}
            className="bg-background border border-border rounded h-7 px-1 text-[11px] text-foreground"
          >
            {clueRanks.map((r) => (
              <option key={r} value={r}>
                Clue {r}
              </option>
            ))}
          </select>
          <select
            value={suit}
            onChange={(e) => setSuit(e.target.value as Suit)}
            className="bg-background border border-border rounded h-7 px-1 text-[11px] text-foreground"
          >
            {SUITS.map((s) => (
              <option key={s} value={s}>
                {SUIT_SYMBOL[s]}
              </option>
            ))}
          </select>
          <SmallButton
            onClick={() => {
              onStrengthenClue(keyword.id, rank, suit)
              setMode('idle')
            }}
          >
            Strengthen
          </SmallButton>
          <button
            onClick={() => setMode('choosing')}
            className="text-[10px] text-muted-foreground/50 hover:text-foreground"
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5 bg-primary/5 p-2 border border-primary/40 rounded text-[11px] w-full">
      <div className="text-muted-foreground">Eliminate which threat?</div>
      <div className="flex items-center gap-1.5">
        <select
          value={threatId}
          onChange={(e) => setThreatId(e.target.value)}
          className="bg-background border border-border rounded h-7 px-1 text-[11px] text-foreground"
        >
          {threats.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} (L{t.level})
            </option>
          ))}
        </select>
        <SmallButton
          onClick={() => {
            onEliminateThreat(keyword.id, threatId)
            setMode('idle')
          }}
        >
          Eliminate
        </SmallButton>
        <button
          onClick={() => setMode('choosing')}
          className="text-[10px] text-muted-foreground/50 hover:text-foreground"
        >
          Back
        </button>
      </div>
    </div>
  )
}
