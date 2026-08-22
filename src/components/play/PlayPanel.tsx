import { useState } from 'react';
import { X } from 'lucide-react';
import { InvestigatorTab } from './InvestigatorTab';
import { MysteryTab } from './MysteryTab';
import { DiceTab } from './DiceTab';
import { ResolveTab } from './ResolveTab';

type Tab = 'investigator' | 'mystery' | 'dice' | 'resolve';

const TABS: { id: Tab; label: string }[] = [
  { id: 'investigator', label: 'Investigator' },
  { id: 'mystery', label: 'Mystery' },
  { id: 'dice', label: 'Dice & Oracles' },
  { id: 'resolve', label: 'Resolve' },
];

export function PlayPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('mystery');

  return (
    <div className="w-96 h-full bg-[#161b22] border-l border-[#30363d] flex flex-col overflow-hidden shrink-0">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#30363d] shrink-0">
        <span className="text-[10px] uppercase tracking-wider text-[#8b949e] font-mono">Play</span>
        <button onClick={onClose} className="text-[#8b949e] hover:text-[#e6edf3]"><X size={14} /></button>
      </div>

      <div className="flex border-b border-[#30363d] shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-[10px] uppercase tracking-wide font-mono transition-colors border-b-2 ${
              tab === t.id ? 'text-amber-400 border-amber-400' : 'text-[#8b949e] border-transparent hover:text-[#e6edf3]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'investigator' && <InvestigatorTab />}
        {tab === 'mystery' && <MysteryTab />}
        {tab === 'dice' && <DiceTab />}
        {tab === 'resolve' && <ResolveTab />}
      </div>
    </div>
  );
}
