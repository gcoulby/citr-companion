import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { useInvestigatorStore } from '../../store/investigatorStore';
import { ATTRIBUTES, type Attribute } from '../../game/types';
import { SectionLabel, Badge, SmallButton, TextInput } from './ui';

const ATTRIBUTE_LABELS: Record<Attribute, string> = { power: 'Power', insight: 'Insight', method: 'Method' };

export function InvestigatorTab() {
  const inv = useInvestigatorStore();
  const [newObligation, setNewObligation] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [newKeywordSignature, setNewKeywordSignature] = useState(false);

  return (
    <div className="p-4 space-y-5">
      <div>
        <SectionLabel>Name</SectionLabel>
        <TextInput value={inv.name} onChange={(e) => inv.setName(e.target.value)} placeholder="Investigator name…" />
      </div>

      <div>
        <SectionLabel>Trait</SectionLabel>
        <TextInput value={inv.trait} onChange={(e) => inv.setTrait(e.target.value)} placeholder="e.g. coldly pragmatic…" />
      </div>

      <div>
        <SectionLabel>Attributes</SectionLabel>
        <div className="space-y-1.5">
          {ATTRIBUTES.map((attr) => {
            const struck = inv.struckAttributes.includes(attr);
            return (
              <div key={attr} className="flex items-center gap-2">
                <button
                  onClick={() => inv.strikeAttribute(attr, !struck)}
                  title={struck ? 'Clear strike' : 'Strike (unusable until rest)'}
                  className={`flex-1 flex items-center justify-between px-2.5 py-1.5 rounded border text-[12px] transition-colors ${
                    struck ? 'border-red-400/30 text-red-400/60 line-through bg-red-400/5' : 'border-[#30363d] text-[#e6edf3]'
                  }`}
                >
                  {ATTRIBUTE_LABELS[attr]}
                </button>
                <div className="flex gap-1">
                  {[0, 1, 2].map((v) => (
                    <button
                      key={v}
                      onClick={() => inv.setAttribute(attr, v)}
                      className={`w-6 h-6 rounded border text-[11px] font-mono transition-colors ${
                        inv.attributes[attr] === v ? 'border-amber-400/60 text-amber-400 bg-amber-400/10' : 'border-[#30363d] text-[#484f58]'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <SectionLabel>Fatigue</SectionLabel>
          <span className="text-[10px] text-[#484f58] font-mono">{inv.fatigue}/5</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className={`w-6 h-6 rounded border ${i < inv.fatigue ? 'bg-red-400/20 border-red-400/50' : 'border-[#30363d]'}`} />
            ))}
          </div>
          <SmallButton onClick={() => inv.gainFatigue(1)}>+1</SmallButton>
          <SmallButton onClick={() => inv.clearFatigue(1)}>-1</SmallButton>
        </div>
      </div>

      <div>
        <SectionLabel>Obligations</SectionLabel>
        <div className="space-y-1 mb-2">
          {inv.obligations.map((o) => (
            <div key={o.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#0d1117] border border-[#30363d] group">
              <button
                onClick={() => inv.strikeObligation(o.id, !o.struck)}
                className={`flex-1 text-left text-[12px] transition-colors ${o.struck ? 'text-[#484f58] line-through' : 'text-[#e6edf3]'}`}
              >
                {o.text}
              </button>
              <button onClick={() => inv.removeObligation(o.id)} className="text-[#484f58] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={11} />
              </button>
            </div>
          ))}
          {inv.obligations.length === 0 && <div className="text-[11px] text-[#3a3f47]">No obligations yet</div>}
        </div>
        <div className="flex gap-1.5">
          <TextInput
            value={newObligation}
            placeholder="Add obligation and press Enter…"
            onChange={(e) => setNewObligation(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && newObligation.trim()) { inv.addObligation(newObligation.trim()); setNewObligation(''); } }}
          />
          <button onClick={() => { if (newObligation.trim()) { inv.addObligation(newObligation.trim()); setNewObligation(''); } }} className="text-amber-400 hover:text-amber-300 shrink-0"><Plus size={16} /></button>
        </div>
      </div>

      <div>
        <SectionLabel>Keywords</SectionLabel>
        <div className="space-y-1 mb-2">
          {inv.keywords.map((k) => (
            <div key={k.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#0d1117] border border-[#30363d] group">
              <span className={`flex-1 text-[12px] ${k.struck ? 'text-[#484f58] line-through' : 'text-[#e6edf3]'}`}>{k.text}</span>
              {k.signature && <Badge tone="amber">signature</Badge>}
              {!k.struck && <SmallButton onClick={() => inv.useKeyword(k.id)}>Use</SmallButton>}
              <button onClick={() => inv.removeKeyword(k.id)} className="text-[#484f58] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><X size={11} /></button>
            </div>
          ))}
          {inv.keywords.length === 0 && <div className="text-[11px] text-[#3a3f47]">No keywords yet</div>}
        </div>
        <div className="flex gap-1.5 items-center">
          <TextInput
            value={newKeyword}
            placeholder="Add keyword and press Enter…"
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && newKeyword.trim()) { inv.addKeyword(newKeyword.trim(), newKeywordSignature); setNewKeyword(''); setNewKeywordSignature(false); } }}
          />
          <label className="flex items-center gap-1 text-[10px] text-[#8b949e] shrink-0 whitespace-nowrap">
            <input type="checkbox" checked={newKeywordSignature} onChange={(e) => setNewKeywordSignature(e.target.checked)} />
            signature
          </label>
          <button onClick={() => { if (newKeyword.trim()) { inv.addKeyword(newKeyword.trim(), newKeywordSignature); setNewKeyword(''); setNewKeywordSignature(false); } }} className="text-amber-400 hover:text-amber-300 shrink-0"><Plus size={16} /></button>
        </div>
      </div>
    </div>
  );
}
