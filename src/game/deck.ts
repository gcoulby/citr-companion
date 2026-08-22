// Pure card-deck helpers for the clue deck (A-10 x4 suits + 2 jokers = 42 cards)
// and the truth deck (J/Q/K x4 suits = 12 cards). No store access.

import { nanoid } from 'nanoid';
import type { PlayingCard } from './types';
import { SUITS, CLUE_RANKS, TRUTH_RANKS } from './types';

export function buildClueDeck(): PlayingCard[] {
  const cards: PlayingCard[] = [];
  for (const suit of SUITS) {
    for (const rank of CLUE_RANKS) cards.push({ id: nanoid(), rank, suit });
  }
  cards.push({ id: nanoid(), rank: 'JOKER', suit: null });
  cards.push({ id: nanoid(), rank: 'JOKER', suit: null });
  return cards;
}

export function buildTruthDeck(): PlayingCard[] {
  const cards: PlayingCard[] = [];
  for (const suit of SUITS) {
    for (const rank of TRUTH_RANKS) cards.push({ id: nanoid(), rank, suit });
  }
  return cards;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function drawOne(deck: PlayingCard[]): { card: PlayingCard | null; remaining: PlayingCard[] } {
  if (deck.length === 0) return { card: null, remaining: deck };
  const [card, ...remaining] = deck;
  return { card, remaining };
}

export function drawMany(deck: PlayingCard[], n: number): { cards: PlayingCard[]; remaining: PlayingCard[] } {
  return { cards: deck.slice(0, n), remaining: deck.slice(n) };
}

export function cardLabel(card: PlayingCard): string {
  if (card.rank === 'JOKER') return 'Joker';
  const suitSymbol = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' } as const;
  return `${card.rank}${card.suit ? suitSymbol[card.suit] : ''}`;
}
