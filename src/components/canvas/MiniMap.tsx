import { useCallback, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { NodeLocation } from '../../types'
import type { MapSource } from '../../lib/locationUtils'

interface Props {
  location: NodeLocation
  mapSource: MapSource
  className?: string
}

function makePinIcon() {
  return L.divIcon({
    html: `<div style="width:14px;height:14px;background:#dc2626;border:2.5px solid #fff;border-radius:50%;box-shadow:0 1px 6px rgba(0,0,0,.55)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    className: '',
  })
}

// A tiny, fully non-interactive Leaflet map used for the node-card/panel map
// previews. Earlier this was hand-rolled with CSS background-position math
// to fake a "zoomed crop centered on the pin" — Leaflet itself already does
// that math correctly (it's a real map), so it's both simpler and immune to
// the aspect-ratio/object-fit mismatches that kept putting the pin in the
// wrong spot.
export function MiniMap({ location, mapSource, className }: Props) {
  const mapRef = useRef<L.Map | null>(null)

  const mapDivRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      if (!el) return

      const commonOpts: L.MapOptions = {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        // This map gets torn down and recreated on every zoomOffset/location
        // change (a fresh instance per ref-callback invocation) — with
        // animations on, a rapid sequence of changes (e.g. mashing the
        // preview-zoom buttons) can call setView while the previous
        // instance's pan/zoom CSS transition is still resolving, and
        // Leaflet's internal position bookkeeping throws on the half-torn-
        // down map. Not worth animating a static, non-interactive preview.
        zoomAnimation: false,
        markerZoomAnimation: false,
        fadeAnimation: false,
      }

      let map: L.Map
      if (mapSource.kind === 'image') {
        const bounds = L.latLngBounds(
          [0, 0],
          [mapSource.height, mapSource.width],
        )
        map = L.map(el, {
          ...commonOpts,
          crs: L.CRS.Simple,
          center: [location.lat, location.lng],
          zoom: 0,
          // Leaflet's default minZoom is 0 — without overriding it here,
          // getBoundsZoom() below silently clamps its result up to 0
          // whenever the true "whole image fits" zoom is negative (i.e.
          // whenever the image is bigger than this tiny preview box, which
          // is the normal case), making it look like the fit computation
          // always returns "already at native resolution".
          minZoom: -10,
          maxZoom: 10,
        })
        L.imageOverlay(mapSource.url, bounds).addTo(map)
        // Container size isn't settled the instant this ref fires (same
        // issue as the full location picker) — defer the zoom calculation
        // by a frame so it isn't measured against a stale/tiny size.
        requestAnimationFrame(() => {
          if (mapRef.current !== map) return
          map.invalidateSize()
          const fitZoom = map.getBoundsZoom(bounds)
          // Default to "whole image fits" — location.zoomOffset lets a node
          // ask for a tighter crop, but past the image's own zoom-0 native
          // resolution CRS.Simple has nothing left to draw but an upscaled
          // version of the same raster image, which the browser smooths/
          // blurs (devastating for fine-lined hand-drawn maps), so the cap
          // always holds regardless of the requested offset.
          map.setView(
            [location.lat, location.lng],
            Math.min(fitZoom + (location.zoomOffset ?? 0), 0),
          )
        })
      } else {
        map = L.map(el, {
          ...commonOpts,
          center: [location.lat, location.lng],
          zoom: 14 + (location.zoomOffset ?? 0),
        })
        L.tileLayer(mapSource.urlTemplate, {
          subdomains: mapSource.subdomains,
          detectRetina: true,
        }).addTo(map)
      }
      L.marker([location.lat, location.lng], {
        icon: makePinIcon(),
        interactive: false,
      }).addTo(map)

      mapRef.current = map
    },
    [location.lat, location.lng, location.zoomOffset, mapSource],
  )

  return <div ref={mapDivRef} className={className} />
}
