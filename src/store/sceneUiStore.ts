// Session-only UI state for the Scene tab's stepper/resolvers. Deliberately
// NOT wired into citrWriter/useAutoSave (no `load`/`reset`-on-file-open) —
// this is ephemeral "where was I mid-scene" state, not game state. It exists
// only so switching Board -> Scene -> Notes -> Scene doesn't lose an
// in-progress resolver, since the Scene view unmounts like every other
// top-level view does today. Mechanical state (danger, clue sets,
// mystery.scene, fatigue, threats) stays authoritative in mysteryStore /
// investigatorStore as always.

import { create } from 'zustand';
import type { Attribute, ClueRank, InvestigationStage, PlayingCard } from '../game/types';
import type { AttributeTestResult, ConsequenceRollResult, InvestigationRollResult } from '../game/dice';
import type { SubjectOracleResult } from '../game/oracles';

export type SceneKind = 'investigation' | 'obligation' | 'truth' | 'rest';

// Each log line is tagged with the stage it happened in (or `null` for
// pre-stage events — the investigation roll's flavour text, threat naming) so
// the saved record can be grouped by stage instead of dumped as one flat blob.
export interface InvestigationLogLine {
  stage: InvestigationStage | null;
  text: string;
}

export interface InvestigationUiState {
  // Snapshot taken when the investigation roll is made, so the end-of-scene
  // summary can show deltas (danger/fatigue/clues gained over the scene).
  startedAt: { day: number; danger: number; fatigue: number; clueCount: number };
  roll: InvestigationRollResult | null;
  // Non-empty (a threat id) shows "name this threat" — after the initial
  // threat-introducing roll, before any stage attempt exists yet.
  threatNaming: string;
  log: InvestigationLogLine[]; // narrative lines, becomes the Field Notes draft text

  // Current stage attempt — reset each time a new attribute test begins.
  attribute: Attribute;
  test: (AttributeTestResult & { addedThreatId: string | null }) | null;
  randomEvent: SubjectOracleResult | null;
  wayPrompt: string; // "what's in their way?" / complication / "what do they do next?"
  keywordPrompt: string; // failure only
  keywordAdded: boolean;
  consequence: ConsequenceRollResult | null;
  stageClueDrawn: boolean; // the stage's own "discover a clue" effect (Acquisition)
  stageClueRank: ClueRank | ''; // which clue set the stage draw landed in, so its card + note box can be shown inline
  bonusClueDrawn: boolean; // the 10+ "gain a bonus clue" effect (any stage)
  bonusClueRank: ClueRank | '';
  threatResults: { threatId: string; roll: ConsequenceRollResult }[];
  fatigueInterrupted: boolean;

  // Stages actually completed this scene — the phase tracker uses this
  // instead of comparing stage indices, since a fatigue interrupt can jump
  // straight to Escape leaving Infiltration/Discovery/Acquisition never
  // completed even though Escape (a later stage) was.
  completedStages: InvestigationStage[];

  // Hand-written "why"/"what happened" answers, one per stage — captured
  // from `wayPrompt` the moment each stage completes (or from
  // `forcedEscapeNote` when fatigue forces the jump to Escape), so the story
  // is written during play instead of reconstructed afterward from the roll
  // log. This is the per-stage narrative shown prominently in Field Notes;
  // `log` stays the mechanical roll-by-roll record shown collapsed.
  stageNotes: Partial<Record<InvestigationStage, string>>;

  // Fatigue filled mid-stage: instead of silently jumping to Escape, pause
  // here so the player can say why their investigator was forced to flee.
  awaitingForcedEscape: boolean;
  forcedEscapeNote: string;

  ended: boolean; // Escape/Acquisition completed — showing the end-of-scene summary
  // The stage the scene actually ended at, snapshotted at the moment it ends
  // — `mysteryStore.endScene()` resets `scene.stage` back to 'discovery' as
  // part of clearing the scene, so the live value can't be trusted afterward.
  finalStage: InvestigationStage | '';
  fieldNotesText: string; // editable draft, prefilled from `log` once ended
}

function emptyInvestigationUi(day: number, danger: number, fatigue: number, clueCount: number): InvestigationUiState {
  return {
    startedAt: { day, danger, fatigue, clueCount },
    roll: null,
    threatNaming: '',
    log: [],
    attribute: 'insight',
    test: null,
    randomEvent: null,
    wayPrompt: '',
    keywordPrompt: '',
    keywordAdded: false,
    consequence: null,
    stageClueDrawn: false,
    stageClueRank: '',
    bonusClueDrawn: false,
    bonusClueRank: '',
    threatResults: [],
    fatigueInterrupted: false,
    completedStages: [],
    stageNotes: {},
    awaitingForcedEscape: false,
    forcedEscapeNote: '',
    ended: false,
    finalStage: '',
    fieldNotesText: '',
  };
}

interface ObligationUiState { obligationId: string; text: string; struck: boolean }
interface RestUiState { rolled: number | null; text: string }
interface TruthUiState { clueSetId: string; drawn: PlayingCard[] | null; text: string; cardNotes: Record<string, string> }

interface SceneUiStoreState {
  activeKind: SceneKind | null;
  setActiveKind: (kind: SceneKind | null) => void;

  obligation: ObligationUiState;
  setObligation: (patch: Partial<ObligationUiState>) => void;
  resetObligation: () => void;

  rest: RestUiState;
  setRest: (patch: Partial<RestUiState>) => void;
  resetRest: () => void;

  truth: TruthUiState;
  setTruth: (patch: Partial<TruthUiState>) => void;
  resetTruth: () => void;

  investigation: InvestigationUiState | null;
  startInvestigation: (day: number, danger: number, fatigue: number, clueCount: number) => void;
  updateInvestigation: (patch: Partial<InvestigationUiState>) => void;
  appendInvestigationLog: (text: string, stage: InvestigationStage | null) => void;
  resetStageAttempt: () => void;
  resetInvestigation: () => void;
}

const emptyObligation: ObligationUiState = { obligationId: '', text: '', struck: false };
const emptyRest: RestUiState = { rolled: null, text: '' };
const emptyTruth: TruthUiState = { clueSetId: '', drawn: null, text: '', cardNotes: {} };

export const useSceneUiStore = create<SceneUiStoreState>((set) => ({
  activeKind: null,
  setActiveKind: (kind) => set({ activeKind: kind }),

  obligation: emptyObligation,
  setObligation: (patch) => set((s) => ({ obligation: { ...s.obligation, ...patch } })),
  resetObligation: () => set({ obligation: emptyObligation }),

  rest: emptyRest,
  setRest: (patch) => set((s) => ({ rest: { ...s.rest, ...patch } })),
  resetRest: () => set({ rest: emptyRest }),

  truth: emptyTruth,
  setTruth: (patch) => set((s) => ({ truth: { ...s.truth, ...patch } })),
  resetTruth: () => set({ truth: emptyTruth }),

  investigation: null,
  startInvestigation: (day, danger, fatigue, clueCount) =>
    set({ investigation: emptyInvestigationUi(day, danger, fatigue, clueCount) }),
  updateInvestigation: (patch) =>
    set((s) => (s.investigation ? { investigation: { ...s.investigation, ...patch } } : {})),
  appendInvestigationLog: (text, stage) =>
    set((s) => (s.investigation ? { investigation: { ...s.investigation, log: [...s.investigation.log, { stage, text }] } } : {})),
  resetStageAttempt: () =>
    set((s) =>
      s.investigation
        ? {
            investigation: {
              ...s.investigation,
              test: null,
              randomEvent: null,
              wayPrompt: '',
              keywordPrompt: '',
              keywordAdded: false,
              consequence: null,
              stageClueDrawn: false,
              stageClueRank: '',
              bonusClueDrawn: false,
              bonusClueRank: '',
              threatResults: [],
            },
          }
        : {},
    ),
  resetInvestigation: () => set({ investigation: null }),
}));
