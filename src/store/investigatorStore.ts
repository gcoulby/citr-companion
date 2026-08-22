import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Investigator, Attribute } from '../game/types';
import { ATTRIBUTES } from '../game/types';
import { rollRest } from '../game/dice';

function emptyInvestigator(): Investigator {
  return {
    name: '',
    trait: '',
    attributes: { power: 0, insight: 0, method: 0 },
    struckAttributes: [],
    fatigue: 0,
    obligations: [],
    keywords: [],
    experiencePoints: 0,
  };
}

interface InvestigatorStoreState extends Investigator {
  setName: (name: string) => void;
  setTrait: (trait: string) => void;
  setAttribute: (attr: Attribute, value: number) => void;
  strikeAttribute: (attr: Attribute, struck: boolean) => void;
  /** Marks `n` fatigue, handling track-full overflow: strikes the highest-value
   *  unstruck attribute and carries any excess (p.28). Returns how many
   *  attributes got struck as a result. */
  gainFatigue: (n?: number) => number;
  clearFatigue: (n: number) => void;
  addObligation: (text: string) => void;
  removeObligation: (id: string) => void;
  strikeObligation: (id: string, struck: boolean) => void;
  addKeyword: (text: string, signature?: boolean) => void;
  removeKeyword: (id: string) => void;
  useKeyword: (id: string) => void;
  /** Rolls 1d6, clears that many fatigue boxes, clears all attribute strikes
   *  and signature-keyword strikes. Returns the roll. */
  rest: () => number;
  load: (data: Investigator) => void;
  reset: () => void;
}

export const useInvestigatorStore = create<InvestigatorStoreState>((set) => ({
  ...emptyInvestigator(),

  setName: (name) => set({ name }),
  setTrait: (trait) => set({ trait }),
  setAttribute: (attr, value) => set((s) => ({ attributes: { ...s.attributes, [attr]: value } })),

  strikeAttribute: (attr, struck) =>
    set((s) => ({
      struckAttributes: struck
        ? s.struckAttributes.includes(attr) ? s.struckAttributes : [...s.struckAttributes, attr]
        : s.struckAttributes.filter((a) => a !== attr),
    })),

  gainFatigue: (n = 1) => {
    let struckCount = 0;
    set((s) => {
      let fatigue = s.fatigue + n;
      let struckAttributes = s.struckAttributes;
      while (fatigue >= 5) {
        const excess = fatigue - 5;
        const candidates = ATTRIBUTES
          .filter((a) => !struckAttributes.includes(a))
          .sort((a, b) => s.attributes[b] - s.attributes[a]);
        if (candidates.length === 0) { fatigue = excess; break; }
        struckAttributes = [...struckAttributes, candidates[0]];
        struckCount += 1;
        fatigue = excess;
      }
      return { fatigue, struckAttributes };
    });
    return struckCount;
  },

  clearFatigue: (n) => set((s) => ({ fatigue: Math.max(0, s.fatigue - n) })),

  addObligation: (text) => set((s) => ({ obligations: [...s.obligations, { id: nanoid(), text, struck: false }] })),
  removeObligation: (id) => set((s) => ({ obligations: s.obligations.filter((o) => o.id !== id) })),
  strikeObligation: (id, struck) =>
    set((s) => ({ obligations: s.obligations.map((o) => (o.id === id ? { ...o, struck } : o)) })),

  addKeyword: (text, signature = false) =>
    set((s) => ({ keywords: [...s.keywords, { id: nanoid(), text, signature, struck: false }] })),
  removeKeyword: (id) => set((s) => ({ keywords: s.keywords.filter((k) => k.id !== id) })),
  useKeyword: (id) => set((s) => ({ keywords: s.keywords.map((k) => (k.id === id ? { ...k, struck: true } : k)) })),

  rest: () => {
    const cleared = rollRest();
    set((s) => ({
      fatigue: Math.max(0, s.fatigue - cleared),
      struckAttributes: [],
      keywords: s.keywords.map((k) => (k.signature ? { ...k, struck: false } : k)),
    }));
    return cleared;
  },

  load: (data) => set({ ...data }),
  reset: () => set(emptyInvestigator()),
}));
