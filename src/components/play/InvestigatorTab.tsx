import { useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { Plus, Trash2, X, ImagePlus, Dices } from 'lucide-react';
import { useInvestigatorStore } from '../../store/investigatorStore';
import { useSettingsStore } from '../../store/settingsStore';
import { ATTRIBUTES, type Attribute } from '../../game/types';
import { assetMap } from '../../hooks/useAutoSave';
import { cacheAsset, getCachedAsset } from '../../lib/assetCache';
import { rollOracleTable, FIRST_NAME_TABLE, LAST_NAME_TABLE, TRAIT_TABLE } from '../../game/oracles';
import { GENRE_TABLES } from '../../game/genreTables';
import { SectionLabel, Badge, SmallButton, TextInput } from './ui';

const ATTRIBUTE_LABELS: Record<Attribute, string> = { power: 'Power', insight: 'Insight', method: 'Method' };

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

export function InvestigatorTab() {
  const inv = useInvestigatorStore();
  const genre = useSettingsStore((s) => s.genre);
  const genreTables = GENRE_TABLES[genre];
  const [newObligation, setNewObligation] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [newKeywordSignature, setNewKeywordSignature] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const portraitInputRef = useRef<HTMLInputElement>(null);
  const portraitUrl = inv.portrait ? getCachedAsset(inv.portrait) : undefined;

  const uploadPortrait = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const ext = file.name.split('.').pop() ?? 'jpg';
    const assetId = `${nanoid()}.${ext}`;
    const buffer = await file.arrayBuffer();
    assetMap.set(assetId, buffer);
    cacheAsset(assetId, buffer, file.type);
    inv.setPortrait(assetId);
  };

  return (
    <div className="p-4 space-y-5">
      <div>
        <SectionLabel>Portrait</SectionLabel>
        {portraitUrl ? (
          <div className="relative group w-20 h-20 rounded-full overflow-hidden border border-border">
            <img src={portraitUrl} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
              <button onClick={() => portraitInputRef.current?.click()} title="Replace" className="text-foreground hover:text-primary"><ImagePlus size={13} /></button>
              <button onClick={() => inv.setPortrait(undefined)} title="Remove" className="text-red-400 hover:text-red-300"><X size={13} /></button>
            </div>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) void uploadPortrait(f); }}
            onClick={() => portraitInputRef.current?.click()}
            className={[
              'flex items-center justify-center w-20 h-20 rounded-full border border-dashed cursor-pointer transition-colors',
              dragOver ? 'border-primary/60 bg-primary/5 text-primary' : 'border-border text-muted-foreground/70 hover:border-muted-foreground/40 hover:text-muted-foreground',
            ].join(' ')}
          >
            <ImagePlus size={18} />
          </div>
        )}
        <input ref={portraitInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadPortrait(f); }} />
      </div>

      <div>
        <RollLabel onRoll={() => inv.setName(`${rollOracleTable(FIRST_NAME_TABLE).result} ${rollOracleTable(LAST_NAME_TABLE).result}`)}>Name</RollLabel>
        <TextInput value={inv.name} onChange={(e) => inv.setName(e.target.value)} placeholder="Investigator name…" />
      </div>

      <div>
        <RollLabel onRoll={() => inv.setTrait(rollOracleTable(TRAIT_TABLE).result)}>Trait</RollLabel>
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
                    struck ? 'border-red-400/30 text-red-400/60 line-through bg-red-400/5' : 'border-border text-foreground'
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
                        inv.attributes[attr] === v ? 'border-primary/60 text-primary bg-primary/10' : 'border-border text-muted-foreground/70'
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
          <span className="text-[10px] text-muted-foreground/70 font-mono">{inv.fatigue}/5</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className={`w-6 h-6 rounded border ${i < inv.fatigue ? 'bg-red-400/20 border-red-400/50' : 'border-border'}`} />
            ))}
          </div>
          <SmallButton onClick={() => inv.gainFatigue(1)}>+1</SmallButton>
          <SmallButton onClick={() => inv.clearFatigue(1)}>-1</SmallButton>
        </div>
      </div>

      <div>
        <RollLabel onRoll={() => setNewObligation(rollOracleTable(genreTables.obligations).result)}>Obligations</RollLabel>
        <div className="space-y-1 mb-2">
          {inv.obligations.map((o) => (
            <div key={o.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-background border border-border group">
              <button
                onClick={() => inv.strikeObligation(o.id, !o.struck)}
                className={`flex-1 text-left text-[12px] transition-colors ${o.struck ? 'text-muted-foreground/70 line-through' : 'text-foreground'}`}
              >
                {o.text}
              </button>
              <button onClick={() => inv.removeObligation(o.id)} className="text-muted-foreground/70 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={11} />
              </button>
            </div>
          ))}
          {inv.obligations.length === 0 && <div className="text-[11px] text-muted-foreground/40">No obligations yet</div>}
        </div>
        <div className="flex gap-1.5">
          <TextInput
            value={newObligation}
            placeholder="Add obligation and press Enter…"
            onChange={(e) => setNewObligation(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && newObligation.trim()) { inv.addObligation(newObligation.trim()); setNewObligation(''); } }}
          />
          <button onClick={() => { if (newObligation.trim()) { inv.addObligation(newObligation.trim()); setNewObligation(''); } }} className="text-primary hover:text-primary shrink-0"><Plus size={16} /></button>
        </div>
      </div>

      <div>
        <RollLabel onRoll={() => setNewKeyword(rollOracleTable(genreTables.keywords).result)}>Keywords</RollLabel>
        <div className="space-y-1 mb-2">
          {inv.keywords.map((k) => (
            <div key={k.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-background border border-border group">
              <span className={`flex-1 text-[12px] ${k.struck ? 'text-muted-foreground/70 line-through' : 'text-foreground'}`}>{k.text}</span>
              {k.signature && <Badge tone="amber">signature</Badge>}
              {!k.struck && <SmallButton onClick={() => inv.useKeyword(k.id)}>Use</SmallButton>}
              <button onClick={() => inv.removeKeyword(k.id)} className="text-muted-foreground/70 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><X size={11} /></button>
            </div>
          ))}
          {inv.keywords.length === 0 && <div className="text-[11px] text-muted-foreground/40">No keywords yet</div>}
        </div>
        <div className="flex gap-1.5 items-center">
          <TextInput
            value={newKeyword}
            placeholder="Add keyword and press Enter…"
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && newKeyword.trim()) { inv.addKeyword(newKeyword.trim(), newKeywordSignature); setNewKeyword(''); setNewKeywordSignature(false); } }}
          />
          <label className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
            <input type="checkbox" checked={newKeywordSignature} onChange={(e) => setNewKeywordSignature(e.target.checked)} />
            signature
          </label>
          <button onClick={() => { if (newKeyword.trim()) { inv.addKeyword(newKeyword.trim(), newKeywordSignature); setNewKeyword(''); setNewKeywordSignature(false); } }} className="text-primary hover:text-primary shrink-0"><Plus size={16} /></button>
        </div>
      </div>
    </div>
  );
}
