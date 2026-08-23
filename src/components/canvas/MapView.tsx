import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin } from 'lucide-react'
import { useGraphStore } from '../../store/graphStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useCaseSettingsStore } from '../../store/caseSettingsStore'
import { getCachedAsset } from '../../lib/assetCache'
import { resolveMapSource } from '../../lib/locationUtils'
import { NODE_TYPE_CONFIG } from '../../lib/nodeTypeConfig'
import type { GraphNode } from '../../types'
import './mapView.css'

interface Props {
  onSelectNode: (nodeId: string) => void
}

function makeNodePinIcon(color: string) {
  return L.divIcon({
    html: `<div style="width:16px;height:16px;background:${color};border:2.5px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 1px 6px rgba(0,0,0,.55)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 16],
    className: '',
  })
}

function buildTooltipContent(node: GraphNode): HTMLElement {
  const el = document.createElement('div')
  el.className = 'map-view-tooltip-card'

  const title = document.createElement('div')
  title.className = 'map-view-tooltip-title'
  title.textContent = node.label || 'Untitled'
  el.appendChild(title)

  if (node.nodeType) {
    const type = document.createElement('div')
    type.className = 'map-view-tooltip-type'
    type.textContent = NODE_TYPE_CONFIG[node.nodeType].label
    el.appendChild(type)
  }

  if (node.summary?.trim()) {
    const summary = document.createElement('div')
    summary.className = 'map-view-tooltip-summary'
    summary.textContent = node.summary.trim()
    el.appendChild(summary)
  }

  const hint = document.createElement('div')
  hint.className = 'map-view-tooltip-hint'
  hint.textContent = 'Click to open →'
  el.appendChild(hint)

  return el
}

export function MapView({ onSelectNode }: Props) {
  const mapRef = useRef<L.Map | null>(null)
  // Bumped whenever the Leaflet map instance is (re)created, so the marker
  // sync effect below — which reads mapRef.current, a plain ref — knows to
  // re-run instead of missing the map's initial mount.
  const [mapReadyTick, setMapReadyTick] = useState(0)
  const nodes = useGraphStore((s) => s.nodes)

  const mapStyle = useSettingsStore((s) => s.mapStyle)
  const customMapUrl = useSettingsStore((s) => s.customMapUrl)
  const mapImageAssetId = useCaseSettingsStore((s) => s.settings.mapImageAssetId)
  const mapImageWidth = useCaseSettingsStore((s) => s.settings.mapImageWidth)
  const mapImageHeight = useCaseSettingsStore((s) => s.settings.mapImageHeight)
  const mapImageUrl = mapImageAssetId ? getCachedAsset(mapImageAssetId) : undefined
  const mapSource = resolveMapSource(
    mapStyle,
    customMapUrl,
    mapImageUrl && mapImageWidth && mapImageHeight
      ? { url: mapImageUrl, width: mapImageWidth, height: mapImageHeight }
      : null,
  )

  const locatedNodes = useMemo(
    () => Object.values(nodes).filter((n): n is GraphNode & { location: NonNullable<GraphNode['location']> } => Boolean(n.location)),
    [nodes],
  )

  const mapDivRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      if (!el || !mapSource) return

      let map: L.Map
      const attributionPrefix = '<a href="https://leafletjs.com" title="A JavaScript library for interactive maps">Leaflet</a>'

      if (mapSource.kind === 'image') {
        const bounds = L.latLngBounds([0, 0], [mapSource.height, mapSource.width])
        // minZoom/maxZoom overridden up front — Leaflet's default minZoom
        // is 0, which would otherwise silently clamp getBoundsZoom() below
        // to 0 whenever the true fit zoom is negative (the normal case for
        // any image bigger than the map container).
        map = L.map(el, { crs: L.CRS.Simple, center: [0, 0], zoom: 0, maxBoundsViscosity: 1, minZoom: -10, maxZoom: 10 })
        L.imageOverlay(mapSource.url, bounds).addTo(map)
        map.setMaxBounds(bounds)
        requestAnimationFrame(() => {
          if (mapRef.current !== map) return
          map.invalidateSize()
          const minZoom = map.getBoundsZoom(bounds)
          map.setMinZoom(minZoom - 2)
          map.setMaxZoom(minZoom + 4)
          map.fitBounds(bounds)
        })
      } else {
        map = L.map(el, { center: [20, 0], zoom: 2 })
        L.tileLayer(mapSource.urlTemplate, {
          attribution: mapSource.attribution,
          subdomains: mapSource.subdomains,
          detectRetina: true,
        }).addTo(map)
      }
      map.attributionControl.setPrefix(attributionPrefix)

      mapRef.current = map
      setMapReadyTick((t) => t + 1)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mapSource?.kind === 'image' ? mapSource.url : mapSource?.kind],
  )

  // Re-place markers whenever the map (re)mounts or the located-node list
  // changes — cheap (a handful of nodes at most).
  const markersRef = useRef<L.Marker[]>([])
  useEffect(() => {
    const map = mapRef.current
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
    if (!map) return
    for (const node of locatedNodes) {
      const color = node.nodeType ? NODE_TYPE_CONFIG[node.nodeType].dot : '#f59e0b'
      const marker = L.marker([node.location.lat, node.location.lng], { icon: makeNodePinIcon(color) }).addTo(map)
      marker.bindTooltip(buildTooltipContent(node), { direction: 'top', offset: [0, -14], opacity: 1, className: 'map-view-tooltip' })
      marker.on('click', () => onSelectNode(node.id))
      markersRef.current.push(marker)
    }
    return () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
    }
  }, [mapReadyTick, locatedNodes, onSelectNode])

  return (
    <div className="relative flex-1 min-h-0" style={{ isolation: 'isolate' }}>
      {mapSource ? (
        <div ref={mapDivRef} className="w-full h-full" />
      ) : (
        <div className="flex flex-col justify-center items-center gap-1 px-6 w-full h-full text-muted-foreground text-center">
          <MapPin size={24} className="mb-1 text-muted-foreground/50" />
          <span className="text-[13px]">No map image set for this case yet.</span>
          <span className="text-muted-foreground/70 text-[12px]">Upload one in Settings → Map.</span>
        </div>
      )}
      {mapSource && locatedNodes.length === 0 && (
        <div className="top-3 left-1/2 z-500 absolute bg-card/95 shadow px-3 py-1.5 border border-border rounded text-[11px] text-muted-foreground -translate-x-1/2">
          No nodes have a location pin yet — add one from a node's side panel.
        </div>
      )}
    </div>
  )
}
