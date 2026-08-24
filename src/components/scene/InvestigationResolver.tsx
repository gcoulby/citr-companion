import { useState } from 'react';
import { ArrowLeft, Dices } from 'lucide-react';
import { useMysteryStore } from '../../store/mysteryStore';
import { useInvestigatorStore } from '../../store/investigatorStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useSceneUiStore } from '../../store/sceneUiStore';
import { ATTRIBUTES, type Attribute, type InvestigationStage } from '../../game/types';
import type { AttributeOutcome, ConsequenceRollResult } from '../../game/dice';
import { rollSubjectOracle, rollOracleTable } from '../../game/oracles';
import { GENRE_TABLES, type GenreTableSet } from '../../game/genreTables';
import { SectionLabel, Badge, SmallButton, TextArea, TextInput, DiceRoller } from '../play/ui';
import { ClueDrawControl } from '../play/MysteryTab';
import { PhaseTracker, type Phase } from './PhaseTracker';
import { appendSceneBlockToCaseNotes } from '../../lib/sceneNotes';

const ATTRIBUTE_LABELS: Record<Attribute, string> = { power: 'Power', insight: 'Insight', method: 'Method' };
const STAGE_ORDER: InvestigationStage[] = ['infiltration', 'discovery', 'acquisition', 'escape'];
const STAGE_LABELS: Record<InvestigationStage, string> = {
  infiltration: 'Infiltration', discovery: 'Discovery', acquisition: 'Acquisition', escape: 'Escape',
};
const STAGE_FRAME: Record<InvestigationStage, string> = {
  infiltration: 'Find a way into the location.',
  discovery: 'Learn where to find a clue.',
  acquisition: 'Discover a clue.',
  escape: 'Flee the location.',
};
const PROMPT_LABEL: Record<AttributeOutcome, string> = {
  failure: "What's in their way?",
  cost: "What's the complication, and how do they respond?",
  success: 'What do they do next?',
};

interface Props {
  onSaved: () => void;
  onOpenResolve: () => void;
}

export function InvestigationResolver({ onSaved, onOpenResolve }: Props) {
  const m = useMysteryStore();
  const inv = useInvestigatorStore();
  const genre = useSettingsStore((s) => s.genre);
  const genreTables = GENRE_TABLES[genre];
  const ui = useSceneUiStore((s) => s.investigation);
  const startInvestigation = useSceneUiStore((s) => s.startInvestigation);
  const updateInvestigation = useSceneUiStore((s) => s.updateInvestigation);
  const appendLog = useSceneUiStore((s) => s.appendInvestigationLog);
  const resetStageAttempt = useSceneUiStore((s) => s.resetStageAttempt);
  const resetInvestigation = useSceneUiStore((s) => s.resetInvestigation);
  const setActiveKind = useSceneUiStore((s) => s.setActiveKind);
  const [saving, setSaving] = useState(false);

  // ── Not started yet ──────────────────────────────────────────────────────
  if (!ui) {
    const handleStart = (result: ReturnType<typeof m.startInvestigationScene>) => {
      startInvestigation(m.day, m.danger, inv.fatigue, Object.keys(m.clueSets).length);
      const flavour =
        result.outcome === 'quiet'
          ? 'Quiet entry. You start at the Discovery stage.'
          : result.outcome === 'threatLevel1'
            ? "Something or someone is in your investigator's way. You must start by infiltrating the location."
            : "Your investigator's been noticed. You must start by infiltrating the location.";
      updateInvestigation({ roll: result, threatNaming: result.outcome !== 'quiet' });
      appendLog(flavour, null);
    };
    return (
      <div className="p-6 space-y-4 max-w-lg">
        <BackButton onClick={() => setActiveKind(null)} />
        <h2 className="font-display text-lg text-foreground">Investigation</h2>
        <div>
          <SectionLabel>Investigation roll — 1d6 + danger ({m.danger})</SectionLabel>
          <DiceRoller
            dice={1}
            label="Roll investigation"
            onRoll={() => handleStart(m.startInvestigationScene())}
            onManual={([a]) => handleStart(m.startInvestigationSceneManual(a))}
          />
        </div>
      </div>
    );
  }

  const stage = m.scene.stage;
  const active = m.scene.active;
  const test = ui.test;
  const eligibleThreats = test
    ? m.threats.filter((t) => !t.defeated && t.id !== test.addedThreatId && !ui.threatResults.some((r) => r.threatId === t.id))
    : [];
  const threatsResolved = eligibleThreats.length === 0;
  const canAdvance =
    !!test &&
    test.outcome !== 'failure' &&
    threatsResolved &&
    (stage !== 'acquisition' || ui.stageClueDrawn) &&
    (test.outcome !== 'success' || ui.bonusClueDrawn);

  // ── Phase tracker ────────────────────────────────────────────────────────
  const skippedInfiltration = ui.roll?.outcome === 'quiet';
  const phases: Phase[] = [
    { id: 'roll', label: 'Investigation Roll', status: 'done' },
    ...STAGE_ORDER.map((s): Phase => {
      if (skippedInfiltration && s === 'infiltration') return { id: s, label: STAGE_LABELS[s], status: 'skipped' };
      if (!active && ui.ended) {
        // Scene is over — anything at/after the stage it ended on that never
        // ran (e.g. Escape when Acquisition ended the scene directly) is skipped.
        const idx = STAGE_ORDER.indexOf(s);
        const endIdx = STAGE_ORDER.indexOf(stage);
        return { id: s, label: STAGE_LABELS[s], status: idx <= endIdx ? 'done' : 'skipped' };
      }
      if (s === stage) return { id: s, label: STAGE_LABELS[s], status: 'current' };
      const idx = STAGE_ORDER.indexOf(s);
      const curIdx = STAGE_ORDER.indexOf(stage);
      return { id: s, label: STAGE_LABELS[s], status: idx < curIdx ? 'done' : 'upcoming' };
    }),
    { id: 'end', label: 'End Scene', status: ui.ended ? 'done' : 'upcoming' },
  ];

  // ── Shared consequence-roll runner — every consequence roll (the test's
  // own, or a threat acting) can push fatigue past the track's cap, so every
  // one is checked for the fatigue interrupt in the same place. ────────────
  const runConsequence = (rollFn: () => ConsequenceRollResult, forThreatId?: string) => {
    const before = useInvestigatorStore.getState().struckAttributes.length;
    const result = rollFn();
    const after = useInvestigatorStore.getState().struckAttributes.length;
    const cur = useSceneUiStore.getState().investigation;
    if (!cur) return;
    if (forThreatId) {
      const threat = m.threats.find((t) => t.id === forThreatId);
      appendLog(`${threat?.name ?? 'A threat'} acts: ${result.roll}+${result.bonus}=${result.total} → ${result.outcome}`, stage);
      updateInvestigation({ threatResults: [...cur.threatResults, { threatId: forThreatId, roll: result }] });
    } else {
      appendLog(`Consequences: ${result.roll}+${result.bonus}=${result.total} → ${result.outcome}`, stage);
      updateInvestigation({ consequence: result });
    }
    if (after > before) triggerFatigueInterrupt();
  };

  const triggerFatigueInterrupt = () => {
    const s = useMysteryStore.getState();
    if (!s.scene.active || s.scene.stage === 'escape') return;
    if (!s.threats.some((t) => !t.defeated)) s.addThreat(1);
    while (useMysteryStore.getState().scene.active && useMysteryStore.getState().scene.stage !== 'escape') {
      useMysteryStore.getState().advanceStage();
    }
    appendLog('Fatigue track filled — jumping straight to the Escape stage.', null);
    updateInvestigation({ fatigueInterrupted: true });
    resetStageAttempt();
  };

  const finalizeEnd = () => {
    const cur = useSceneUiStore.getState().investigation;
    if (!cur) return;
    // Snapshot the stage now — mysteryStore.endScene() resets scene.stage
    // back to 'discovery' as part of clearing the scene, so `stage` (read
    // from live store state) can no longer be trusted once that's happened.
    updateInvestigation({ ended: true, finalStage: stage, fieldNotesText: cur.log.map((l) => l.text).join('\n') });
  };

  const handleAttributeRoll = (a?: number, b?: number) => {
    const result = a !== undefined && b !== undefined ? m.runAttributeTestManual(ui.attribute, a, b) : m.runAttributeTest(ui.attribute);
    updateInvestigation({ test: result, randomEvent: result.randomEvent ? rollSubjectOracle() : null });
    appendLog(`${ATTRIBUTE_LABELS[ui.attribute]} test: ${result.roll.a}+${result.roll.b}+${result.attributeValue}=${result.total} (${result.outcome})`, stage);
  };

  const handleComplete = () => {
    if (stage === 'escape') {
      m.endScene();
      finalizeEnd();
      return;
    }
    m.setDanger(m.danger + 1);
    appendLog(`Danger rises to ${m.danger + 1}.`, stage);
    m.advanceStage();
    if (!useMysteryStore.getState().scene.active) {
      finalizeEnd();
    } else {
      resetStageAttempt();
    }
  };

  const handleSave = async () => {
    if (!ui.ended) return;
    setSaving(true);
    const intro: string[] = [];
    const grouped = new Map<InvestigationStage, string[]>();
    for (const line of ui.log) {
      if (!line.stage) { intro.push(line.text); continue; }
      const bucket = grouped.get(line.stage) ?? [];
      bucket.push(line.text);
      grouped.set(line.stage, bucket);
    }
    const stages = STAGE_ORDER
      .filter((s) => grouped.has(s))
      .map((s) => ({ stage: s, label: STAGE_LABELS[s], lines: grouped.get(s)! }));

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
    });
    resetInvestigation();
    setActiveKind(null);
    onSaved();
  };

  return (
    <div className="p-6 space-y-4 max-w-2xl">
      {/* No back link once the investigation has started — the roll and every
          test/consequence past it are real, committed effects (like physical
          dice), so there's no clean "abandon" once underway. */}
      <h2 className="font-display text-lg text-foreground">Investigation</h2>
      <PhaseTracker phases={phases} />

      {ui.roll && (
        <div className="text-[11px] text-muted-foreground/80">
          rolled {ui.roll.roll} + danger {ui.roll.danger} = {ui.roll.total}
        </div>
      )}

      {ui.threatNaming && <ThreatNamePrompt genreTables={genreTables} onDone={() => updateInvestigation({ threatNaming: false })} />}

      {!ui.ended && active && !ui.threatNaming && (
        <div className="space-y-3 p-3 rounded border border-border bg-background">
          <div className="flex items-center justify-between">
            <SectionLabel>{STAGE_LABELS[stage]} — {STAGE_FRAME[stage]}</SectionLabel>
            <Badge tone="amber">{stage}</Badge>
          </div>

          {!test ? (
            <AttributeTestStart
              attribute={ui.attribute}
              onPick={(a) => updateInvestigation({ attribute: a })}
              onRoll={() => handleAttributeRoll()}
              onManual={(a, b) => handleAttributeRoll(a, b)}
            />
          ) : (
            <div className="space-y-2">
              <div className="text-[11px] font-mono text-foreground">
                {test.roll.a}+{test.roll.b}+{test.attributeValue} = {test.total} —{' '}
                <span className={test.outcome === 'success' ? 'text-green-400' : test.outcome === 'cost' ? 'text-primary' : 'text-red-400'}>
                  {test.outcome === 'success' ? 'Success' : test.outcome === 'cost' ? 'Success at a cost' : 'Failure'}
                </span>
              </div>
              {ui.randomEvent && (
                <div className="text-[11px] text-primary">
                  Doubles — a random event occurs: {ui.randomEvent.action.result} the {ui.randomEvent.descriptor.result} {ui.randomEvent.focus.result}.
                </div>
              )}
              {test.belowDanger && (
                <div className="text-[11px] text-red-400">Below danger — a new level 1 threat appears, danger halved to {m.danger}.</div>
              )}

              <div>
                <SectionLabel>{PROMPT_LABEL[test.outcome]}</SectionLabel>
                <TextArea rows={2} value={ui.wayPrompt} onChange={(e) => updateInvestigation({ wayPrompt: e.target.value })} />
              </div>

              {test.outcome === 'failure' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <SectionLabel>Gain a keyword</SectionLabel>
                    <button
                      onClick={() => updateInvestigation({ keywordPrompt: rollOracleTable(genreTables.keywords).result })}
                      title="Roll a keyword for inspiration"
                      className="text-muted-foreground/60 hover:text-primary transition-colors"
                    >
                      <Dices size={11} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TextInput
                      value={ui.keywordPrompt}
                      onChange={(e) => updateInvestigation({ keywordPrompt: e.target.value })}
                      className="flex-1 h-7 text-[11px]"
                      disabled={ui.keywordAdded}
                    />
                    <SmallButton
                      disabled={ui.keywordAdded || !ui.keywordPrompt.trim()}
                      onClick={() => {
                        inv.addKeyword(ui.keywordPrompt.trim());
                        appendLog(`Gained keyword: ${ui.keywordPrompt.trim()}`, stage);
                        updateInvestigation({ keywordAdded: true });
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
                      onRoll={() => runConsequence(() => m.applyConsequences(0))}
                      onManual={([a]) => runConsequence(() => m.applyConsequencesManual(a, 0))}
                    />
                  ) : (
                    <div className="text-[11px] text-muted-foreground">
                      {ui.consequence.roll}+{ui.consequence.bonus}={ui.consequence.total} → {ui.consequence.outcome}
                      {ui.consequence.outcome === 'mustStop' && (
                        <div className="mt-1.5 p-2 rounded border border-red-400/30 bg-red-400/5 text-red-400">
                          Your investigator can't continue. The mystery moves to Resolve.
                          <div className="mt-1.5"><SmallButton tone="red" onClick={onOpenResolve}>Go to Resolve</SmallButton></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {stage === 'acquisition' && test.outcome !== 'failure' && (
                <div>
                  <SectionLabel>Discover a clue</SectionLabel>
                  <ClueDrawControl
                    disabled={ui.stageClueDrawn}
                    onDraw={() => {
                      m.drawClueCard();
                      appendLog('Discovered a clue.', stage);
                      updateInvestigation({ stageClueDrawn: true });
                    }}
                    onManual={(rank, suit) => {
                      m.drawClueCardManual(rank, suit);
                      appendLog('Discovered a clue (physical draw).', stage);
                      updateInvestigation({ stageClueDrawn: true });
                    }}
                  />
                </div>
              )}

              {test.outcome === 'success' && (
                <div>
                  <SectionLabel>Bonus clue (10+)</SectionLabel>
                  <ClueDrawControl
                    disabled={ui.bonusClueDrawn}
                    onDraw={() => {
                      m.drawClueCard();
                      appendLog('Gained a bonus clue.', stage);
                      updateInvestigation({ bonusClueDrawn: true });
                    }}
                    onManual={(rank, suit) => {
                      m.drawClueCardManual(rank, suit);
                      appendLog('Gained a bonus clue (physical draw).', stage);
                      updateInvestigation({ bonusClueDrawn: true });
                    }}
                  />
                </div>
              )}

              {eligibleThreats.length > 0 && (
                <div>
                  <SectionLabel>Threats act</SectionLabel>
                  <div className="space-y-1">
                    {eligibleThreats.map((t) => (
                      <div key={t.id} className="flex items-center gap-1.5">
                        <span className="flex-1 text-[11px] text-foreground">{t.name}</span>
                        <Badge tone={t.kind === 'rival' ? 'red' : 'default'}>L{t.level}</Badge>
                        <DiceRoller
                          dice={1}
                          label="Roll"
                          onRoll={() => runConsequence(() => m.applyConsequences(t.level), t.id)}
                          onManual={([a]) => runConsequence(() => m.applyConsequencesManual(a, t.level), t.id)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {ui.threatResults.length > 0 && (
                <div className="space-y-0.5">
                  {ui.threatResults.map((r) => {
                    const t = m.threats.find((x) => x.id === r.threatId);
                    return (
                      <div key={r.threatId} className="text-[10px] text-muted-foreground">
                        {t?.name}: {r.roll.roll}+{r.roll.bonus}={r.roll.total} → {r.roll.outcome}
                      </div>
                    );
                  })}
                </div>
              )}

              {test.outcome === 'failure' ? (
                <SmallButton onClick={resetStageAttempt}>Try again</SmallButton>
              ) : (
                <SmallButton onClick={handleComplete} disabled={!canAdvance}>
                  {stage === 'escape' ? 'Escape — end scene' : 'Continue'}
                </SmallButton>
              )}
            </div>
          )}
        </div>
      )}

      {!ui.ended && active && (
        <ActiveThreatsAndKeywords testAttribute={ui.attribute} />
      )}

      {ui.ended && (
        <div className="space-y-3 p-3 rounded border border-border bg-background">
          <SectionLabel>Scene summary</SectionLabel>
          <div className="text-[11px] text-muted-foreground space-y-0.5">
            <div>Danger: {ui.startedAt.danger} → {m.danger}</div>
            <div>Fatigue: {ui.startedAt.fatigue} → {inv.fatigue}</div>
            <div>Clues: {ui.startedAt.clueCount} → {Object.keys(m.clueSets).length}</div>
            <div>Threats remaining: {m.threats.filter((t) => !t.defeated).length} · defeated: {m.threats.filter((t) => t.defeated).length}</div>
          </div>
          <div>
            <SectionLabel>Field Notes entry (editable)</SectionLabel>
            <TextArea rows={8} value={ui.fieldNotesText} onChange={(e) => updateInvestigation({ fieldNotesText: e.target.value })} />
          </div>
          <SmallButton onClick={() => void handleSave()} disabled={saving}>Add to Field Notes</SmallButton>
        </div>
      )}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
      <ArrowLeft size={12} /> Choose a different scene
    </button>
  );
}

function ThreatNamePrompt({ genreTables, onDone }: { genreTables: GenreTableSet; onDone: () => void }) {
  const m = useMysteryStore();
  const threatId = m.scene.threatIds[0];
  const threat = m.threats.find((t) => t.id === threatId);
  if (!threat) return null;
  return (
    <div className="p-2.5 rounded border border-red-400/30 bg-red-400/5 space-y-1.5">
      <div className="text-[11px] text-red-400">A level {threat.level} threat appears — name it:</div>
      <div className="flex items-center gap-1.5">
        <TextInput
          value={threat.name === 'Unknown threat' ? '' : threat.name}
          placeholder="Unknown threat"
          onChange={(e) => m.renameThreat(threat.id, e.target.value)}
          className="flex-1 h-7 text-[11px]"
        />
        <button
          onClick={() => m.renameThreat(threat.id, rollOracleTable(genreTables.threats).result)}
          title="Roll a threat name for inspiration"
          className="text-muted-foreground/60 hover:text-primary transition-colors"
        >
          <Dices size={12} />
        </button>
        <SmallButton onClick={onDone}>Done</SmallButton>
      </div>
    </div>
  );
}

function AttributeTestStart({ attribute, onPick, onRoll, onManual }: {
  attribute: Attribute;
  onPick: (a: Attribute) => void;
  onRoll: () => void;
  onManual: (a: number, b: number) => void;
}) {
  const inv = useInvestigatorStore();
  return (
    <div>
      <div className="text-[10px] text-muted-foreground mb-1">Attribute test</div>
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
      <DiceRoller dice={2} label="Roll test" onRoll={onRoll} onManual={([a, b]) => onManual(a, b)} />
    </div>
  );
}

// Always-available side actions: act against a threat instead of progressing
// the stage, or use an already-gained keyword (the app strikes it — the
// player performs the actual reroll/strengthen/eliminate manually).
function ActiveThreatsAndKeywords({ testAttribute }: { testAttribute: Attribute }) {
  const m = useMysteryStore();
  const inv = useInvestigatorStore();
  const activeThreats = m.threats.filter((t) => !t.defeated);
  const unstruckKeywords = inv.keywords.filter((k) => !k.struck);

  if (activeThreats.length === 0 && unstruckKeywords.length === 0) return null;

  return (
    <div className="space-y-3">
      {activeThreats.length > 0 && (
        <div>
          <SectionLabel>Act against a threat instead of progressing</SectionLabel>
          <div className="space-y-1">
            {activeThreats.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center gap-1.5">
                <span className="flex-1 text-[11px] text-foreground">{t.name}</span>
                <Badge tone={t.kind === 'rival' ? 'red' : 'default'}>L{t.level} · {t.marks}/{t.level}</Badge>
                <DiceRoller
                  dice={2}
                  label="Act"
                  onRoll={() => m.actAgainstThreat(t.id, testAttribute)}
                  onManual={([a, b]) => m.actAgainstThreatManual(t.id, testAttribute, a, b)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      {unstruckKeywords.length > 0 && (
        <div>
          <SectionLabel>Keywords (reroll / strengthen a clue / eliminate a threat)</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {unstruckKeywords.map((k) => (
              <div key={k.id} className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-border text-[11px]">
                <span className="text-foreground">{k.text}</span>
                <SmallButton onClick={() => inv.useKeyword(k.id)}>Use</SmallButton>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
