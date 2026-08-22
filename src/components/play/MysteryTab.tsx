import { useState } from 'react';
import { useMysteryStore, type ClueDrawResult } from '../../store/mysteryStore';
import { useInvestigatorStore } from '../../store/investigatorStore';
import { useGraphStore } from '../../store/graphStore';
import { useSettingsStore } from '../../store/settingsStore';
import { ATTRIBUTES, type Attribute, type ClueStatus, type PlayingCard } from '../../game/types';
import type { AttributeTestResult, InvestigationRollResult, ConsequenceRollResult } from '../../game/dice';
import { SectionLabel, Badge, SmallButton, TextInput, TextArea } from './ui';
import { PlayingCardView } from './PlayingCard';
import { ClueTable } from './ClueTable';
import { Pencil, Dices } from 'lucide-react';
import { rollOracleTable, MOTIVATION_TABLE, TREACHERY_TABLE } from '../../game/oracles';
import { GENRE_TABLES } from '../../game/genreTables';

const ATTRIBUTE_LABELS: Record<Attribute, string> = { power: 'Power', insight: 'Insight', method: 'Method' };
const CLUE_STATUS_TONE: Record<ClueStatus, 'default' | 'amber' | 'gold' | 'red'> = {
  established: 'default', strengthened: 'amber', truth: 'gold', falseLead: 'red',
};

function RollLabel({ children, onRoll }: { children: React.ReactNode; onRoll: () => void }) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <SectionLabel>{children}</SectionLabel>
      <button onClick={onRoll} title="Roll for inspiration" className="text-muted-foreground/60 hover:text-primary transition-colors -mt-1.5">
        <Dices size={12} />
      </button>
    </div>
  );
}

function CreateMysteryForm() {
  const createMystery = useMysteryStore((s) => s.createMystery);
  const genre = useSettingsStore((s) => s.genre);
  const genreTables = GENRE_TABLES[genre];
  const [location, setLocation] = useState('');
  const [object, setObject] = useState('');
  const [treachery, setTreachery] = useState('');
  const [motivation, setMotivation] = useState('');

  const ready = location.trim() && object.trim() && treachery.trim();

  return (
    <div className="p-4 space-y-4">
      <div className="text-[11px] text-muted-foreground leading-relaxed">
        "It happened at the <span className="text-foreground">[location]</span>. That's where the{' '}
        <span className="text-foreground">[object]</span> <span className="text-foreground">[treachery]</span>."
      </div>
      <div>
        <RollLabel onRoll={() => setLocation(rollOracleTable(genreTables.locations).result)}>Location</RollLabel>
        <TextInput value={location} onChange={(e) => setLocation(e.target.value)} placeholder="the lighthouse…" />
      </div>
      <div>
        <RollLabel onRoll={() => setObject(rollOracleTable(genreTables.objects).result)}>Object</RollLabel>
        <TextInput value={object} onChange={(e) => setObject(e.target.value)} placeholder="family…" />
      </div>
      <div>
        <RollLabel onRoll={() => setTreachery(rollOracleTable(TREACHERY_TABLE).result)}>Treachery</RollLabel>
        <TextInput value={treachery} onChange={(e) => setTreachery(e.target.value)} placeholder="transformed…" />
      </div>
      <div>
        <RollLabel onRoll={() => setMotivation(rollOracleTable(MOTIVATION_TABLE).result)}>Motivation</RollLabel>
        <TextArea rows={2} value={motivation} onChange={(e) => setMotivation(e.target.value)} placeholder="Why does your investigator need the truth?" />
      </div>
      <button
        disabled={!ready}
        onClick={() => createMystery({ location: location.trim(), object: object.trim(), treachery: treachery.trim() }, motivation.trim())}
        className="w-full py-2 rounded border border-primary/40 text-primary text-[12px] hover:bg-primary/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Begin the mystery — seal 3 truth cards
      </button>
    </div>
  );
}

function Clock({ marks, onSet }: { marks: number; onSet: (marks: number) => void }) {
  return (
    <div className="flex gap-1">
      {[0, 1, 2, 3].map((i) => (
        <button
          key={i}
          title={`Set clock to ${i + 1}/4`}
          onClick={() => onSet(marks === i + 1 ? i : i + 1)}
          className={`w-5 h-5 rounded-full border transition-colors ${i < marks ? 'bg-primary/30 border-primary/60' : 'border-border hover:border-muted-foreground/40'}`}
        />
      ))}
    </div>
  );
}

export function MysteryTab() {
  const m = useMysteryStore();
  const inv = useInvestigatorStore();
  const addNode = useGraphStore((s) => s.addNode);
  const addEdge = useGraphStore((s) => s.addEdge);
  const genre = useSettingsStore((s) => s.genre);
  const genreTables = GENRE_TABLES[genre];

  const [testAttr, setTestAttr] = useState<Attribute>('insight');
  const [lastTest, setLastTest] = useState<(AttributeTestResult & { addedThreatId: string | null }) | null>(null);
  const [lastInvestigationRoll, setLastInvestigationRoll] = useState<InvestigationRollResult | null>(null);
  const [lastConsequence, setLastConsequence] = useState<ConsequenceRollResult | null>(null);
  const [jokerChoice, setJokerChoice] = useState<string[] | null>(null);
  const [truthDrawn, setTruthDrawn] = useState<PlayingCard[] | null>(null);
  const [truthSceneClue, setTruthSceneClue] = useState('');
  const [obligationChoice, setObligationChoice] = useState('');
  const [newDayNotice, setNewDayNotice] = useState(false);
  const [restNotice, setRestNotice] = useState<number | null>(null);
  const [editingProblem, setEditingProblem] = useState(false);
  const [editingThreatId, setEditingThreatId] = useState<string | null>(null);
  const [clueDrawnForTest, setClueDrawnForTest] = useState(false);
  const autoAdvanceDay = useSettingsStore((s) => s.automations.autoAdvanceDay);

  if (!m.started) return <CreateMysteryForm />;

  const clueSetList = Object.values(m.clueSets).sort((a, b) => a.rank.localeCompare(b.rank, undefined, { numeric: true }));
  const activeThreats = m.threats.filter((t) => !t.defeated);
  const truthCandidates = clueSetList.filter((cs) => cs.status !== 'truth' && cs.status !== 'falseLead');

  const handleDraw = () => {
    if (clueDrawnForTest) return;
    const result: ClueDrawResult = m.drawClueCard();
    if (result.kind === 'jokerChoice') setJokerChoice(result.candidateClueSetIds);
    setClueDrawnForTest(true);
  };

  const handleAddClueToBoard = (rank: string) => {
    const cs = m.clueSets[rank];
    if (!cs) return;
    if (cs.boardNodeId) return;
    const card = cs.cards[cs.cards.length - 1];
    const node = addNode({
      label: `Clue ${rank}`,
      summary: cs.description,
      tags: [],
      hasContent: false,
      properties: {},
      nodeType: 'clue',
      clue: { rank, status: cs.status, card },
    });
    m.addClueToBoard(rank, node.id);
  };

  const handleCreateTruthNode = (rank: string, card?: PlayingCard) => {
    const cs = m.clueSets[rank];
    if (!cs) return;
    const truthNode = addNode({
      label: `Truth — Clue ${rank}`,
      summary: cs.description,
      tags: [],
      hasContent: false,
      properties: {},
      nodeType: 'truth',
      truth: { connection: cs.description, card },
    });
    if (cs.boardNodeId) addEdge({ source: cs.boardNodeId, target: truthNode.id, label: 'confirms' });
  };

  const handleAddThreatToBoard = (threatId: string) => {
    const t = m.threats.find((x) => x.id === threatId);
    if (!t) return;
    addNode({
      label: t.name,
      summary: '',
      tags: [],
      hasContent: false,
      properties: {},
      nodeType: 'threat',
      threat: { threatId: t.id, level: t.level, kind: t.kind, defeated: t.defeated },
    });
  };

  return (
    <div className="p-4 space-y-5">
      <div>
        {editingProblem ? (
          <div className="space-y-2 p-2.5 rounded border border-border bg-background">
            <div>
              <RollLabel onRoll={() => m.updateProblem({ location: rollOracleTable(genreTables.locations).result })}>Location</RollLabel>
              <TextInput value={m.problem.location} onChange={(e) => m.updateProblem({ location: e.target.value })} />
            </div>
            <div>
              <RollLabel onRoll={() => m.updateProblem({ object: rollOracleTable(genreTables.objects).result })}>Object</RollLabel>
              <TextInput value={m.problem.object} onChange={(e) => m.updateProblem({ object: e.target.value })} />
            </div>
            <div>
              <RollLabel onRoll={() => m.updateProblem({ treachery: rollOracleTable(TREACHERY_TABLE).result })}>Treachery</RollLabel>
              <TextInput value={m.problem.treachery} onChange={(e) => m.updateProblem({ treachery: e.target.value })} />
            </div>
            <div>
              <RollLabel onRoll={() => m.setMotivation(rollOracleTable(MOTIVATION_TABLE).result)}>Motivation</RollLabel>
              <TextArea rows={2} value={m.motivation} onChange={(e) => m.setMotivation(e.target.value)} />
            </div>
            <SmallButton onClick={() => setEditingProblem(false)}>Done</SmallButton>
          </div>
        ) : (
          <div className="group relative">
            <div className="text-[11px] text-muted-foreground leading-relaxed pr-5">
              It happened at the <span className="text-foreground">{m.problem.location}</span>. That's where the{' '}
              <span className="text-foreground">{m.problem.object}</span> <span className="text-foreground">{m.problem.treachery}</span>.
            </div>
            {m.motivation && <div className="text-[10px] text-muted-foreground/70 mt-1 italic pr-5">{m.motivation}</div>}
            <button
              onClick={() => setEditingProblem(true)}
              className="absolute top-0 right-0 text-muted-foreground/50 opacity-0 group-hover:opacity-100 hover:text-primary transition-opacity"
              title="Edit mystery setup"
            >
              <Pencil size={11} />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <SectionLabel>Danger</SectionLabel>
          <div className="flex items-center gap-1.5">
            <button onClick={() => m.setDanger(m.danger - 1)} className="w-4 h-4 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/40 text-[11px] leading-none">–</button>
            <div className="w-9 h-9 rounded border border-primary/40 rotate-45 flex items-center justify-center">
              <span className="text-[13px] font-mono text-primary -rotate-45">{m.danger}</span>
            </div>
            <button onClick={() => m.setDanger(m.danger + 1)} className="w-4 h-4 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/40 text-[11px] leading-none">+</button>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <button onClick={() => m.setDay(m.day - 1)} className="w-4 h-4 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/40 text-[11px] leading-none">–</button>
            <SectionLabel>Day {m.day}</SectionLabel>
            <button onClick={() => m.setDay(m.day + 1)} className="w-4 h-4 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/40 text-[11px] leading-none">+</button>
          </div>
          <Clock marks={m.clockMarks} onSet={m.setClockMarks} />
        </div>
      </div>

      {!autoAdvanceDay && m.clockMarks >= 4 && (
        <div className="px-2.5 py-1.5 rounded bg-primary/10 border border-primary/30 text-[11px] text-primary space-y-1.5">
          <div>Clock is full — auto day advance is off. Advance manually when ready.</div>
          <SmallButton tone="amber" onClick={() => { m.advanceDay(); setNewDayNotice(true); }}>Advance to Day {m.day + 1}</SmallButton>
        </div>
      )}

      {newDayNotice && (
        <div className="px-2.5 py-1.5 rounded bg-primary/10 border border-primary/30 text-[11px] text-primary">
          A new day has begun — unattended obligations cost fatigue, strikes cleared.
        </div>
      )}

      {!m.scene.active ? (
        <div>
          <SectionLabel>Start a scene</SectionLabel>
          <div className="grid grid-cols-2 gap-1.5">
            <SmallButton onClick={() => { setLastInvestigationRoll(m.startInvestigationScene()); setNewDayNotice(false); setClueDrawnForTest(false); }}>Investigation</SmallButton>
            <SmallButton onClick={() => setTruthSceneClue(truthCandidates[0]?.id ?? '')} disabled={truthCandidates.length === 0}>Truth</SmallButton>
            <SmallButton onClick={() => setObligationChoice(inv.obligations.find((o) => !o.struck)?.id ?? '')} disabled={inv.obligations.every((o) => o.struck) || inv.obligations.length === 0}>
              Obligation
            </SmallButton>
            <SmallButton onClick={() => setRestNotice(m.runRestScene())}>Rest</SmallButton>
          </div>
          {restNotice !== null && (
            <div className="mt-2 text-[11px] text-muted-foreground">Cleared {restNotice} fatigue, strikes cleared, discarded a clue card.</div>
          )}
        </div>
      ) : (
        <div className="space-y-3 p-2.5 rounded border border-border bg-background">
          <div className="flex items-center justify-between">
            <SectionLabel>Investigation scene</SectionLabel>
            <Badge tone="amber">{m.scene.stage}</Badge>
          </div>
          {lastInvestigationRoll && (
            <div className="text-[10px] text-muted-foreground/70">rolled {lastInvestigationRoll.roll} + danger {lastInvestigationRoll.danger} = {lastInvestigationRoll.total}</div>
          )}

          <div>
            <div className="text-[10px] text-muted-foreground mb-1">Attribute test</div>
            <div className="flex gap-1 mb-1.5">
              {ATTRIBUTES.map((a) => (
                <button key={a} disabled={inv.struckAttributes.includes(a)}
                  onClick={() => setTestAttr(a)}
                  className={`flex-1 px-2 py-1 rounded border text-[10px] transition-colors disabled:opacity-30 ${testAttr === a ? 'border-primary/60 text-primary bg-primary/10' : 'border-border text-muted-foreground'}`}>
                  {ATTRIBUTE_LABELS[a]} ({inv.attributes[a]})
                </button>
              ))}
            </div>
            <SmallButton onClick={() => { setLastTest(m.runAttributeTest(testAttr)); setClueDrawnForTest(false); }}>Roll test</SmallButton>
            {lastTest && (
              <div className="mt-1.5 text-[11px] space-y-1">
                <div className="text-foreground font-mono">
                  {lastTest.roll.a}+{lastTest.roll.b}+{lastTest.attributeValue} = {lastTest.total} —{' '}
                  <span className={lastTest.outcome === 'success' ? 'text-green-400' : lastTest.outcome === 'cost' ? 'text-primary' : 'text-red-400'}>
                    {lastTest.outcome === 'success' ? 'Success' : lastTest.outcome === 'cost' ? 'Success at a cost' : 'Failure'}
                  </span>
                </div>
                {lastTest.randomEvent && <div className="text-muted-foreground">Doubles — a random event occurs.</div>}
                {lastTest.belowDanger && <div className="text-muted-foreground">Below danger — a level 1 threat appears, danger halved.</div>}
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {lastTest.outcome !== 'success' && (
                    <SmallButton onClick={() => setLastConsequence(m.applyConsequences(0))}>Suffer consequences</SmallButton>
                  )}
                  {(lastTest.outcome === 'success' || m.scene.stage === 'acquisition') && (
                    <SmallButton onClick={handleDraw} disabled={clueDrawnForTest}>{clueDrawnForTest ? 'Clue drawn' : 'Draw clue'}</SmallButton>
                  )}
                  <SmallButton onClick={() => m.advanceStage()}>Advance stage</SmallButton>
                </div>
                {lastConsequence && (
                  <div className="text-muted-foreground">consequence roll {lastConsequence.roll}+{lastConsequence.bonus} = {lastConsequence.total} → {lastConsequence.outcome}</div>
                )}
              </div>
            )}
          </div>

          {activeThreats.length > 0 && (
            <div>
              <div className="text-[10px] text-muted-foreground mb-1">Threats</div>
              <div className="space-y-1">
                {activeThreats.map((t) => (
                  <div key={t.id} className="flex items-center gap-1.5">
                    <span className="flex-1 text-[11px] text-foreground">{t.name}</span>
                    <Badge tone={t.kind === 'rival' ? 'red' : 'default'}>L{t.level} · {t.marks}/{t.level}</Badge>
                    <SmallButton onClick={() => m.actAgainstThreat(t.id, testAttr)}>Act</SmallButton>
                  </div>
                ))}
              </div>
              <SmallButton onClick={() => m.resolveThreatActions(lastTest?.addedThreatId ? [lastTest.addedThreatId] : [])}>Threats act</SmallButton>
            </div>
          )}

          {jokerChoice && (
            <div className="p-2 rounded border border-red-400/30 bg-red-400/5">
              <div className="text-[11px] text-red-400 mb-1">Joker! Choose a clue set to become a false lead:</div>
              <div className="flex flex-wrap gap-1">
                {jokerChoice.map((id) => (
                  <SmallButton key={id} onClick={() => { m.resolveJoker(id); setJokerChoice(null); }}>{id}</SmallButton>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => { const r = m.endScene(); setNewDayNotice(r.newDay); setLastTest(null); setLastConsequence(null); setLastInvestigationRoll(null); }}
            className="w-full py-1.5 rounded border border-border text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            End scene
          </button>
        </div>
      )}

      {truthSceneClue && (
        <div className="p-2.5 rounded border border-border bg-background space-y-2">
          <SectionLabel>Truth scene</SectionLabel>
          <select value={truthSceneClue} onChange={(e) => setTruthSceneClue(e.target.value)}
            className="w-full bg-background border border-border rounded px-2 py-1 text-[11px] text-foreground">
            {truthCandidates.map((cs) => <option key={cs.id} value={cs.id}>Clue {cs.rank} ({cs.cards.length} cards)</option>)}
          </select>
          <SmallButton onClick={() => {
            const drawn = m.runTruthScene(truthSceneClue);
            setTruthDrawn(drawn ?? null);
          }}>Rotate &amp; draw truth cards</SmallButton>
          {truthDrawn && (
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-1.5">
                {truthDrawn.map((c) => <PlayingCardView key={c.id} card={c} size="sm" />)}
              </div>
              <div className="text-[11px] text-foreground">Describe what connection confirms this truth in the clue's description below.</div>
              <SmallButton onClick={() => handleCreateTruthNode(truthSceneClue, truthDrawn[0])}>Create truth node</SmallButton>
            </div>
          )}
          <button onClick={() => { setTruthSceneClue(''); setTruthDrawn(null); }} className="text-[10px] text-muted-foreground/70 hover:text-muted-foreground">Close</button>
        </div>
      )}

      {obligationChoice && (
        <div className="p-2.5 rounded border border-border bg-background space-y-2">
          <SectionLabel>Obligation scene</SectionLabel>
          <select value={obligationChoice} onChange={(e) => setObligationChoice(e.target.value)}
            className="w-full bg-background border border-border rounded px-2 py-1 text-[11px] text-foreground">
            {inv.obligations.filter((o) => !o.struck).map((o) => <option key={o.id} value={o.id}>{o.text}</option>)}
          </select>
          <SmallButton onClick={() => { m.runObligationScene(obligationChoice); setObligationChoice(''); }}>Attend to it</SmallButton>
        </div>
      )}

      <div>
        <SectionLabel>Clue table</SectionLabel>
        <ClueTable clueSets={m.clueSets} />
      </div>

      <div>
        <SectionLabel>Clue sets</SectionLabel>
        <div className="space-y-2">
          {clueSetList.length === 0 && <div className="text-[11px] text-muted-foreground/40">No clues yet</div>}
          {clueSetList.map((cs) => (
            <div key={cs.id} className="p-2 rounded border border-border bg-background">
              <div className="flex items-start gap-2 mb-1.5">
                {cs.cards.length > 0 && <PlayingCardView card={cs.cards[cs.cards.length - 1]} size="sm" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[11px] font-mono text-foreground">Clue {cs.rank}</span>
                    <Badge tone={CLUE_STATUS_TONE[cs.status]}>{cs.status}</Badge>
                    <span className="text-[9px] text-muted-foreground/70">{cs.cards.length} card{cs.cards.length === 1 ? '' : 's'}</span>
                    <button
                      onClick={() => {
                        const word = rollOracleTable(genreTables.clues).result;
                        m.setClueDescription(cs.rank, cs.description ? `${cs.description} — ${word}` : word);
                      }}
                      title="Roll a clue word for inspiration"
                      className="ml-auto text-muted-foreground/60 hover:text-primary transition-colors"
                    >
                      <Dices size={11} />
                    </button>
                  </div>
                  <TextArea rows={2} value={cs.description} placeholder="What is this clue?"
                    onChange={(e) => m.setClueDescription(cs.rank, e.target.value)}
                    className="text-[11px]" />
                </div>
              </div>
              {cs.boardNodeId ? (
                <Badge tone="green">on board</Badge>
              ) : (
                <SmallButton onClick={() => handleAddClueToBoard(cs.rank)}>Add to board</SmallButton>
              )}
            </div>
          ))}
        </div>
      </div>

      {m.threats.length > 0 && (
        <div>
          <SectionLabel>Threats &amp; rivals</SectionLabel>
          <div className="space-y-1">
            {m.threats.map((t) => (
              <div key={t.id} className="flex items-center gap-1.5 text-[11px]">
                {editingThreatId === t.id ? (
                  <TextInput
                    autoFocus
                    value={t.name}
                    onChange={(e) => m.renameThreat(t.id, e.target.value)}
                    onBlur={() => setEditingThreatId(null)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingThreatId(null); }}
                    className="flex-1 h-6 text-[11px]"
                  />
                ) : (
                  <button
                    onClick={() => setEditingThreatId(t.id)}
                    className={`flex-1 text-left hover:underline ${t.defeated ? 'text-muted-foreground/70 line-through' : 'text-foreground'}`}
                  >
                    {t.name}
                  </button>
                )}
                <button
                  onClick={() => m.renameThreat(t.id, rollOracleTable(genreTables.threats).result)}
                  title="Roll a threat name for inspiration"
                  className="text-muted-foreground/60 hover:text-primary transition-colors"
                >
                  <Dices size={11} />
                </button>
                <Badge tone={t.defeated ? 'default' : t.kind === 'rival' ? 'red' : 'default'}>L{t.level}</Badge>
                <SmallButton onClick={() => handleAddThreatToBoard(t.id)}>Add to board</SmallButton>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
