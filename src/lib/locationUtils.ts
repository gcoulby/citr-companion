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

export type MapStyle = 'dark' | 'light' | 'osm' | 'custom';
export const MAP_STYLES: MapStyle[] = ['dark', 'light', 'osm', 'custom'];

export interface TileSource {
  urlTemplate: string;
  subdomains: string[];
  attribution: string;
}

// Default is CartoDB's basemap rather than the standard openstreetmap.org
// tile server — the latter bakes a Ukraine-solidarity ribbon graphic into
// the rendered tiles themselves (not something CSS can hide), and CartoDB's
// dark style also matches the app's own theme better as a default.
const PRESETS: Record<Exclude<MapStyle, 'custom'>, TileSource> = {
  dark: {
    urlTemplate: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
  },
  light: {
    urlTemplate: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
  },
  osm: {
    urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
};

export function resolveTileSource(style: MapStyle, customUrl: string): TileSource {
  if (style === 'custom' && customUrl.trim()) {
    return { urlTemplate: customUrl.trim(), subdomains: ['a', 'b', 'c'], attribution: 'Custom map source' };
  }
  return PRESETS[style === 'custom' ? 'dark' : style];
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
