import { useState } from 'react';
import { rollD6, roll2d6, rollD66, rollYesNo, type YesNoOutcome } from '../../game/dice';
import { rollSubjectOracle, type SubjectOracleResult } from '../../game/oracles';
import { SectionLabel, SmallButton } from './ui';

const YES_NO_LABEL: Record<YesNoOutcome, string> = {
  extremeNo: 'Extreme No', no: 'No', yes: 'Yes', extremeYes: 'Extreme Yes',
};

export function DiceTab() {
  const [d6, setD6] = useState<number | null>(null);
  const [d2, setD2] = useState<{ a: number; b: number; sum: number; doubles: boolean } | null>(null);
  const [d66, setD66] = useState<number | null>(null);
  const [yesNo, setYesNo] = useState<{ roll: number; outcome: YesNoOutcome } | null>(null);
  const [subject, setSubject] = useState<SubjectOracleResult | null>(null);

  return (
    <div className="p-4 space-y-5">
      <div>
        <SectionLabel>Raw dice</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => setD6(rollD6())} className="flex flex-col items-center gap-1 py-3 rounded border border-border hover:border-primary/40 transition-colors">
            <span className="text-[10px] text-muted-foreground">d6</span>
            <span className="text-xl font-mono text-foreground">{d6 ?? '–'}</span>
          </button>
          <button onClick={() => setD2(roll2d6())} className="flex flex-col items-center gap-1 py-3 rounded border border-border hover:border-primary/40 transition-colors">
            <span className="text-[10px] text-muted-foreground">2d6</span>
            <span className="text-xl font-mono text-foreground">{d2 ? d2.sum : '–'}</span>
            {d2 && <span className="text-[9px] text-muted-foreground/70">{d2.a}+{d2.b}{d2.doubles ? ' · doubles!' : ''}</span>}
          </button>
          <button onClick={() => setD66(rollD66().value)} className="flex flex-col items-center gap-1 py-3 rounded border border-border hover:border-primary/40 transition-colors">
            <span className="text-[10px] text-muted-foreground">d66</span>
            <span className="text-xl font-mono text-foreground">{d66 ?? '–'}</span>
          </button>
        </div>
      </div>

      <div>
        <SectionLabel>Yes / No oracle</SectionLabel>
        <div className="flex items-center gap-2">
          <SmallButton onClick={() => setYesNo(rollYesNo())}>Roll</SmallButton>
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
          Placeholder word lists — the genre-specific D66 tables (Noir/Fantasy/Horror/Sci-fi) from the rulebook are a follow-up content pass.
        </div>
      </div>
    </div>
  );
}
