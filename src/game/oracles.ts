// D66 table engine + subject oracle (p.55-57).
//
// Real genre tables (Noir/Fantasy/Horror/Sci-fi word lists for names, traits,
// motivations, treacheries, locations, objects) are a deliberately deferred
// content pass — see the project plan. Each table below ships with a small
// placeholder word list so the engine is fully functional; swap `entries` for
// the transcribed D66 tables later without touching any call sites.

import { rollD66, type D66Roll } from './dice';

export interface OracleTable {
  id: string;
  name: string;
  entries: string[]; // ideally 36 entries (one per d66 result); shorter lists wrap via modulo
}

export interface OracleRollResult {
  roll: D66Roll;
  result: string;
}

export function rollOracleTable(table: OracleTable): OracleRollResult {
  const roll = rollD66();
  const index = table.entries.length > 0 ? (roll.value - 11) % table.entries.length : 0;
  const result = table.entries.length > 0 ? table.entries[((index % table.entries.length) + table.entries.length) % table.entries.length] : '—';
  return { roll, result };
}

export const ACTION_TABLE: OracleTable = {
  id: 'action',
  name: 'Action',
  entries: ['confront', 'hide', 'protect', 'betray', 'search', 'follow', 'guard', 'flee', 'negotiate', 'threaten', 'reveal', 'conceal'],
};

export const DESCRIPTOR_TABLE: OracleTable = {
  id: 'descriptor',
  name: 'Descriptor',
  entries: ['old', 'hidden', 'broken', 'stolen', 'forbidden', 'familiar', 'expensive', 'ordinary', 'suspicious', 'urgent', 'quiet', 'dangerous'],
};

export const FOCUS_TABLE: OracleTable = {
  id: 'focus',
  name: 'Focus',
  entries: ['money', 'family', 'love', 'power', 'secret', 'past', 'debt', 'evidence', 'identity', 'trust', 'revenge', 'treasure'],
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
