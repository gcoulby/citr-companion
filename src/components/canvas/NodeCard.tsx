import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Pencil, FileText, BookOpen, Paperclip, MapPin } from 'lucide-react'
import { clueCardsOf, type GraphNode } from '../../types'
import type { Suit } from '../../game/types'
import { NODE_TYPE_CONFIG } from '../../lib/nodeTypeConfig'
import { osmTileUrl, pinPercentInTile } from '../../lib/locationUtils'
import { PlayingCardView } from '../play/PlayingCard'
import { useMysteryStore } from '../../store/mysteryStore'

const THREAT_LEVEL_LABEL: Record<1 | 2 | 3, string> = {
  1: 'Level 1',
  2: 'Level 2',
  3: 'Level 3',
}

export interface NodeCardData extends Record<string, unknown> {
  node: GraphNode
  thumbnailUrl?: string
  dimmed?: boolean
  onEdit?: () => void
}

export const NodeCard = memo(({ data, selected }: NodeProps) => {
  const { node, thumbnailUrl, dimmed, onEdit } = data as NodeCardData
  const typeConfig = node.nodeType ? NODE_TYPE_CONFIG[node.nodeType] : null

  // Determine what to show as the card feature (top image area)
  const hasMap = Boolean(node.location)
  const showMap =
    hasMap && (node.featureDisplay === 'map' || (!thumbnailUrl && hasMap))
  const showImg = Boolean(thumbnailUrl) && !showMap

  const TILE_ZOOM = 14
  const tileUrl = showMap
    ? osmTileUrl(node.location!.lat, node.location!.lng, TILE_ZOOM)
    : null
  const pinPos = showMap
    ? pinPercentInTile(node.location!.lat, node.location!.lng, TILE_ZOOM)
    : null

  // A clue/truth's literal card is worth a glance, but it isn't a thumbnail —
  // it sits as a small badge next to the title instead of taking over the
  // image/map slot (which should stay reserved for the node's actual photo).
  // A clue set can be strengthened by more than one suit of the same rank —
  // read live from mysteryStore (the actual source of truth) rather than the
  // node's own bridged snapshot, which otherwise goes stale the moment the
  // clue set changes again without another "add to board" round-trip.
  const liveClueSet = useMysteryStore((s) =>
    node.clue ? s.clueSets[node.clue.rank] : undefined,
  )
  const clueCards = liveClueSet?.cards ?? clueCardsOf(node.clue)
  const featureCard = clueCards[clueCards.length - 1] ?? node.truth?.card
  const featureSuits = clueCards
    .map((c) => c.suit)
    .filter((s): s is Suit => s !== null)

  // Top 3 properties to preview on the card
  const previewProps = Object.entries(node.properties).slice(0, 3)

  const hasNotes = Boolean(node.notes?.trim())
  const hasDoc = node.hasContent
  const hasAttachments = (node.attachments?.length ?? 0) > 0
  const hasLocation = Boolean(node.location)

  const isTruth = node.nodeType === 'truth' || node.clue?.status === 'truth'
  const isFalseLead = node.clue?.status === 'falseLead'

  return (
    <div
      className={[
        'relative w-55 rounded border transition-all duration-150 group',
        selected
          ? 'border-primary bg-muted shadow-[0_0_0_2px_rgba(251,191,36,0.15)]'
          : isTruth
            ? 'border-yellow-300/50 bg-card hover:border-yellow-300/70'
            : 'border-border bg-card hover:border-muted-foreground/40',
        isFalseLead ? 'opacity-50' : '',
        dimmed ? 'opacity-20' : 'opacity-100',
      ].join(' ')}
    >
      {/* Drawing-pin handle — single port, bidirectional via ConnectionMode.Loose */}
      <Handle type="source" position={Position.Top} id="pin" />

      {/* Feature: map tile with pin */}
      {showMap && tileUrl && pinPos && (
        <div className="relative border-border border-b rounded-t w-full h-20 overflow-hidden">
          <img src={tileUrl} alt="" className="w-full h-full object-cover" />
          {/* Pin — positioned at the lat/lng within the tile */}
          <div
            className="absolute"
            style={{
              left: `${pinPos.px}%`,
              top: `${pinPos.py}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <MapPin
              size={14}
              className="drop-shadow-md text-red-500"
              fill="#ef4444"
            />
          </div>
        </div>
      )}

      {/* Feature: uploaded thumbnail image */}
      {showImg && (
        <div className="border-border border-b rounded-t w-full h-20 overflow-hidden">
          <img
            src={thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-3 pt-2">
        {/* Top row: type badge + label + clue/truth card badge + edit button */}
        <div className="flex items-start gap-1.5 mb-2 min-w-0">
          <span className="min-w-0 font-semibold text-[13px] text-foreground truncate leading-tight">
            {node.label}
          </span>
          {typeConfig && (
            <span
              className={`inline-flex items-center gap-1 px-1.5  rounded border text-[9px] font-mono shrink-0  ${typeConfig.color}`}
            >
              {typeConfig.icon}
              {typeConfig.label}
            </span>
          )}

          {onEdit && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-primary transition-opacity shrink-0"
            >
              <Pencil size={10} />
            </button>
          )}
        </div>
        {featureCard && (
          <div className="right-2 bottom-2 absolute">
            <PlayingCardView
              card={featureCard}
              suits={featureSuits}
              size="sm"
              className="shrink-0"
            />
          </div>
        )}
        {node.summary && (
          <div className="mb-1.5 text-[11px] text-muted-foreground line-clamp-2 leading-tight">
            {node.summary}
          </div>
        )}

        {node.clue && (
          <div
            className={`text-[9px] font-mono mb-1 ${isFalseLead ? 'text-red-400 line-through' : isTruth ? 'text-yellow-300' : 'text-muted-foreground/80'}`}
          >
            Clue {node.clue.rank} · {node.clue.status}
          </div>
        )}
        {node.truth && (
          <div className="mb-1 font-mono text-[9px] text-yellow-300">
            confirmed truth
          </div>
        )}
        {node.threat && (
          <div
            className={`text-[9px] font-mono mb-1 ${node.threat.defeated ? 'text-muted-foreground/70 line-through' : 'text-red-400'}`}
          >
            {node.threat.kind === 'rival' ? 'Rival' : 'Threat'} ·{' '}
            {THREAT_LEVEL_LABEL[node.threat.level]}
          </div>
        )}

        {/* Top 3 key-value properties */}
        {previewProps.length > 0 && (
          <div className="space-y-0.5 mt-1 mb-1.5">
            {previewProps.map(([k, v]) => (
              <div
                key={k}
                className="flex gap-1.5 font-mono text-[9px] leading-tight"
              >
                <span className="max-w-16 text-muted-foreground/70 truncate shrink-0">
                  {k}
                </span>
                <span className="text-muted-foreground/80 truncate">{v}</span>
              </div>
            ))}
          </div>
        )}

        {node.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {node.tags.slice(0, 3).map((tag: string) => (
              <span
                key={tag}
                className="bg-muted px-1.5 py-0.5 border border-border rounded text-[9px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
            {node.tags.length > 3 && (
              <span className="text-[9px] text-muted-foreground/70">
                +{node.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer indicators */}
        {(hasNotes || hasDoc || hasAttachments || hasLocation) && (
          <div className="flex items-center gap-2 mt-2 pt-1.5 border-border/60 border-t">
            {hasNotes && (
              <span title="Has notes" className="text-muted-foreground/70">
                <FileText size={9} />
              </span>
            )}
            {hasDoc && (
              <span title="Has document" className="text-primary/60">
                <BookOpen size={9} />
              </span>
            )}
            {hasAttachments && (
              <span
                title={`${node.attachments!.length} attachment${node.attachments!.length > 1 ? 's' : ''}`}
                className="text-muted-foreground/70"
              >
                <Paperclip size={9} />
              </span>
            )}
            {hasLocation && (
              <span
                title={
                  node.location!.label ??
                  `${node.location!.lat.toFixed(3)}, ${node.location!.lng.toFixed(3)}`
                }
                className="text-muted-foreground/70"
              >
                <MapPin size={9} />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

NodeCard.displayName = 'NodeCard'
