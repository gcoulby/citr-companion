import { useState } from 'react'
import {
  Shield,
  Plus,
  ChevronDown,
  ChevronRight,
  Circle,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { useGraphStore } from '../../store/graphStore'
import { useFileStore } from '../../store/fileStore'
import { useMysteryStore } from '../../store/mysteryStore'
import { getAllTags } from '../../graph/graphOps'
import { NODE_TYPE_CONFIG, ALL_NODE_TYPES } from '../../lib/nodeTypeConfig'
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '../ui/sidebar'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '../ui/collapsible'
import { Button } from '../ui/button'
import type { NodeType } from '../../types'

interface Props {
  activeTag: string | null
  onTagClick: (tag: string | null) => void
  activeType: NodeType | null
  onTypeClick: (type: NodeType | null) => void
  onFocusNode: (nodeId: string) => void
  onAddNode: () => void
  selectedNodeId: string | null
}

function SectionCollapsible({
  label,
  count,
  defaultOpen,
  children,
}: {
  label: string
  count: number
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen ?? true)
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SidebarGroup className="py-0">
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel className="cursor-pointer">
            <span className="flex-1">
              {label} ({count})
            </span>
            {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>{children}</SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}

export function SidebarPanel({
  activeTag,
  onTagClick,
  activeType,
  onTypeClick,
  onFocusNode,
  onAddNode,
  selectedNodeId,
}: Props) {
  const nodes = useGraphStore((s) => s.nodes)
  const edges = useGraphStore((s) => s.edges)
  const manifest = useFileStore((s) => s.manifest)
  const mysteryStarted = useMysteryStore((s) => s.started)
  const clueDeckLeft = useMysteryStore((s) => s.clueDeck.length)
  const truthDeckLeft = useMysteryStore((s) => s.truthDeck.length)
  const allTags = getAllTags(nodes)
  // Starts collapsed to an icon rail on phone-width screens — there isn't
  // room to permanently dock a 220px list — but a manual toggle afterward
  // isn't fought (this only reads the width once, on mount).
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 768)

  const allNodeValues = Object.values(nodes)

  // Active types that actually exist in the case
  const usedTypes = ALL_NODE_TYPES.filter((t) =>
    allNodeValues.some((n) => n.nodeType === t),
  )

  // Apply both filters when listing nodes
  const visibleNodes = allNodeValues
    .filter(
      (n) =>
        (!activeType || n.nodeType === activeType) &&
        (!activeTag || n.tags.includes(activeTag)),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  const hasActiveFilter = activeType || activeTag

  if (collapsed) {
    return (
      <Sidebar
        collapsible="none"
        className="border-border border-r w-12 h-full shrink-0"
      >
        <SidebarHeader className="items-center px-0 py-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setCollapsed(false)}
            title="Expand sidebar"
          >
            <PanelLeftOpen size={14} />
          </Button>
        </SidebarHeader>
      </Sidebar>
    )
  }

  return (
    <Sidebar
      collapsible="none"
      className="border-border border-r w-55 h-full shrink-0"
    >
      {/* Case header */}
      <SidebarHeader className="gap-1 px-4 py-3.5 border-border border-b">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield size={12} className="text-primary" />
            <span className="font-mono text-[10px] text-primary uppercase tracking-wider">
              Case
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setCollapsed(true)}
            title="Collapse sidebar"
          >
            <PanelLeftClose size={12} />
          </Button>
        </div>
        <div className="font-semibold text-foreground text-sm truncate leading-tight">
          {manifest?.title ?? 'Untitled'}
        </div>
        <div className="flex gap-3 font-mono text-[10px] text-muted-foreground/70">
          <span>{allNodeValues.length} nodes</span>
          <span>{Object.keys(edges).length} edges</span>
        </div>
        {mysteryStarted && (
          <div
            className="flex gap-3 font-mono text-[10px] text-muted-foreground/50"
            title="Cards remaining, unseen"
          >
            <span>{clueDeckLeft} clues left</span>
            <span>{truthDeckLeft} truths left</span>
          </div>
        )}
        {manifest?.created && (
          <div className="font-mono text-[10px] text-muted-foreground/40">
            {new Date(manifest.created).toLocaleDateString()}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* Active filter pill */}
        {hasActiveFilter && (
          <div className="px-3 pt-2">
            <button
              onClick={() => {
                onTypeClick(null)
                onTagClick(null)
              }}
              className="flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 px-2 py-1 border border-primary/30 rounded w-full text-[10px] text-primary transition-colors"
            >
              <span className="flex-1 text-left truncate">
                {activeType && NODE_TYPE_CONFIG[activeType].label}
                {activeType && activeTag && ' · '}
                {activeTag && `#${activeTag}`}
              </span>
              <span>✕</span>
            </button>
          </div>
        )}

        {/* Node list */}
        <SectionCollapsible label="Nodes" count={visibleNodes.length}>
          <SidebarMenu>
            {visibleNodes.length === 0 && (
              <div className="px-4 py-1 text-[11px] text-muted-foreground/40">
                {hasActiveFilter ? 'No matches' : 'No nodes yet'}
              </div>
            )}
            {visibleNodes.map((node) => {
              const typeCfg = node.nodeType
                ? NODE_TYPE_CONFIG[node.nodeType]
                : null
              return (
                <SidebarMenuItem key={node.id}>
                  <SidebarMenuButton
                    isActive={selectedNodeId === node.id}
                    onClick={() => onFocusNode(node.id)}
                    className="py-1.5 h-auto"
                  >
                    <div
                      className="rounded-full w-1.5 h-1.5 shrink-0"
                      style={{ backgroundColor: typeCfg?.dot ?? '#484f58' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[12px] truncate leading-tight">
                        {node.label}
                      </div>
                      {node.nodeType && (
                        <div className="font-mono text-[9px] text-muted-foreground/70 group-hover/menu-button:text-sidebar-accent-foreground group-data-active/menu-button:text-sidebar-accent-foreground">
                          {NODE_TYPE_CONFIG[node.nodeType].label}
                        </div>
                      )}
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={onAddNode}
                className="text-muted-foreground/70 hover:text-sidebar-accent-foreground"
              >
                <Plus size={10} />
                Add node
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SectionCollapsible>

        {/* Type filter */}
        {usedTypes.length > 0 && (
          <SectionCollapsible label="Types" count={usedTypes.length}>
            <SidebarMenu>
              {usedTypes.map((type) => {
                const cfg = NODE_TYPE_CONFIG[type]
                const count = allNodeValues.filter(
                  (n) => n.nodeType === type,
                ).length
                return (
                  <SidebarMenuItem key={type}>
                    <SidebarMenuButton
                      isActive={activeType === type}
                      onClick={() =>
                        onTypeClick(activeType === type ? null : type)
                      }
                    >
                      <span style={{ color: cfg.dot }}>{cfg.icon}</span>
                      <span className="flex-1">{cfg.label}</span>
                      <span className="text-[10px] text-muted-foreground/40 group-hover/menu-button:text-sidebar-accent-foreground group-data-active/menu-button:text-sidebar-accent-foreground">
                        {count}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SectionCollapsible>
        )}

        {/* Tag filter */}
        {allTags.length > 0 && (
          <SectionCollapsible
            label="Tags"
            count={allTags.length}
            defaultOpen={false}
          >
            <SidebarMenu>
              {allTags.map((tag) => {
                const count = allNodeValues.filter((n) =>
                  n.tags.includes(tag),
                ).length
                return (
                  <SidebarMenuItem key={tag}>
                    <SidebarMenuButton
                      isActive={activeTag === tag}
                      onClick={() => onTagClick(activeTag === tag ? null : tag)}
                    >
                      <Circle size={6} className="fill-current" />
                      <span className="flex-1">{tag}</span>
                      <span className="text-[10px] text-muted-foreground/40 group-hover/menu-button:text-sidebar-accent-foreground group-data-active/menu-button:text-sidebar-accent-foreground">
                        {count}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SectionCollapsible>
        )}
      </SidebarContent>
    </Sidebar>
  )
}
