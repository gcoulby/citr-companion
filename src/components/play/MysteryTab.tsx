import { useState } from 'react';
import { useMysteryStore, type ClueDrawResult } from '../../store/mysteryStore';
import { useInvestigatorStore } from '../../store/investigatorStore';
import { useGraphStore } from '../../store/graphStore';
import { ATTRIBUTES, type Attribute, type ClueStatus } from '../../game/types';
import type { AttributeTestResult, InvestigationRollResult, ConsequenceRollResult } from '../../game/dice';
import { cardLabel } from '../../game/deck';
import { SectionLabel, Badge, SmallButton, TextInput, TextArea } from './ui';

const ATTRIBUTE_LABELS: Record<Attribute, string> = { power: 'Power', insight: 'Insight', method: 'Method' };
const CLUE_STATUS_TONE: Record<ClueStatus, 'default' | 'amber' | 'gold' | 'red'> = {
  established: 'default', strengthened: 'amber', truth: 'gold', falseLead: 'red',
};

function CreateMysteryForm() {
  const createMystery = useMysteryStore((s) => s.createMystery);
  const [location, setLocation] = useState('');
  const [object, setObject] = useState('');
  const [treachery, setTreachery] = useState('');
  const [motivation, setMotivation] = useState('');

  const ready = location.trim() && object.trim() && treachery.trim();

  return (
    <div className="p-4 space-y-4">
      <div className="text-[11px] text-[#8b949e] leading-relaxed">
        "It happened at the <span className="text-[#e6edf3]">[location]</span>. That's where the{' '}
        <span className="text-[#e6edf3]">[object]</span> <span className="text-[#e6edf3]">[treachery]</span>."
      </div>
      <div>
        <SectionLabel>Location</SectionLabel>
        <TextInput value={location} onChange={(e) => setLocation(e.target.value)} placeholder="the lighthouse…" />
      </div>
      <div>
        <SectionLabel>Object</SectionLabel>
        <TextInput value={object} onChange={(e) => setObject(e.target.value)} placeholder="family…" />
      </div>
      <div>
        <SectionLabel>Treachery</SectionLabel>
        <TextInput value={treachery} onChange={(e) => setTreachery(e.target.value)} placeholder="transformed…" />
      </div>
      <div>
        <SectionLabel>Motivation</SectionLabel>
        <TextArea rows={2} value={motivation} onChange={(e) => setMotivation(e.target.value)} placeholder="Why does your investigator need the truth?" />
      </div>
      <button
        disabled={!ready}
        onClick={() => createMystery({ location: location.trim(), object: object.trim(), treachery: treachery.trim() }, motivation.trim())}
        className="w-full py-2 rounded border border-amber-400/40 text-amber-400 text-[12px] hover:bg-amber-400/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Begin the mystery — seal 3 truth cards
      </button>
    </div>
  );
}

function Clock({ marks }: { marks: number }) {
  return (
    <div className="flex gap-1">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={`w-5 h-5 rounded-full border ${i < marks ? 'bg-amber-400/30 border-amber-400/60' : 'border-[#30363d]'}`} />
      ))}
    </div>
  );
}

export function MysteryTab() {
  const m = useMysteryStore();
  const inv = useInvestigatorStore();
  const addNode = useGraphStore((s) => s.addNode);
  const addEdge = useGraphStore((s) => s.addEdge);

  const [testAttr, setTestAttr] = useState<Attribute>('insight');
  const [lastTest, setLastTest] = useState<(AttributeTestResult & { addedThreatId: string | null }) | null>(null);
  const [lastInvestigationRoll, setLastInvestigationRoll] = useState<InvestigationRollResult | null>(null);
  const [lastConsequence, setLastConsequence] = useState<ConsequenceRollResult | null>(null);
  const [jokerChoice, setJokerChoice] = useState<string[] | null>(null);
  const [truthDrawn, setTruthDrawn] = useState<string[] | null>(null);
  const [truthSceneClue, setTruthSceneClue] = useState('');
  const [obligationChoice, setObligationChoice] = useState('');
  const [newDayNotice, setNewDayNotice] = useState(false);
  const [restNotice, setRestNotice] = useState<number | null>(null);

  if (!m.started) return <CreateMysteryForm />;

  const clueSetList = Object.values(m.clueSets).sort((a, b) => a.rank.localeCompare(b.rank, undefined, { numeric: true }));
  const activeThreats = m.threats.filter((t) => !t.defeated);
  const truthCandidates = clueSetList.filter((cs) => cs.status !== 'truth' && cs.status !== 'falseLead');

  const handleDraw = () => {
    const result: ClueDrawResult = m.drawClueCard();
    if (result.kind === 'jokerChoice') setJokerChoice(result.candidateClueSetIds);
  };

  const handleAddClueToBoard = (rank: string) => {
    const cs = m.clueSets[rank];
    if (!cs) return;
    if (cs.boardNodeId) return;
    const node = addNode({
      label: `Clue ${rank}`,
      summary: cs.description,
      tags: [],
      hasContent: false,
      properties: {},
      nodeType: 'clue',
      clue: { rank, status: cs.status },
    });
    m.addClueToBoard(rank, node.id);
  };

  const handleCreateTruthNode = (rank: string) => {
    const cs = m.clueSets[rank];
    if (!cs) return;
    const truthNode = addNode({
      label: `Truth — Clue ${rank}`,
      summary: cs.description,
      tags: [],
      hasContent: false,
      properties: {},
      nodeType: 'truth',
      truth: { connection: cs.description },
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
      threat: { level: t.level, kind: t.kind, defeated: t.defeated },
    });
  };

  return (
    <div className="p-4 space-y-5">
      <div>
        <div className="text-[11px] text-[#8b949e] leading-relaxed">
          It happened at the <span className="text-[#e6edf3]">{m.problem.location}</span>. That's where the{' '}
          <span className="text-[#e6edf3]">{m.problem.object}</span> <span className="text-[#e6edf3]">{m.problem.treachery}</span>.
        </div>
        {m.motivation && <div className="text-[10px] text-[#484f58] mt-1 italic">{m.motivation}</div>}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <SectionLabel>Danger</SectionLabel>
          <div className="w-9 h-9 rounded border border-amber-400/40 rotate-45 flex items-center justify-center">
            <span className="text-[13px] font-mono text-amber-400 -rotate-45">{m.danger}</span>
          </div>
        </div>
        <div>
          <SectionLabel>Day {m.day}</SectionLabel>
          <Clock marks={m.clockMarks} />
        </div>
      </div>

      {newDayNotice && (
        <div className="px-2.5 py-1.5 rounded bg-amber-400/10 border border-amber-400/30 text-[11px] text-amber-400">
          A new day has begun — unattended obligations cost fatigue, strikes cleared.
        </div>
      )}

      {!m.scene.active ? (
        <div>
          <SectionLabel>Start a scene</SectionLabel>
          <div className="grid grid-cols-2 gap-1.5">
            <SmallButton onClick={() => { setLastInvestigationRoll(m.startInvestigationScene()); setNewDayNotice(false); }}>Investigation</SmallButton>
            <SmallButton onClick={() => setTruthSceneClue(truthCandidates[0]?.id ?? '')} disabled={truthCandidates.length === 0}>Truth</SmallButton>
            <SmallButton onClick={() => setObligationChoice(inv.obligations.find((o) => !o.struck)?.id ?? '')} disabled={inv.obligations.every((o) => o.struck) || inv.obligations.length === 0}>
              Obligation
            </SmallButton>
            <SmallButton onClick={() => setRestNotice(m.runRestScene())}>Rest</SmallButton>
          </div>
          {restNotice !== null && (
            <div className="mt-2 text-[11px] text-[#8b949e]">Cleared {restNotice} fatigue, strikes cleared, discarded a clue card.</div>
          )}
        </div>
      ) : (
        <div className="space-y-3 p-2.5 rounded border border-[#30363d] bg-[#0d1117]">
          <div className="flex items-center justify-between">
            <SectionLabel>Investigation scene</SectionLabel>
            <Badge tone="amber">{m.scene.stage}</Badge>
          </div>
          {lastInvestigationRoll && (
            <div className="text-[10px] text-[#484f58]">rolled {lastInvestigationRoll.roll} + danger {lastInvestigationRoll.danger} = {lastInvestigationRoll.total}</div>
          )}

          <div>
            <div className="text-[10px] text-[#8b949e] mb-1">Attribute test</div>
            <div className="flex gap-1 mb-1.5">
              {ATTRIBUTES.map((a) => (
                <button key={a} disabled={inv.struckAttributes.includes(a)}
                  onClick={() => setTestAttr(a)}
                  className={`flex-1 px-2 py-1 rounded border text-[10px] transition-colors disabled:opacity-30 ${testAttr === a ? 'border-amber-400/60 text-amber-400 bg-amber-400/10' : 'border-[#30363d] text-[#8b949e]'}`}>
                  {ATTRIBUTE_LABELS[a]} ({inv.attributes[a]})
                </button>
              ))}
            </div>
            <SmallButton onClick={() => setLastTest(m.runAttributeTest(testAttr))}>Roll test</SmallButton>
            {lastTest && (
              <div className="mt-1.5 text-[11px] space-y-1">
                <div className="text-[#e6edf3] font-mono">
                  {lastTest.roll.a}+{lastTest.roll.b}+{lastTest.attributeValue} = {lastTest.total} —{' '}
                  <span className={lastTest.outcome === 'success' ? 'text-green-400' : lastTest.outcome === 'cost' ? 'text-amber-400' : 'text-red-400'}>
                    {lastTest.outcome === 'success' ? 'Success' : lastTest.outcome === 'cost' ? 'Success at a cost' : 'Failure'}
                  </span>
                </div>
                {lastTest.randomEvent && <div className="text-[#8b949e]">Doubles — a random event occurs.</div>}
                {lastTest.belowDanger && <div className="text-[#8b949e]">Below danger — a level 1 threat appears, danger halved.</div>}
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {lastTest.outcome !== 'success' && (
                    <SmallButton onClick={() => setLastConsequence(m.applyConsequences(0))}>Suffer consequences</SmallButton>
                  )}
                  {(lastTest.outcome === 'success' || m.scene.stage === 'acquisition') && (
                    <SmallButton onClick={handleDraw}>Draw clue</SmallButton>
                  )}
                  <SmallButton onClick={() => m.advanceStage()}>Advance stage</SmallButton>
                </div>
                {lastConsequence && (
                  <div className="text-[#8b949e]">consequence roll {lastConsequence.roll}+{lastConsequence.bonus} = {lastConsequence.total} → {lastConsequence.outcome}</div>
                )}
              </div>
            )}
          </div>

          {activeThreats.length > 0 && (
            <div>
              <div className="text-[10px] text-[#8b949e] mb-1">Threats</div>
              <div className="space-y-1">
                {activeThreats.map((t) => (
                  <div key={t.id} className="flex items-center gap-1.5">
                    <span className="flex-1 text-[11px] text-[#e6edf3]">{t.name}</span>
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
            className="w-full py-1.5 rounded border border-[#30363d] text-[11px] text-[#8b949e] hover:text-[#e6edf3] transition-colors">
            End scene
          </button>
        </div>
      )}

      {truthSceneClue && (
        <div className="p-2.5 rounded border border-[#30363d] bg-[#0d1117] space-y-2">
          <SectionLabel>Truth scene</SectionLabel>
          <select value={truthSceneClue} onChange={(e) => setTruthSceneClue(e.target.value)}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-[11px] text-[#e6edf3]">
            {truthCandidates.map((cs) => <option key={cs.id} value={cs.id}>Clue {cs.rank} ({cs.cards.length} cards)</option>)}
          </select>
          <SmallButton onClick={() => {
            const drawn = m.runTruthScene(truthSceneClue);
            setTruthDrawn(drawn ? drawn.map(cardLabel) : null);
          }}>Rotate &amp; draw truth cards</SmallButton>
          {truthDrawn && (
            <div className="space-y-1.5">
              <div className="text-[11px] text-[#e6edf3]">Drawn: {truthDrawn.join(', ')} — describe what connection confirms this truth in the clue's description below.</div>
              <SmallButton onClick={() => handleCreateTruthNode(truthSceneClue)}>Create truth node</SmallButton>
            </div>
          )}
          <button onClick={() => { setTruthSceneClue(''); setTruthDrawn(null); }} className="text-[10px] text-[#484f58] hover:text-[#8b949e]">Close</button>
        </div>
      )}

      {obligationChoice && (
        <div className="p-2.5 rounded border border-[#30363d] bg-[#0d1117] space-y-2">
          <SectionLabel>Obligation scene</SectionLabel>
          <select value={obligationChoice} onChange={(e) => setObligationChoice(e.target.value)}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-[11px] text-[#e6edf3]">
            {inv.obligations.filter((o) => !o.struck).map((o) => <option key={o.id} value={o.id}>{o.text}</option>)}
          </select>
          <SmallButton onClick={() => { m.runObligationScene(obligationChoice); setObligationChoice(''); }}>Attend to it</SmallButton>
        </div>
      )}

      <div>
        <SectionLabel>Clue sets</SectionLabel>
        <div className="space-y-2">
          {clueSetList.length === 0 && <div className="text-[11px] text-[#3a3f47]">No clues yet</div>}
          {clueSetList.map((cs) => (
            <div key={cs.id} className="p-2 rounded border border-[#30363d] bg-[#0d1117]">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[11px] font-mono text-[#e6edf3]">Clue {cs.rank}</span>
                <Badge tone={CLUE_STATUS_TONE[cs.status]}>{cs.status}</Badge>
                <span className="text-[9px] text-[#484f58] ml-auto">{cs.cards.length} card{cs.cards.length === 1 ? '' : 's'}</span>
              </div>
              <TextArea rows={2} value={cs.description} placeholder="What is this clue?"
                onChange={(e) => m.setClueDescription(cs.rank, e.target.value)}
                className="text-[11px] mb-1.5" />
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
                <span className={`flex-1 ${t.defeated ? 'text-[#484f58] line-through' : 'text-[#e6edf3]'}`}>{t.name}</span>
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
