import JSZip from 'jszip';
import type { GraphNode, GraphEdge, NodeId, EdgeId, CaseManifest, CaseSettings, PdfEmbed } from '../types';
import type { Investigator, Mystery } from '../game/types';
import { obfuscate } from '../lib/obfuscate';

interface WriteOptions {
  manifest: CaseManifest;
  nodes: Record<NodeId, GraphNode>;
  edges: Record<EdgeId, GraphEdge>;
  positions: Record<NodeId, { x: number; y: number }>;
  viewport: { x: number; y: number; zoom: number };
  layout: 'freeform' | 'dagre' | 'force';
  investigator: Investigator;
  mystery: Mystery;
  existingFile?: File | Blob | null;
  contentDirty?: Set<NodeId>;
  contentMap?: Map<NodeId, unknown>;
  assetMap?: Map<string, ArrayBuffer>;
  settings?: CaseSettings;
  pdfEmbeds?: PdfEmbed[];
}

export async function writeCitr(opts: WriteOptions): Promise<Blob> {
  let zip = new JSZip();

  // If there's an existing file, load it first to preserve assets and content blobs
  if (opts.existingFile) {
    try {
      zip = await JSZip.loadAsync(opts.existingFile);
    } catch {
      zip = new JSZip();
    }
  }

  // Update manifest with modified timestamp
  const manifest = { ...opts.manifest, modified: new Date().toISOString() };
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // Write graph
  const graph = {
    nodes: Object.values(opts.nodes),
    edges: Object.values(opts.edges),
  };
  zip.file('graph.json', JSON.stringify(graph, null, 2));

  // Write canvas
  const canvas = {
    positions: opts.positions,
    viewport: opts.viewport,
    layout: opts.layout,
  };
  zip.file('canvas.json', JSON.stringify(canvas, null, 2));

  if (opts.settings !== undefined) {
    zip.file('settings.json', JSON.stringify(opts.settings, null, 2));
  }

  if (opts.pdfEmbeds !== undefined) {
    zip.file('pdfs.json', JSON.stringify(opts.pdfEmbeds, null, 2));
  }

  // Write the investigator sheet
  zip.file('investigator.json', JSON.stringify(opts.investigator, null, 2));

  // Split mystery state: everything narrative/mechanical goes in mystery.json,
  // while the decks — including the 3 sealed truth cards — go in decks.json,
  // lightly obfuscated so they aren't plaintext when browsing the archive.
  const { clueDeck, clueDiscard, truthDeck, truthDiscard, sealed, revealed, ...mysteryRest } = opts.mystery;
  zip.file('mystery.json', JSON.stringify(mysteryRest, null, 2));
  zip.file('decks.json', obfuscate({ clueDeck, clueDiscard, truthDeck, truthDiscard, sealed, revealed }));

  // Write dirty content blobs
  if (opts.contentDirty && opts.contentMap) {
    for (const nodeId of opts.contentDirty) {
      const content = opts.contentMap.get(nodeId);
      if (content !== undefined) {
        zip.file(`content/${nodeId}.json`, JSON.stringify(content, null, 2));
      }
    }
  }

  // Write assets — purge existing entries first so deletions take effect
  if (opts.assetMap) {
    Object.keys(zip.files)
      .filter((p) => p.startsWith('assets/'))
      .forEach((p) => zip.remove(p));
    for (const [assetId, buffer] of opts.assetMap) {
      zip.file(`assets/${assetId}`, buffer);
    }
  }

  // mimeType: without this, JSZip defaults the blob to 'application/zip',
  // which some mobile browsers (iOS Safari in particular) use to rename/
  // retype a downloaded .citr file as .zip regardless of the `download`
  // attribute's filename.
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: 'application/octet-stream' });
}
