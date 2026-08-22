// D66 table engine + the general oracle/random tables from the rulebook
// (Ch.4 "Oracles" p.55-57, Ch.5 "Random Tables" p.61-68). Genre-specific
// tables (Noir/Fantasy/Horror/Sci-fi) live in genreTables.ts.

import { rollD66, type D66Roll } from './dice';

export interface OracleTable {
  id: string;
  name: string;
  /** Exactly 36 entries, ordered to match the rulebook's d66 sequence:
   *  11,12,13,14,15,16,21,22,...,26,31,...,66. */
  entries: string[];
}

export interface OracleRollResult {
  roll: D66Roll;
  result: string;
}

// A d66 roll (tens/units both 1-6) maps directly onto a 36-entry table
// ordered 11,12,...,16,21,...,66 via index = (tens-1)*6 + (units-1).
export function oracleResultFromRoll(table: OracleTable, roll: D66Roll): OracleRollResult {
  const index = (roll.tens - 1) * 6 + (roll.units - 1);
  const result = table.entries[index] ?? '—';
  return { roll, result };
}

export function rollOracleTable(table: OracleTable): OracleRollResult {
  return oracleResultFromRoll(table, rollD66());
}

// ── Subject oracles (p.57) — open questions / random events ─────────────────

export const ACTION_TABLE: OracleTable = {
  id: 'action',
  name: 'Action',
  entries: [
    'Confront', 'Investigate', 'Create', 'Guard', 'Control', 'Evade',
    'Eliminate', 'Support', 'Share', 'Explore', 'Impress', 'Steal',
    'Protect', 'Improve', 'Manipulate', 'Deliver', 'Locate', 'Arrive',
    'Escort', 'Search', 'Leave', 'Attack', 'Acquire', 'Restore',
    'Reveal', 'Capture', 'Chase', 'Hide', 'Demand', 'Prevent',
    'Trap', 'Trick', 'Disguise', 'Focus', 'Abandon', 'Uncover',
  ],
};

export const DESCRIPTOR_TABLE: OracleTable = {
  id: 'descriptor',
  name: 'Descriptor',
  entries: [
    'Flourishing', 'Treacherous', 'Active', 'Old', 'Dark', 'Concealed',
    'Broken', 'Guarded', 'Empty', 'Forgotten', 'Abandoned', 'Isolated',
    'Small', 'Wild', 'Growing', 'Large', 'Fast', 'Expensive',
    'Evasive', 'Narrow', 'Foreign', 'Intelligent', 'Practical', 'Paltry',
    'Slow', 'Significant', 'Habitual', 'Cautious', 'Cooperative', 'Sacred',
    'Aquatic', 'Redundant', 'Elegant', 'Beautiful', 'Unsightly', 'Sleepy',
  ],
};

export const FOCUS_TABLE: OracleTable = {
  id: 'focus',
  name: 'Focus',
  entries: [
    'Truth', 'Risk', 'Clue', 'Mystery', 'Gadget', 'Power',
    'Insight', 'Secret', 'History', 'Life', 'Opportunity', 'Route',
    'Obligation', 'Wealth', 'Hate', 'Deception', 'Weapon', 'Death',
    'Treasure', 'Love', 'Message', 'Trust', 'Skill', 'Plan',
    'Refuge', 'Patron', 'Knowledge', 'Followers', 'Bravery', 'Fear',
    'Fight', 'Court', 'Doubt', 'Relationship', 'Reputation', 'Burden',
  ],
};

export interface SubjectOracleResult {
  action: OracleRollResult;
  descriptor: OracleRollResult;
  focus: OracleRollResult;
}

export function rollSubjectOracle(): SubjectOracleResult {
  return {
    action: rollOracleTable(ACTION_TABLE),
    descriptor: rollOracleTable(DESCRIPTOR_TABLE),
    focus: rollOracleTable(FOCUS_TABLE),
  };
}

// ── General random tables (p.63-68) — names, traits, motivations, treachery ─

export const FIRST_NAME_TABLE: OracleTable = {
  id: 'firstName',
  name: 'First name',
  entries: [
    'Kit', 'Anahera', 'Elijah', 'Silas', 'Zephyr', 'Imogen',
    'Richter', 'Amelia', 'Zayd', 'Yoko', 'Oliver', 'Cecil',
    'Ike', 'Lorenzo', 'Penny', 'Jon', 'Hafsah', 'Tamsin',
    'Ripley', 'Willow', 'Cristiano', 'Nixa', 'Leif', 'Charlie',
    'Jasher', 'Fatima', 'Montgomery', 'Gilda', 'Camille', 'Pearl',
    'Wren', 'Percy', 'Estella', 'Leah', 'Yorinna', 'Landon',
  ],
};

export const LAST_NAME_TABLE: OracleTable = {
  id: 'lastName',
  name: 'Last name',
  entries: [
    'Deckard', 'Asher', 'De la Rue', 'Bakshi', 'Sheppard', 'Briggs',
    'Pearce', 'Roh', 'Bardon', 'Nguyen', 'Braybrook', 'Diaz',
    'McGuire', 'Porter', 'Mahuta', 'Eriksson', 'Cromwell', 'Thorpe',
    'Johannes', 'Marx', 'Elsher', 'Nichols', 'Scully', 'Stines',
    'Vazquez', 'Zimet', 'Onai', 'Rosenblum', 'Anderson', 'Thatcher',
    'Heywood', 'Garcia', 'Veilleux', 'Leeson', 'Seymour', 'Wilder',
  ],
};

export const NAME_PREFIX_TABLE: OracleTable = {
  id: 'namePrefix',
  name: 'Name prefix',
  entries: [
    'An', 'Neph', 'Yor', 'Cal', 'Har', 'Fen',
    'Bryn', 'Orin', 'Sel', 'Con', 'Tar', 'Lor',
    'Quin', 'Vael', 'Ael', 'Elen', 'Iver', 'Mer',
    'Jes', 'Nym', 'Bran', 'Nic', 'Par', 'Jas',
    'Bal', 'Lys', 'Thel', 'Nyx', 'Car', 'Stef',
    'Vesir', 'Gren', 'Rik', 'Dam', 'Ren', 'Al',
  ],
};

export const NAME_SUFFIX_TABLE: OracleTable = {
  id: 'nameSuffix',
  name: 'Name suffix',
  entries: [
    'lim', 'inna', 'way', 'don', 'low', 'ath',
    'laris', 'enar', 'norin', 'jorn', 'thor', 'vryn',
    'sen', 'rath', 'olas', 'sar', 'len', 'eth',
    'dor', 'oris', 'lum', 'drel', 'ne', 'nor',
    'us', 'mine', 'e', 'aros', 'pyre', 'rin',
    'sette', 'on', 'an', 'a', 'wyn', 'in',
  ],
};

// Combines a random prefix + suffix into a fully invented name (p.65).
export function rollFullName(): { name: string; prefix: OracleRollResult; suffix: OracleRollResult } {
  const prefix = rollOracleTable(NAME_PREFIX_TABLE);
  const suffix = rollOracleTable(NAME_SUFFIX_TABLE);
  return { name: `${prefix.result}${suffix.result}`, prefix, suffix };
}

export const TRAIT_TABLE: OracleTable = {
  id: 'trait',
  name: 'Trait',
  entries: [
    'Optimistic', 'Lazy', 'Blind', 'Alter ego', 'Cocky', 'Narcissistic',
    'Soft', 'Missing limb', 'Insomniac', 'Cowardly', 'Superstitious', 'Adventurous',
    'Tattooed', 'Charming', 'Cold', 'Heavyset', 'Resilient', 'Elegant',
    'Pessimistic', 'Verbal stutter', 'Ruthless', 'Paranoid', 'Greedy', 'Depressed',
    'Lean', 'Stoic', 'Prosthetic eye', 'Fidgety', 'Mute', 'Scarred',
    'Forgetful', 'Angry', 'Loud', 'Sickly', 'Law-abiding', 'Germaphobe',
  ],
};

export const MOTIVATION_TABLE: OracleTable = {
  id: 'motivation',
  name: 'Motivation',
  entries: [
    'Complicit loved one', 'Monetary incentive', 'Vendetta', 'Just business', 'Career advancement', 'Promise to keep',
    'Pure curiosity', 'Right a wrong', 'Personal danger', 'Boredom', 'Love', 'Obsession',
    'Blackmail', 'Pursuit of truth', 'Debilitating guilt', 'Proof of worth', 'Sense of duty', 'Past trauma',
    'Faith', 'Reputation to uphold', 'Thrill-seeking', 'Rivalry', 'Dying wish', 'One last job',
    'Debt to repay', 'Hatred', 'Personal connection', 'Compelling dreams', 'Desperation', 'Nothing to lose',
    'For the challenge', 'Unfinished work', 'A missing piece', 'Curse to break', 'Protect a secret', 'Academic',
  ],
};

// When creating a problem, roll on this table for the treachery that befell
// the object (p.62) — entries 61-66 require rolling an additional object.
export const TREACHERY_TABLE: OracleTable = {
  id: 'treachery',
  name: 'Treachery',
  entries: [
    'vanished', 'changed', 'perished', 'suffered', 'failed', 'was replaced',
    'was destroyed', 'was depleted', 'became vulnerable', 'was stolen', 'became exposed', 'appeared',
    'was disrupted', 'was consumed', 'became corrupted', 'was sealed away', 'evolved', 'warped',
    'deteriorated', 'evaporated', 'crumbled', 'withered', 'was erased', 'exploded',
    'disappeared', 'was revealed', 'transformed', 'was modified', 'manifested', 'was hidden',
    'damaged the [object]', 'changed the [object]', 'destroyed the [object]', 'revealed the [object]', 'exposed the [object]', 'became the [object]',
  ],
};
