// Pure dice-rolling helpers implementing the "Caught in the Rain" tables.
// No store access, no side effects — every function just returns a result.
//
// Each mechanic exposes two functions: `rollX(...)` rolls the app's own RNG,
// and `xFromRoll(roll, ...)` computes the same outcome from a roll supplied
// by the caller (used by the Roll block's "physical dice" mode, where the
// player types in what they actually rolled at the table).

export function rollD6(): number {
  return 1 + Math.floor(Math.random() * 6);
}

export interface D2Roll {
  a: number;
  b: number;
  sum: number;
  doubles: boolean;
}

export function d2FromDice(a: number, b: number): D2Roll {
  return { a, b, sum: a + b, doubles: a === b };
}

export function roll2d6(): D2Roll {
  return d2FromDice(rollD6(), rollD6());
}

export interface D66Roll {
  tens: number;
  units: number;
  value: number; // e.g. tens=1, units=4 -> 14
}

export function d66FromDice(tens: number, units: number): D66Roll {
  return { tens, units, value: tens * 10 + units };
}

export function rollD66(): D66Roll {
  const { a, b } = roll2d6();
  return d66FromDice(a, b);
}

// ── Attribute tests (p.27) ───────────────────────────────────────────────────

export type AttributeOutcome = 'failure' | 'cost' | 'success';

export interface AttributeTestResult {
  roll: D2Roll;
  attributeValue: number;
  total: number;
  outcome: AttributeOutcome;
  randomEvent: boolean; // doubles rolled
  belowDanger: boolean; // roll.sum < danger
}

export function attributeTestFromRoll(roll: D2Roll, attributeValue: number, danger: number): AttributeTestResult {
  const total = roll.sum + attributeValue;
  const outcome: AttributeOutcome = total <= 6 ? 'failure' : total <= 9 ? 'cost' : 'success';
  return {
    roll,
    attributeValue,
    total,
    outcome,
    randomEvent: roll.doubles,
    belowDanger: roll.sum < danger,
  };
}

export function attributeTest(attributeValue: number, danger: number): AttributeTestResult {
  return attributeTestFromRoll(roll2d6(), attributeValue, danger);
}

// ── Investigation roll (p.23) ────────────────────────────────────────────────

export type InvestigationRollOutcome = 'quiet' | 'threatLevel1' | 'threatLevel2';

export interface InvestigationRollResult {
  roll: number;
  danger: number;
  total: number;
  outcome: InvestigationRollOutcome;
}

export function investigationFromRoll(roll: number, danger: number): InvestigationRollResult {
  const total = roll + danger;
  const outcome: InvestigationRollOutcome = total <= 3 ? 'quiet' : total <= 5 ? 'threatLevel1' : 'threatLevel2';
  return { roll, danger, total, outcome };
}

export function rollInvestigation(danger: number): InvestigationRollResult {
  return investigationFromRoll(rollD6(), danger);
}

// ── Consequences (p.28) ──────────────────────────────────────────────────────

export type ConsequenceOutcome = 'raiseThreat' | 'discardClue' | 'fatigue1' | 'fatigue2' | 'mustStop';

export interface ConsequenceRollResult {
  roll: number;
  bonus: number;
  total: number;
  outcome: ConsequenceOutcome;
}

export function consequenceFromRoll(roll: number, bonus = 0): ConsequenceRollResult {
  const total = roll + bonus;
  let outcome: ConsequenceOutcome;
  if (total <= 3) outcome = 'raiseThreat';
  else if (total === 4) outcome = 'discardClue';
  else if (total <= 6) outcome = 'fatigue1';
  else if (total <= 8) outcome = 'fatigue2';
  else outcome = 'mustStop';
  return { roll, bonus, total, outcome };
}

export function rollConsequences(bonus = 0): ConsequenceRollResult {
  return consequenceFromRoll(rollD6(), bonus);
}

// ── Rest (p.33) ───────────────────────────────────────────────────────────────

export function rollRest(): number {
  return rollD6();
}

// ── Yes/No oracle (p.56) ─────────────────────────────────────────────────────

export type YesNoOutcome = 'extremeNo' | 'no' | 'yes' | 'extremeYes';

export interface YesNoResult {
  roll: number;
  outcome: YesNoOutcome;
}

export function yesNoFromRoll(roll: number): YesNoResult {
  const outcome: YesNoOutcome = roll <= 2 ? 'extremeNo' : roll === 3 ? 'no' : roll === 4 ? 'yes' : 'extremeYes';
  return { roll, outcome };
}

export function rollYesNo(): YesNoResult {
  return yesNoFromRoll(rollD6());
}
