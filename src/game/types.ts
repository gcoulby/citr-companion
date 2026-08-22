// Core domain types for the "Caught in the Rain" ruleset.
// Pure data shapes only — no logic lives here (see dice.ts / deck.ts / oracles.ts).

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

export type ClueRank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10';
export const CLUE_RANKS: ClueRank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

export type TruthRank = 'J' | 'Q' | 'K';
export const TRUTH_RANKS: TruthRank[] = ['J', 'Q', 'K'];

export type CardRank = ClueRank | TruthRank | 'JOKER';

export interface PlayingCard {
  id: string;
  rank: CardRank;
  suit: Suit | null; // null for jokers
}

export type Attribute = 'power' | 'insight' | 'method';
export const ATTRIBUTES: Attribute[] = ['power', 'insight', 'method'];

export interface AttributeState {
  power: number;
  insight: number;
  method: number;
}

export interface Keyword {
  id: string;
  text: string;
  signature: boolean;
  struck: boolean;
}

export interface Obligation {
  id: string;
  text: string;
  struck: boolean;
}

export interface Investigator {
  name: string;
  trait: string;
  attributes: AttributeState;
  struckAttributes: Attribute[];
  fatigue: number; // 0-5 marked boxes
  obligations: Obligation[];
  keywords: Keyword[];
  experiencePoints: number;
}

export type ClueStatus = 'established' | 'strengthened' | 'truth' | 'falseLead';

export interface ClueSet {
  id: string; // == rank
  rank: ClueRank;
  description: string;
  cards: PlayingCard[];
  status: ClueStatus;
  boardNodeId?: string; // linked GraphNode id once "added to board"
}

export type ThreatKind = 'threat' | 'rival';

export interface ThreatEntry {
  id: string;
  name: string;
  level: 1 | 2 | 3;
  kind: ThreatKind;
  marks: number;
  defeated: boolean;
}

export type InvestigationStage = 'infiltration' | 'discovery' | 'acquisition' | 'escape';

export interface InvestigationSceneState {
  active: boolean;
  stage: InvestigationStage;
  threatIds: string[]; // threats introduced by the current investigation roll
}

export interface MysteryProblem {
  location: string;
  object: string;
  treachery: string;
}

export type ResolveQuestion = 'location' | 'object' | 'treachery';

export interface SealedTruth {
  question: ResolveQuestion;
  card: PlayingCard;
  guessedClueSetId: string | null;
  correct: boolean | null;
  answer: string;
}

export interface SceneLogEntry {
  id: string;
  ts: number;
  text: string;
}

export interface Mystery {
  problem: MysteryProblem;
  motivation: string;
  danger: number;
  day: number;
  clockMarks: number; // 0-4
  clueSets: Record<string, ClueSet>; // keyed by rank
  threats: ThreatEntry[];
  scene: InvestigationSceneState;
  clueDeck: PlayingCard[];
  clueDiscard: PlayingCard[];
  truthDeck: PlayingCard[];
  truthDiscard: PlayingCard[];
  sealed: SealedTruth[]; // exactly 3 once a mystery has been created, ordered [location, object, treachery]
  revealed: boolean; // becomes true only via the Resolve flow's reveal step
  resolved: boolean;
  started: boolean;
  lingeringQuestion: string;
  log: SceneLogEntry[];
}
