import { X } from 'lucide-react';
import { InvestigatorTab } from './InvestigatorTab';
import { MysteryTab } from './MysteryTab';
import { DiceTab } from './DiceTab';
import { ResolveTab } from './ResolveTab';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Button } from '../ui/button';

const TABS = [
  { id: 'investigator', label: 'Investigator' },
  { id: 'mystery', label: 'Mystery' },
  { id: 'dice', label: 'Dice & Oracles' },
  { id: 'resolve', label: 'Resolve' },
] as const;

export function PlayPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="w-96 h-full bg-card border-l border-border flex flex-col overflow-hidden shrink-0">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Play</span>
        <Button variant="ghost" size="icon-xs" onClick={onClose}><X size={14} /></Button>
      </div>

      <Tabs defaultValue="mystery" className="flex-1 min-h-0 gap-0">
        <TabsList variant="line" className="w-full h-auto p-0 border-b border-border shrink-0 rounded-none justify-stretch">
          {TABS.map((t) => (
            <TabsTrigger
              key={t.id}
              value={t.id}
              className="flex-1 rounded-none py-2 text-[10px] uppercase tracking-wide font-mono after:bottom-0!"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="investigator"><InvestigatorTab /></TabsContent>
          <TabsContent value="mystery"><MysteryTab /></TabsContent>
          <TabsContent value="dice"><DiceTab /></TabsContent>
          <TabsContent value="resolve"><ResolveTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
