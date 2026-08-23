import { useState } from 'react';
import {
  rollD6, roll2d6, rollD66, rollYesNo, yesNoFromRoll,
  d2FromDice, d66FromDice, type YesNoOutcome,
} from '../../game/dice';
import {
  rollSubjectOracle, rollOracleTable, rollFullName,
  FIRST_NAME_TABLE, LAST_NAME_TABLE, TRAIT_TABLE, MOTIVATION_TABLE, TREACHERY_TABLE,
  type SubjectOracleResult, type OracleTable, type OracleRollResult,
} from '../../game/oracles';
import { GENRE_TABLES } from '../../game/genreTables';
import { useSettingsStore } from '../../store/settingsStore';
import { SectionLabel, SmallButton, DiceRoller } from './ui';

const YES_NO_LABEL: Record<YesNoOutcome, string> = {
  extremeNo: 'Extreme No', no: 'No', yes: 'Yes', extremeYes: 'Extreme Yes',
};

const GENRE_LABEL: Record<string, string> = { noir: 'Noir', fantasy: 'Fantasy', horror: 'Horror', scifi: 'Sci-fi' };

function OracleRow({ table, result, onRoll }: { table: OracleTable; result: OracleRollResult | null; onRoll: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <SmallButton onClick={onRoll}>{table.name}</SmallButton>
      {result && (
        <span className="text-[11px] text-foreground font-mono">
          {result.result} <span className="text-muted-foreground/70">({result.roll.value})</span>
        </span>
      )}
    </div>
  );
}

export function DiceTab() {
  const [d6, setD6] = useState<number | null>(null);
  const [d2, setD2] = useState<{ a: number; b: number; sum: number; doubles: boolean } | null>(null);
  const [d66, setD66] = useState<number | null>(null);
  const [yesNo, setYesNo] = useState<{ roll: number; outcome: YesNoOutcome } | null>(null);
  const [subject, setSubject] = useState<SubjectOracleResult | null>(null);

  const [results, setResults] = useState<Record<string, OracleRollResult>>({});
  const [fullName, setFullName] = useState<string | null>(null);

  const genre = useSettingsStore((s) => s.genre);
  const genreTables = GENRE_TABLES[genre];

  const roll = (table: OracleTable) => setResults((r) => ({ ...r, [table.id]: rollOracleTable(table) }));

  return (
    <div className="p-4 space-y-5">
      <div>
        <SectionLabel>Raw dice</SectionLabel>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <DiceRoller dice={1} label="d6" onRoll={() => setD6(rollD6())} onManual={([a]) => setD6(a)} />
            {d6 !== null && <span className="text-[12px] text-foreground font-mono">{d6}</span>}
          </div>
          <div className="flex items-center gap-2">
            <DiceRoller dice={2} label="2d6" onRoll={() => setD2(roll2d6())} onManual={([a, b]) => setD2(d2FromDice(a, b))} />
            {d2 && (
              <span className="text-[12px] text-foreground font-mono">
                {d2.sum} <span className="text-[10px] text-muted-foreground/70">({d2.a}+{d2.b}{d2.doubles ? ' · doubles!' : ''})</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <DiceRoller dice={2} label="d66" onRoll={() => setD66(rollD66().value)} onManual={([a, b]) => setD66(d66FromDice(a, b).value)} />
            {d66 !== null && <span className="text-[12px] text-foreground font-mono">{d66}</span>}
          </div>
        </div>
      </div>

      <div>
        <SectionLabel>Yes / No oracle</SectionLabel>
        <div className="flex items-center gap-2">
          <DiceRoller dice={1} onRoll={() => setYesNo(rollYesNo())} onManual={([a]) => setYesNo(yesNoFromRoll(a))} />
          {yesNo && (
            <span className="text-[12px] text-foreground font-mono">
              {YES_NO_LABEL[yesNo.outcome]} <span className="text-muted-foreground/70">(rolled {yesNo.roll})</span>
            </span>
          )}
        </div>
      </div>

      <div>
        <SectionLabel>Subject oracle</SectionLabel>
        <div className="flex items-center gap-2 mb-2">
          <SmallButton onClick={() => setSubject(rollSubjectOracle())}>Roll 3 words</SmallButton>
        </div>
        {subject && (
          <div className="flex flex-wrap gap-1.5">
            <span className="px-2 py-1 rounded bg-background border border-border text-[11px] text-foreground font-mono">{subject.action.result}</span>
            <span className="px-2 py-1 rounded bg-background border border-border text-[11px] text-foreground font-mono">{subject.descriptor.result}</span>
            <span className="px-2 py-1 rounded bg-background border border-border text-[11px] text-foreground font-mono">{subject.focus.result}</span>
          </div>
        )}
        <div className="text-[10px] text-muted-foreground/40 mt-2 leading-relaxed">
          Combine action + descriptor + focus to inspire an answer to an open question or event.
        </div>
      </div>

      <div>
        <SectionLabel>Names, traits &amp; motivations</SectionLabel>
        <div className="space-y-1.5">
          <OracleRow table={FIRST_NAME_TABLE} result={results[FIRST_NAME_TABLE.id] ?? null} onRoll={() => roll(FIRST_NAME_TABLE)} />
          <OracleRow table={LAST_NAME_TABLE} result={results[LAST_NAME_TABLE.id] ?? null} onRoll={() => roll(LAST_NAME_TABLE)} />
          <div className="flex items-center gap-2">
            <SmallButton onClick={() => setFullName(rollFullName().name)}>Invented name</SmallButton>
            {fullName && <span className="text-[11px] text-foreground font-mono">{fullName}</span>}
          </div>
          <OracleRow table={TRAIT_TABLE} result={results[TRAIT_TABLE.id] ?? null} onRoll={() => roll(TRAIT_TABLE)} />
          <OracleRow table={MOTIVATION_TABLE} result={results[MOTIVATION_TABLE.id] ?? null} onRoll={() => roll(MOTIVATION_TABLE)} />
          <OracleRow table={TREACHERY_TABLE} result={results[TREACHERY_TABLE.id] ?? null} onRoll={() => roll(TREACHERY_TABLE)} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <SectionLabel>{GENRE_LABEL[genre]} tables</SectionLabel>
          <span className="text-[9px] text-muted-foreground/50 font-mono">from Settings → Genre</span>
        </div>
        <div className="space-y-1.5">
          <OracleRow table={genreTables.locations} result={results[genreTables.locations.id] ?? null} onRoll={() => roll(genreTables.locations)} />
          <OracleRow table={genreTables.objects} result={results[genreTables.objects.id] ?? null} onRoll={() => roll(genreTables.objects)} />
          <OracleRow table={genreTables.clues} result={results[genreTables.clues.id] ?? null} onRoll={() => roll(genreTables.clues)} />
          <OracleRow table={genreTables.keywords} result={results[genreTables.keywords.id] ?? null} onRoll={() => roll(genreTables.keywords)} />
          <OracleRow table={genreTables.obligations} result={results[genreTables.obligations.id] ?? null} onRoll={() => roll(genreTables.obligations)} />
          <OracleRow table={genreTables.threats} result={results[genreTables.threats.id] ?? null} onRoll={() => roll(genreTables.threats)} />
        </div>
      </div>
    </div>
  );
}
