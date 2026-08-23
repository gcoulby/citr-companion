import { useCallback, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Search } from 'lucide-react';
import type { NodeLocation } from '../../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { resolveTileSource } from '../../lib/locationUtils';
import { useSettingsStore } from '../../store/settingsStore';

interface Props {
  initial?: NodeLocation;
  onConfirm: (loc: NodeLocation) => void;
  onClose: () => void;
}

// Custom round pin icon — avoids default-marker asset-resolution issues in Vite
function makePinIcon() {
  return L.divIcon({
    html: `<div style="width:14px;height:14px;background:#dc2626;border:2.5px solid #fff;border-radius:50%;box-shadow:0 1px 6px rgba(0,0,0,.55)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    className: '',
  });
}

type NominatimResult = { lat: string; lon: string; display_name: string };

export function LocationPickerDialog({ initial, onConfirm, onClose }: Props) {
  const mapRef    = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [location, setLocation] = useState<NodeLocation | null>(initial ?? null);
  const [search, setSearch]     = useState('');
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState('');

  // A callback ref (not an object ref + useEffect) so the map initialises
  // the moment the div actually attaches — Radix's Dialog content can
  // remount its children a couple of times while its open/animation state
  // settles, which raced a mount-effect approach and left the map div
  // permanently uninitialised (blank grey box, no tiles).
  const mapDivRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
      if (!el) return;

      const center: L.LatLngTuple = initial ? [initial.lat, initial.lng] : [20, 0];
      const zoom = initial ? 14 : 2;
      const map = L.map(el, { center, zoom });

      const { mapStyle, customMapUrl } = useSettingsStore.getState();
      const tileSource = resolveTileSource(mapStyle, customMapUrl);
      L.tileLayer(tileSource.urlTemplate, {
        attribution: tileSource.attribution,
        subdomains: tileSource.subdomains,
        detectRetina: true,
      }).addTo(map);

      // Place initial marker
      if (initial) {
        markerRef.current = L.marker([initial.lat, initial.lng], {
          icon: makePinIcon(),
          draggable: true,
        }).addTo(map);
        markerRef.current.on('dragend', () => {
          if (!markerRef.current) return;
          const { lat, lng } = markerRef.current.getLatLng();
          setLocation((prev) => ({ ...prev, lat, lng }));
        });
      }

      // Click to place / move marker
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        setLocation((prev) => ({ ...(prev ?? {}), lat, lng }));
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng], { icon: makePinIcon(), draggable: true }).addTo(map);
          markerRef.current.on('dragend', () => {
            if (!markerRef.current) return;
            const pos = markerRef.current.getLatLng();
            setLocation((prev) => ({ ...(prev ?? {}), lat: pos.lat, lng: pos.lng }));
          });
        }
      });

      mapRef.current = map;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleSearch = async () => {
    const q = search.trim();
    if (!q) return;
    setSearching(true);
    setSearchErr('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
        { headers: { 'Accept-Language': 'en' } },
      );
      const results = (await res.json()) as NominatimResult[];
      if (!results.length) { setSearchErr('No results'); return; }
      const { lat, lon, display_name } = results[0];
      const newLoc: NodeLocation = { lat: parseFloat(lat), lng: parseFloat(lon), label: display_name };
      setLocation(newLoc);
      if (mapRef.current) {
        mapRef.current.setView([newLoc.lat, newLoc.lng], 14);
        if (markerRef.current) {
          markerRef.current.setLatLng([newLoc.lat, newLoc.lng]);
        } else {
          markerRef.current = L.marker([newLoc.lat, newLoc.lng], {
            icon: makePinIcon(), draggable: true,
          }).addTo(mapRef.current);
          markerRef.current.on('dragend', () => {
            if (!markerRef.current) return;
            const pos = markerRef.current.getLatLng();
            setLocation((prev) => ({ ...(prev ?? {}), lat: pos.lat, lng: pos.lng }));
          });
        }
      }
    } catch {
      setSearchErr('Search failed — check network');
    } finally {
      setSearching(false);
    }
  };

  const clearLocation = () => {
    setLocation(null);
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-170 h-135 flex flex-col p-0 gap-0 overflow-hidden" showCloseButton={false}>
        <DialogHeader className="px-4 py-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground font-mono font-normal">
            <MapPin size={14} className="text-primary" /> Location Picker
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="flex gap-2 px-4 py-2.5 border-b border-border/60 shrink-0">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleSearch(); }}
            placeholder="Search for a place…"
            className="flex-1"
          />
          <Button variant="outline" size="sm" onClick={() => void handleSearch()} disabled={searching}>
            <Search size={12} />
            {searching ? 'Searching…' : 'Search'}
          </Button>
        </div>

        {searchErr && (
          <div className="px-4 py-1.5 text-xs text-destructive border-b border-border/60 shrink-0">{searchErr}</div>
        )}

        {/* Map — isolation: isolate keeps Leaflet's high z-index controls inside this stacking ctx */}
        <div className="flex-1 min-h-0" style={{ isolation: 'isolate' }}>
          <div ref={mapDivRef} className="w-full h-full" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border shrink-0 gap-4">
          <div className="flex-1 min-w-0">
            {location ? (
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono text-muted-foreground/80">
                  {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                </div>
                <Input
                  value={location.label ?? ''}
                  onChange={(e) => setLocation((prev) => prev ? { ...prev, label: e.target.value } : null)}
                  placeholder="Label (optional)"
                  className="h-7 text-xs"
                />
              </div>
            ) : (
              <span className="text-[11px] text-muted-foreground/70">Click the map to place a pin</span>
            )}
          </div>

          <div className="flex gap-2 shrink-0">
            {location && (
              <Button variant="destructive" size="sm" onClick={clearLocation}>Clear</Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={() => { if (location) onConfirm(location); }} disabled={!location}>
              Set Location
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
