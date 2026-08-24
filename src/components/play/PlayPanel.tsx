import { X } from 'lucide-react'
import { InvestigatorTab } from './InvestigatorTab'
import { MysteryTab } from './MysteryTab'
import { DiceTab } from './DiceTab'
import { ResolveTab } from './ResolveTab'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import { Button } from '../ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useIsMobile } from '../../hooks/use-mobile'

const TABS = [
  { id: 'investigator', label: 'Investigator' },
  { id: 'mystery', label: 'Mystery' },
  { id: 'dice', label: 'Dice & Oracles' },
  { id: 'resolve', label: 'Resolve' },
] as const

export type TabId = (typeof TABS)[number]['id']

interface Props {
  onClose: () => void
  onSelectNode?: (nodeId: string) => void
  initialTab?: TabId
}

export function PlayPanel({ onClose, onSelectNode, initialTab = 'mystery' }: Props) {
  const isMobile = useIsMobile()
  return (
    <div
      className={
        isMobile
          ? 'fixed inset-0 z-50 flex flex-col bg-card w-full h-full overflow-hidden'
          : 'flex flex-col bg-card border-border border-l w-96 h-full overflow-hidden shrink-0'
      }
    >
      <div className="flex justify-between items-center px-4 py-2.5 border-border border-b shrink-0">
        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
          Play
        </span>
        <Button variant="ghost" size="icon-xs" onClick={onClose}>
          <X size={14} />
        </Button>
      </div>

      <Tabs defaultValue={initialTab} className="flex-1 gap-0 min-h-0">
        <TabsList
          variant="line"
          className="justify-stretch p-0 border-border border-b rounded-none w-full h-auto shrink-0"
        >
          {TABS.map((t) => (
            <TabsTrigger
              key={t.id}
              value={t.id}
              className="after:bottom-0! flex-1 py-2 rounded-none font-mono text-[10px] uppercase tracking-wide"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="max-h-[85dvh]">
            <TabsContent value="investigator">
              <InvestigatorTab />
            </TabsContent>
            <TabsContent value="mystery">
              <MysteryTab onSelectNode={onSelectNode} />
            </TabsContent>
            <TabsContent value="dice">
              <DiceTab />
            </TabsContent>
            <TabsContent value="resolve">
              <ResolveTab />
            </TabsContent>
          </ScrollArea>
        </div>
      </Tabs>
    </div>
  )
}
