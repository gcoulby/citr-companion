import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  Mystery, MysteryProblem, ClueRank, InvestigationStage, ThreatKind, ResolveQuestion,
} from '../game/types';
import { buildClueDeck, buildTruthDeck, shuffle, drawOne, drawMany } from '../game/deck';
import {
  attributeTest, rollConsequences, rollInvestigation,
  type ConsequenceRollResult, type AttributeTestResult, type InvestigationRollResult,
} from '../game/dice';
import { useInvestigatorStore } from './investigatorStore';
import type { Attribute } from '../game/types';

function emptyMystery(): Mystery {
  return {
    problem: { location: '', object: '', treachery: '' },
    motivation: '',
    danger: 0,
    day: 1,
    clockMarks: 0,
    clueSets: {},
    threats: [],
    scene: { active: false, stage: 'discovery', threatIds: [] },
    clueDeck: [],
    clueDiscard: [],
    truthDeck: [],
    truthDiscard: [],
    sealed: [],
    revealed: false,
    resolved: false,
    started: false,
    lingeringQuestion: '',
    log: [],
  };
}

const STAGE_ORDER: InvestigationStage[] = ['infiltration', 'discovery', 'acquisition', 'escape'];

export type ClueDrawResult =
  | { kind: 'empty' }
  | { kind: 'established'; rank: ClueRank }
  | { kind: 'strengthened'; rank: ClueRank }
  | { kind: 'falseLeadDiscard'; rank: ClueRank }
  | { kind: 'truthDiscard'; rank: ClueRank }
  | { kind: 'jokerChoice'; candidateClueSetIds: string[] }
  | { kind: 'doubleDanger' };

interface MysteryStoreState extends Mystery {
  // ── Setup ──────────────────────────────────────────────────────────────
  createMystery: (problem: MysteryProblem, motivation: string) => void;
  setLingeringQuestion: (text: string) => void;
  log: Mystery['log'];
  addLog: (text: string) => void;

  // ── Investigation scene ───────────────────────────────────────────────
  startInvestigationScene: () => InvestigationRollResult;
  runAttributeTest: (attribute: Attribute) => (AttributeTestResult & { addedThreatId: string | null });
  advanceStage: () => void;
  applyConsequences: (bonus?: number) => ConsequenceRollResult;
  resolveThreatActions: (excludeIds?: string[]) => { threatId: string; roll: ConsequenceRollResult }[];
  actAgainstThreat: (threatId: string, attribute: Attribute) => AttributeTestResult | null;
  addThreat: (level: 1 | 2 | 3, kind?: ThreatKind, name?: string) => string;

  // ── Clue deck ──────────────────────────────────────────────────────────
  drawClueCard: () => ClueDrawResult;
  resolveJoker: (clueSetId: string) => void;
  discardClueCard: () => void;
  setClueDescription: (rank: string, description: string) => void;
  addClueToBoard: (rank: string, boardNodeId: string) => void;

  // ── Other scenes ───────────────────────────────────────────────────────
  runTruthScene: (clueSetId: string) => Mystery['truthDeck'] | null;
  runObligationScene: (obligationId: string) => void;
  runRestScene: () => number;

  // ── Clock / day ────────────────────────────────────────────────────────
  endScene: () => { newDay: boolean };

  // ── Resolve ────────────────────────────────────────────────────────────
  setGuess: (question: ResolveQuestion, clueSetId: string | null) => void;
  revealTruths: () => void;
  setGuessCorrect: (question: ResolveQuestion, correct: boolean) => void;
  setGuessAnswer: (question: ResolveQuestion, answer: string) => void;
  finishResolve: () => void;

  load: (data: Mystery) => void;
  reset: () => void;
}

export const useMysteryStore = create<MysteryStoreState>((set, get) => ({
  ...emptyMystery(),

  addLog: (text) => set((s) => ({ log: [...s.log, { id: nanoid(), ts: Date.now(), text }].slice(-200) })),

  createMystery: (problem, motivation) => {
    const clueDeck = shuffle(buildClueDeck());
    const shuffledTruth = shuffle(buildTruthDeck());
    const { cards: sealedCards, remaining: truthDeck } = drawMany(shuffledTruth, 3);
    const questions: ResolveQuestion[] = ['location', 'object', 'treachery'];
    const sealed = sealedCards.map((card, i) => ({
      question: questions[i],
      card,
      guessedClueSetId: null,
      correct: null,
      answer: '',
    }));
    set({
      ...emptyMystery(),
      problem,
      motivation,
      clueDeck,
      truthDeck,
      sealed,
      started: true,
      log: [{ id: nanoid(), ts: Date.now(), text: `It happened at the ${problem.location}. That's where the ${problem.object} ${problem.treachery}...` }],
    });
  },

  setLingeringQuestion: (text) => set({ lingeringQuestion: text }),

  // ── Investigation scene ─────────────────────────────────────────────────

  startInvestigationScene: () => {
    const s = get();
    const result = rollInvestigation(s.danger);
    const stage: InvestigationStage = result.outcome === 'quiet' ? 'discovery' : 'infiltration';
    let threatIds: string[] = [];
    if (result.outcome === 'threatLevel1') threatIds = [get().addThreat(1)];
    else if (result.outcome === 'threatLevel2') threatIds = [get().addThreat(2)];
    set({ scene: { active: true, stage, threatIds } });
    return result;
  },

  runAttributeTest: (attribute) => {
    const inv = useInvestigatorStore.getState();
    const s = get();
    const value = inv.attributes[attribute];
    const result = attributeTest(value, s.danger);
    let addedThreatId: string | null = null;
    if (result.belowDanger) {
      addedThreatId = get().addThreat(1);
      set((s2) => ({ danger: Math.ceil(s2.danger / 2) }));
    }
    // Outcome effects (gain keyword on failure, consequences on cost/failure,
    // bonus clue on success) are applied by the caller so the player can
    // narrate between each mechanical step, per the rulebook's flow.
    return { ...result, addedThreatId };
  },

  advanceStage: () => {
    set((s) => {
      const idx = STAGE_ORDER.indexOf(s.scene.stage);
      const hasThreats = s.threats.some((t) => !t.defeated);
      if (s.scene.stage === 'acquisition' && !hasThreats) {
        return { scene: { ...s.scene, active: false } }; // scene ends, no escape needed
      }
      const next = STAGE_ORDER[Math.min(idx + 1, STAGE_ORDER.length - 1)];
      return { scene: { ...s.scene, stage: next } };
    });
  },

  applyConsequences: (bonus = 0) => {
    const roll = rollConsequences(bonus);
    set((s) => {
      switch (roll.outcome) {
        case 'raiseThreat': {
          if (s.threats.length === 0) return { danger: s.danger + 1 };
          const target = s.threats.find((t) => !t.defeated);
          if (!target) return { danger: s.danger + 1 };
          return {
            threats: s.threats.map((t) => (t.id === target.id ? { ...t, level: (Math.min(3, t.level + 1) as 1 | 2 | 3) } : t)),
          };
        }
        case 'discardClue': {
          const { card, remaining } = drawOne(s.clueDeck);
          return card ? { clueDeck: remaining, clueDiscard: [...s.clueDiscard, card] } : {};
        }
        case 'fatigue1':
          useInvestigatorStore.getState().gainFatigue(1);
          return {};
        case 'fatigue2':
          useInvestigatorStore.getState().gainFatigue(2);
          return {};
        default:
          return {};
      }
    });
    return roll;
  },

  resolveThreatActions: (excludeIds = []) => {
    const results: { threatId: string; roll: ConsequenceRollResult }[] = [];
    for (const t of get().threats) {
      if (t.defeated || excludeIds.includes(t.id)) continue;
      const roll = get().applyConsequences(t.level);
      results.push({ threatId: t.id, roll });
    }
    return results;
  },

  actAgainstThreat: (threatId, attribute) => {
    const t = get().threats.find((x) => x.id === threatId);
    if (!t) return null;
    const inv = useInvestigatorStore.getState();
    const result = attributeTest(inv.attributes[attribute], get().danger);
    if (result.outcome !== 'failure') {
      const marksToAdd = result.outcome === 'success' ? 2 : 1;
      set((s) => {
        const threats = s.threats.map((th) => (th.id === threatId ? { ...th, marks: th.marks + marksToAdd } : th));
        const target = threats.find((th) => th.id === threatId)!;
        return { threats: threats.map((th) => (th.id === threatId ? { ...th, defeated: target.marks >= target.level } : th)) };
      });
    }
    return result;
  },

  addThreat: (level, kind = 'threat', name) => {
    const id = nanoid();
    set((s) => ({ threats: [...s.threats, { id, name: name ?? 'Unknown threat', level, kind, marks: 0, defeated: false }] }));
    return id;
  },

  // ── Clue deck ─────────────────────────────────────────────────────────

  drawClueCard: () => {
    let deck = get().clueDeck;
    let discard = get().clueDiscard;
    let clueSets = get().clueSets;
    let result: ClueDrawResult = { kind: 'empty' };

    for (;;) {
      const { card, remaining } = drawOne(deck);
      deck = remaining;
      if (!card) { result = { kind: 'empty' }; break; }

      if (card.rank === 'JOKER') {
        discard = [...discard, card];
        const candidates = Object.values(clueSets).filter((cs) => cs.status !== 'truth' && cs.status !== 'falseLead');
        if (candidates.length === 0) {
          set({ clueDeck: deck, clueDiscard: discard, danger: get().danger * 2 });
          result = { kind: 'doubleDanger' };
        } else {
          set({ clueDeck: deck, clueDiscard: discard });
          result = { kind: 'jokerChoice', candidateClueSetIds: candidates.map((c) => c.id) };
        }
        break;
      }

      const rank = card.rank as ClueRank;
      const existing = clueSets[rank];

      if (existing?.status === 'falseLead') { discard = [...discard, card]; continue; }
      if (existing?.status === 'truth') { discard = [...discard, card]; continue; }

      if (existing) {
        clueSets = { ...clueSets, [rank]: { ...existing, cards: [...existing.cards, card], status: 'strengthened' } };
        set({ clueDeck: deck, clueDiscard: discard, clueSets });
        result = { kind: 'strengthened', rank };
      } else {
        clueSets = { ...clueSets, [rank]: { id: rank, rank, description: '', cards: [card], status: 'established' } };
        set({ clueDeck: deck, clueDiscard: discard, clueSets });
        result = { kind: 'established', rank };
      }
      break;
    }
    return result;
  },

  resolveJoker: (clueSetId) => {
    set((s) => {
      const cs = s.clueSets[clueSetId];
      if (!cs) return {};
      return {
        clueDiscard: [...s.clueDiscard, ...cs.cards],
        clueSets: { ...s.clueSets, [clueSetId]: { ...cs, cards: [], status: 'falseLead' } },
      };
    });
  },

  discardClueCard: () => {
    set((s) => {
      const { card, remaining } = drawOne(s.clueDeck);
      if (!card) return {};
      return { clueDeck: remaining, clueDiscard: [...s.clueDiscard, card] };
    });
  },

  setClueDescription: (rank, description) =>
    set((s) => {
      const cs = s.clueSets[rank];
      if (!cs) return {};
      return { clueSets: { ...s.clueSets, [rank]: { ...cs, description } } };
    }),

  addClueToBoard: (rank, boardNodeId) =>
    set((s) => {
      const cs = s.clueSets[rank];
      if (!cs) return {};
      return { clueSets: { ...s.clueSets, [rank]: { ...cs, boardNodeId } } };
    }),

  // ── Other scenes ──────────────────────────────────────────────────────

  runTruthScene: (clueSetId) => {
    const s = get();
    const cs = s.clueSets[clueSetId];
    if (!cs || cs.status === 'truth' || cs.status === 'falseLead') return null;
    const n = cs.cards.length;
    const { cards, remaining } = drawMany(s.truthDeck, n);
    set({
      truthDeck: remaining,
      truthDiscard: [...s.truthDiscard, ...cards],
      clueSets: { ...s.clueSets, [clueSetId]: { ...cs, status: 'truth' } },
    });
    return cards;
  },

  runObligationScene: (obligationId) => {
    useInvestigatorStore.getState().strikeObligation(obligationId, true);
    get().discardClueCard();
  },

  runRestScene: () => {
    const cleared = useInvestigatorStore.getState().rest();
    get().discardClueCard();
    return cleared;
  },

  // ── Clock / day ───────────────────────────────────────────────────────

  endScene: () => {
    let newDay = false;
    set((s) => {
      const clockMarks = s.clockMarks + 1;
      if (clockMarks >= 4) {
        newDay = true;
        const inv = useInvestigatorStore.getState();
        const unstruck = inv.obligations.filter((o) => !o.struck).length;
        if (unstruck > 0) inv.gainFatigue(unstruck);
        inv.obligations.forEach((o) => { if (o.struck) inv.strikeObligation(o.id, false); });
        return { clockMarks: 0, day: s.day + 1, scene: { active: false, stage: 'discovery' as InvestigationStage, threatIds: [] } };
      }
      return { clockMarks, scene: { active: false, stage: 'discovery' as InvestigationStage, threatIds: [] } };
    });
    return { newDay };
  },

  // ── Resolve ───────────────────────────────────────────────────────────

  setGuess: (question, clueSetId) =>
    set((s) => ({ sealed: s.sealed.map((slot) => (slot.question === question ? { ...slot, guessedClueSetId: clueSetId } : slot)) })),

  revealTruths: () => set({ revealed: true }),

  setGuessCorrect: (question, correct) =>
    set((s) => ({ sealed: s.sealed.map((slot) => (slot.question === question ? { ...slot, correct } : slot)) })),

  setGuessAnswer: (question, answer) =>
    set((s) => ({ sealed: s.sealed.map((slot) => (slot.question === question ? { ...slot, answer } : slot)) })),

  finishResolve: () => set({ resolved: true }),

  load: (data) => set({ ...data }),
  reset: () => set(emptyMystery()),
}));
