/** Converts lat/lng + zoom to OSM tile x,y coordinates. */
export function latLngToTileXY(lat: number, lng: number, z: number): { x: number; y: number } {
  const n = Math.pow(2, z);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return { x, y };
}

export type MapStyle = 'dark' | 'light' | 'osm' | 'custom' | 'image';
export const MAP_STYLES: MapStyle[] = ['dark', 'light', 'osm', 'custom', 'image'];

export interface TileSource {
  kind: 'tile';
  urlTemplate: string;
  subdomains: string[];
  attribution: string;
}

// A single static image used as the map instead of a real-world tile
// server — for a fictional/game-world location that isn't a real GIS point.
// Rendered with Leaflet's CRS.Simple + imageOverlay; pin coordinates are
// pixel x/y within the image rather than lat/lng.
export interface ImageSource {
  kind: 'image';
  url: string;
  width: number;
  height: number;
}

export type MapSource = TileSource | ImageSource;

// Default is CartoDB's basemap rather than the standard openstreetmap.org
// tile server — the latter bakes a Ukraine-solidarity ribbon graphic into
// the rendered tiles themselves (not something CSS can hide), and CartoDB's
// dark style also matches the app's own theme better as a default.
const PRESETS: Record<'dark' | 'light' | 'osm', TileSource> = {
  dark: {
    kind: 'tile',
    urlTemplate: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
  },
  light: {
    kind: 'tile',
    urlTemplate: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
  },
  osm: {
    kind: 'tile',
    urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
};

/** Resolves the tile-based sources only (dark/light/osm/custom) — used where an image map wouldn't make sense (e.g. the Nominatim place search). */
export function resolveTileSource(style: Exclude<MapStyle, 'image'>, customUrl: string): TileSource {
  if (style === 'custom' && customUrl.trim()) {
    return { kind: 'tile', urlTemplate: customUrl.trim(), subdomains: ['a', 'b', 'c'], attribution: 'Custom map source' };
  }
  return PRESETS[style === 'custom' ? 'dark' : style];
}

/** Resolves any map style, including 'image' — returns null for 'image' when no image has been uploaded for this case yet. */
export function resolveMapSource(
  style: MapStyle,
  customUrl: string,
  image: { url: string; width: number; height: number } | null,
): MapSource | null {
  if (style === 'image') return image ? { kind: 'image', ...image } : null;
  return resolveTileSource(style, customUrl);
}

function tileUrlFor(source: TileSource, z: number, x: number, y: number): string {
  const s = source.subdomains[(x + y) % source.subdomains.length];
  return source.urlTemplate
    .replace('{s}', s)
    .replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y))
    .replace('{r}', '');
}

/** Returns a single map tile's image URL for a given lat/lng at a given zoom level. */
export function mapTileUrl(lat: number, lng: number, z: number, source: TileSource): string {
  const { x, y } = latLngToTileXY(lat, lng, z);
  return tileUrlFor(source, z, x, y);
}

/**
 * Returns the position of a lat/lng pin within its tile image, as a percentage
 * (0–100) from the top-left of the tile. Use for CSS `left`/`top` on the pin overlay.
 */
export function pinPercentInTile(
  lat: number,
  lng: number,
  z: number,
): { px: number; py: number } {
  const n = Math.pow(2, z);
  const latRad = (lat * Math.PI) / 180;
  const tileX = ((lng + 180) / 360) * n;
  const tileY = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return {
    px: (tileX - Math.floor(tileX)) * 100,
    py: (tileY - Math.floor(tileY)) * 100,
  };
}

/**
 * Returns a pin's position within a single-image map, as a percentage (0–100)
 * from the top-left of the image. Node locations on an image map store pixel
 * coordinates as `{ lat: y, lng: x }`, matching Leaflet's CRS.Simple marker
 * convention of `L.marker([y, x])` against an image-space bounds box.
 */
export function pinPercentInImage(lat: number, lng: number, source: ImageSource): { px: number; py: number } {
  return {
    px: (lng / source.width) * 100,
    py: (lat / source.height) * 100,
  };
}
