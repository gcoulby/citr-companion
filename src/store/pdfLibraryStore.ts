import { create } from 'zustand';
import type { PdfEmbed } from '../types';
import { assetMap } from '../hooks/useAutoSave';
import { invalidateAsset } from '../lib/assetCache';
import { deletePdfBlobFromIDB } from '../file/fileHandle';

interface PageJumpRequest {
  embedId: string;
  page: number;
  highlightText?: string;
  token: number;
}

interface PdfLibraryState {
  embeds: PdfEmbed[];
  activeEmbedId: string | null;
  activePage: number | null;
  pageJumpRequest: PageJumpRequest | null;

  setActiveEmbedId: (id: string | null) => void;
  setActivePage: (page: number | null) => void;
  requestPageJump: (embedId: string, page: number, highlightText?: string) => void;

  addEmbed: (embed: PdfEmbed) => void;
  renameEmbed: (id: string, fileName: string) => void;
  reorderEmbeds: (id: string, direction: -1 | 1) => void;
  removeEmbed: (id: string) => void;
  setEmbedZoom: (id: string, zoom: number) => void;
  setEmbedPage: (id: string, page: number) => void;

  load: (embeds: PdfEmbed[]) => void;
  reset: () => void;
}

// Per-case PDF library (pdfs.json in the .citr file) — distinct from
// caseSettingsStore, but the same "plain Zustand, no persist, loaded/reset
// alongside the rest of the case" shape.
export const usePdfLibraryStore = create<PdfLibraryState>((set, get) => ({
  embeds: [],
  activeEmbedId: null,
  activePage: null,
  pageJumpRequest: null,

  setActiveEmbedId: (id) => set({ activeEmbedId: id }),
  setActivePage: (page) => set({ activePage: page }),
  requestPageJump: (embedId, page, highlightText) =>
    set((s) => ({
      pageJumpRequest: {
        embedId,
        page,
        highlightText,
        token: (s.pageJumpRequest?.token ?? 0) + 1,
      },
    })),

  addEmbed: (embed) => set((s) => ({ embeds: [...s.embeds, embed] })),

  renameEmbed: (id, fileName) =>
    set((s) => ({ embeds: s.embeds.map((e) => (e.id === id ? { ...e, fileName } : e)) })),

  reorderEmbeds: (id, direction) =>
    set((s) => {
      const sorted = [...s.embeds].sort((a, b) => a.order - b.order);
      const index = sorted.findIndex((e) => e.id === id);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= sorted.length) return s;
      const swapped = [...sorted];
      [swapped[index], swapped[target]] = [swapped[target], swapped[index]];
      return { embeds: swapped.map((e, i) => ({ ...e, order: i })) };
    }),

  removeEmbed: (id) => {
    const embed = get().embeds.find((e) => e.id === id);
    set((s) => ({ embeds: s.embeds.filter((e) => e.id !== id) }));
    if (embed) {
      assetMap.delete(embed.assetId);
      invalidateAsset(embed.assetId);
      void deletePdfBlobFromIDB(embed.assetId);
    }
  },

  setEmbedZoom: (id, zoom) =>
    set((s) => ({ embeds: s.embeds.map((e) => (e.id === id ? { ...e, zoom } : e)) })),

  setEmbedPage: (id, currentPage) =>
    set((s) => ({ embeds: s.embeds.map((e) => (e.id === id ? { ...e, currentPage } : e)) })),

  load: (embeds) => set({ embeds, activeEmbedId: null, activePage: null }),
  reset: () => set({ embeds: [], activeEmbedId: null, activePage: null, pageJumpRequest: null }),
}));
