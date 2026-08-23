import { useState } from 'react';
import { createReactBlockSpec } from '@blocknote/react';
import { Dices, ArrowLeft } from 'lucide-react';
import {
  rollD6, d2FromDice, d66FromDice,
  attributeTestFromRoll, investigationFromRoll, consequenceFromRoll, yesNoFromRoll,
  type AttributeTestResult, type InvestigationRollResult, type ConsequenceRollResult, type YesNoResult,
  type D2Roll, type D66Roll,
} from '../../../game/dice';
import { oracleResultFromRoll, FIRST_NAME_TABLE, LAST_NAME_TABLE, TRAIT_TABLE, MOTIVATION_TABLE, TREACHERY_TABLE, type OracleTable, type OracleRollResult } from '../../../game/oracles';
import { GENRE_TABLES } from '../../../game/genreTables';
import { useInvestigatorStore } from '../../../store/investigatorStore';
import { useMysteryStore } from '../../../store/mysteryStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { ATTRIBUTES, type Attribute } from '../../../game/types';

export type RollBlockValue =
  | { kind: 'attributeTest'; attribute: Attribute; result: AttributeTestResult }
  | { kind: 'investigation'; result: InvestigationRollResult }
  | { kind: 'consequence'; result: ConsequenceRollResult }
  | { kind: 'rest'; recovered: number }
  | { kind: 'yesNo'; result: YesNoResult }
  | { kind: 'raw'; label: string; die: 'd6' | '2d6' | 'd66'; value: number | D2Roll | D66Roll }
  | { kind: 'oracle'; tableName: string; result: OracleRollResult };

// What the player is about to roll, before a value (auto or physical) is
// supplied. `dice` says how many 1-6 values the mechanic needs.
type PendingRoll =
  | { kind: 'raw'; label: string; die: 'd6'; dice: 1 }
  | { kind: 'raw'; label: string; die: '2d6'; dice: 2 }
  | { kind: 'raw'; label: string; die: 'd66'; dice: 2 }
  | { kind: 'yesNo'; dice: 1 }
  | { kind: 'investigation'; dice: 1 }
  | { kind: 'consequence'; dice: 1 }
  | { kind: 'rest'; dice: 1 }
  | { kind: 'attributeTest'; attribute: Attribute; dice: 2 }
  | { kind: 'oracle'; table: OracleTable; dice: 2 };

const OUTCOME_TONE: Record<string, string> = {
  success: 'text-green-400', cost: 'text-primary', failure: 'text-red-400',
  quiet: 'text-green-400', threatLevel1: 'text-primary', threatLevel2: 'text-red-400',
  raiseThreat: 'text-red-400', discardClue: 'text-red-400', fatigue1: 'text-primary', fatigue2: 'text-primary', mustStop: 'text-red-400',
  extremeYes: 'text-green-400', yes: 'text-green-400', no: 'text-red-400', extremeNo: 'text-red-400',
};

function summarize(v: RollBlockValue): { label: string; detail: string; tone: string } {
  switch (v.kind) {
    case 'attributeTest':
      return { label: `Attribute test (${v.attribute})`, detail: `${v.result.roll.a}+${v.result.roll.b}+${v.result.attributeValue} = ${v.result.total} → ${v.result.outcome}${v.result.randomEvent ? ' · random event' : ''}`, tone: OUTCOME_TONE[v.result.outcome] };
    case 'investigation':
      return { label: 'Investigation roll', detail: `d6=${v.result.roll} + danger ${v.result.danger} = ${v.result.total} → ${v.result.outcome}`, tone: OUTCOME_TONE[v.result.outcome] };
    case 'consequence':
      return { label: 'Consequence roll', detail: `d6=${v.result.roll} = ${v.result.total} → ${v.result.outcome}`, tone: OUTCOME_TONE[v.result.outcome] };
    case 'rest':
      return { label: 'Rest', detail: `recovered ${v.recovered} fatigue`, tone: 'text-green-400' };
    case 'yesNo':
      return { label: 'Yes/No oracle', detail: `d6=${v.result.roll} → ${v.result.outcome}`, tone: OUTCOME_TONE[v.result.outcome] };
    case 'raw':
      return { label: v.label, detail: typeof v.value === 'number' ? String(v.value) : 'sum' in v.value ? `${v.value.a}+${v.value.b}=${v.value.sum}${v.value.doubles ? ' (doubles)' : ''}` : `${v.value.tens}${v.value.units} (${v.value.value})`, tone: 'text-foreground' };
    case 'oracle':
      return { label: v.tableName, detail: `${v.result.result} (${v.result.roll.value})`, tone: 'text-foreground' };
  }
}

function resolvePending(p: PendingRoll, a: number, b: number): RollBlockValue {
  switch (p.kind) {
    case 'raw':
      if (p.die === 'd6') return { kind: 'raw', label: 'd6', die: 'd6', value: a };
      if (p.die === '2d6') return { kind: 'raw', label: '2d6', die: '2d6', value: d2FromDice(a, b) };
      return { kind: 'raw', label: 'd66', die: 'd66', value: d66FromDice(a, b) };
    case 'yesNo':
      return { kind: 'yesNo', result: yesNoFromRoll(a) };
    case 'investigation':
      return { kind: 'investigation', result: investigationFromRoll(a, useMysteryStore.getState().danger) };
    case 'consequence':
      return { kind: 'consequence', result: consequenceFromRoll(a, 0) };
    case 'rest':
      return { kind: 'rest', recovered: a };
    case 'attributeTest': {
      const attrValue = useInvestigatorStore.getState().attributes[p.attribute];
      return { kind: 'attributeTest', attribute: p.attribute, result: attributeTestFromRoll(d2FromDice(a, b), attrValue, useMysteryStore.getState().danger) };
    }
    case 'oracle':
      return { kind: 'oracle', tableName: p.table.name, result: oracleResultFromRoll(p.table, d66FromDice(a, b)) };
  }
}

function autoRoll(p: PendingRoll): RollBlockValue {
  return resolvePending(p, rollD6(), rollD6());
}

const NAME_ORACLES: OracleTable[] = [FIRST_NAME_TABLE, LAST_NAME_TABLE, TRAIT_TABLE, MOTIVATION_TABLE, TREACHERY_TABLE];

// eslint-disable-next-line react-refresh/only-export-components -- block-spec factory file, not an HMR component boundary
function DieInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
      {label}
      <input
        type="number" min={1} max={6} value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-10 px-1 py-0.5 rounded border border-border bg-background text-[12px] text-foreground text-center"
      />
    </label>
  );
}

interface RollBlockViewProps {
  block: { props: { data: string } };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: { updateBlock: (block: any, update: any) => void };
}

// A capitalized wrapper so eslint-plugin-react-hooks recognizes this as a
// component (BlockNote's `render` field name itself is lowercase, which
// otherwise trips the rules-of-hooks heuristic).
// eslint-disable-next-line react-refresh/only-export-components -- block-spec factory file, not an HMR component boundary
function RollBlockView(props: RollBlockViewProps) {
      const { block, editor } = props;
      const genre = useSettingsStore((s) => s.genre);
      const oracleTables = [...NAME_ORACLES, ...Object.values(GENRE_TABLES[genre])];
      const [pending, setPending] = useState<PendingRoll | null>(null);
      const [manualA, setManualA] = useState('');
      const [manualB, setManualB] = useState('');

      const set = (value: RollBlockValue) => editor.updateBlock(block, { props: { ...block.props, data: JSON.stringify(value) } });

      const choose = (p: PendingRoll) => { setPending(p); setManualA(''); setManualB(''); };
      const back = () => setPending(null);

      const submitManual = () => {
        if (!pending) return;
        const a = Math.min(6, Math.max(1, Math.round(Number(manualA)) || 1));
        const b = pending.dice === 2 ? Math.min(6, Math.max(1, Math.round(Number(manualB)) || 1)) : 1;
        set(resolvePending(pending, a, b));
        setPending(null);
      };

      if (!block.props.data && !pending) {
        return (
          <div className="w-full my-1 px-3 py-2 rounded border border-dashed border-border bg-background/40">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/70 font-mono mb-1.5">
              <Dices size={11} /> Roll
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => choose({ kind: 'raw', label: 'd6', die: 'd6', dice: 1 })} className="px-2 py-1 rounded border border-border text-[11px] hover:border-primary/40 hover:text-primary">d6</button>
              <button onClick={() => choose({ kind: 'raw', label: '2d6', die: '2d6', dice: 2 })} className="px-2 py-1 rounded border border-border text-[11px] hover:border-primary/40 hover:text-primary">2d6</button>
              <button onClick={() => choose({ kind: 'raw', label: 'd66', die: 'd66', dice: 2 })} className="px-2 py-1 rounded border border-border text-[11px] hover:border-primary/40 hover:text-primary">d66</button>
              <button onClick={() => choose({ kind: 'yesNo', dice: 1 })} className="px-2 py-1 rounded border border-border text-[11px] hover:border-primary/40 hover:text-primary">Yes/No</button>
              <button onClick={() => choose({ kind: 'investigation', dice: 1 })} className="px-2 py-1 rounded border border-border text-[11px] hover:border-primary/40 hover:text-primary">Investigation</button>
              <button onClick={() => choose({ kind: 'consequence', dice: 1 })} className="px-2 py-1 rounded border border-border text-[11px] hover:border-primary/40 hover:text-primary">Consequences</button>
              <button onClick={() => choose({ kind: 'rest', dice: 1 })} className="px-2 py-1 rounded border border-border text-[11px] hover:border-primary/40 hover:text-primary">Rest</button>
              {ATTRIBUTES.map((attr: Attribute) => (
                <button key={attr} onClick={() => choose({ kind: 'attributeTest', attribute: attr, dice: 2 })}
                  className="px-2 py-1 rounded border border-border text-[11px] hover:border-primary/40 hover:text-primary capitalize">
                  {attr} test
                </button>
              ))}
              <select
                onChange={(e) => {
                  const table = oracleTables.find((t) => t.id === e.target.value);
                  if (table) choose({ kind: 'oracle', table, dice: 2 });
                  e.target.value = '';
                }}
                defaultValue=""
                className="px-1.5 py-1 rounded border border-border bg-background text-[11px] text-muted-foreground"
              >
                <option value="" disabled>Oracle table…</option>
                {oracleTables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
        );
      }

      if (pending) {
        const label = pending.kind === 'raw' ? pending.label
          : pending.kind === 'attributeTest' ? `${pending.attribute} test`
          : pending.kind === 'oracle' ? pending.table.name
          : pending.kind;
        const isD66 = pending.kind === 'raw' && pending.die === 'd66';
        const labelA = isD66 ? 'tens' : pending.dice === 2 ? 'a' : 'd6';
        const labelB = isD66 ? 'units' : 'b';
        return (
          <div className="w-full my-1 px-3 py-2 rounded border border-dashed border-primary/40 bg-background/40">
            <div className="flex items-center gap-1.5 mb-2">
              <button onClick={back} className="text-muted-foreground/60 hover:text-primary"><ArrowLeft size={12} /></button>
              <span className="text-[11px] font-mono text-foreground capitalize">{label}</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => { set(autoRoll(pending)); setPending(null); }}
                className="px-2.5 py-1 rounded border border-primary/40 text-[11px] text-primary hover:bg-primary/10"
              >
                Roll
              </button>
              <span className="text-[10px] text-muted-foreground/50">or enter a physical roll —</span>
              <div className="flex items-center gap-2">
                <DieInput value={manualA} onChange={setManualA} label={labelA} />
                {pending.dice === 2 && (
                  <DieInput value={manualB} onChange={setManualB} label={labelB} />
                )}
                <button
                  onClick={submitManual}
                  disabled={!manualA || (pending.dice === 2 && !manualB)}
                  className="px-2.5 py-1 rounded border border-border text-[11px] text-foreground hover:border-primary/40 hover:text-primary disabled:opacity-40"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        );
      }

      let value: RollBlockValue;
      try {
        value = JSON.parse(block.props.data) as RollBlockValue;
      } catch {
        return null;
      }
      const { label: resultLabel, detail, tone } = summarize(value);
      return (
        <div className="w-full my-1 px-3 py-2 rounded border border-border bg-background/60 flex items-center gap-2.5">
          <Dices size={13} className="text-muted-foreground/60 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-mono text-muted-foreground">{resultLabel}</div>
            <div className={`text-[12px] font-mono ${tone}`}>{detail}</div>
          </div>
          <button
            onClick={() => editor.updateBlock(block, { props: { ...block.props, data: '' } })}
            className="text-[10px] text-muted-foreground/50 hover:text-primary shrink-0"
          >
            reroll
          </button>
        </div>
      );
}

export const rollBlockFactory = createReactBlockSpec(
  {
    type: 'roll',
    propSchema: {
      data: { default: '' }, // JSON-stringified RollBlockValue, empty = not yet rolled
    },
    content: 'none',
  },
  {
    render: RollBlockView,
  },
);
