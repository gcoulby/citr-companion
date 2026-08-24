import { PDFDocument } from 'pdf-lib'
import { nanoid } from 'nanoid'
import { pdfjsLib } from './pdfjsSetup'
import { assetMap } from '../../hooks/useAutoSave'
import { cacheAsset } from '../../lib/assetCache'
import { savePdfBlobToIDB } from '../../file/fileHandle'
import { usePdfLibraryStore } from '../../store/pdfLibraryStore'
import type { PdfEmbed } from '../../types'

/** Soft warning threshold — no hard cap, but flag anything unusually large. */
export const PDF_SIZE_WARNING_BYTES = 25 * 1024 * 1024

/** Orchestrates the PDF import flow: save the binary straight into this
 *  browser's IndexedDB — deliberately *not* the assetMap/citrWriter pipeline
 *  used for thumbnails and attachments, so the PDF is never bundled into the
 *  saved .citr file and can't be redistributed by sharing the case — then
 *  create the `PdfEmbed` that makes it a tab. Full-document and single-page
 *  extraction share everything except which bytes get stored. */
export function usePdfImport() {
  const addEmbed = usePdfLibraryStore((s) => s.addEmbed)
  const embeds = usePdfLibraryStore((s) => s.embeds)

  async function persistAndAddEmbed(
    bytes: Uint8Array,
    fileName: string,
    pageCount: number,
    mode: PdfEmbed['mode'],
    sourcePageIndex?: number,
  ): Promise<PdfEmbed> {
    const assetId = `pdf-${nanoid()}.pdf`
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    assetMap.set(assetId, buffer)
    cacheAsset(assetId, buffer, 'application/pdf')
    await savePdfBlobToIDB(assetId, buffer)

    const embed: PdfEmbed = {
      id: nanoid(),
      fileName,
      assetId,
      importedAt: new Date().toISOString(),
      pageCount,
      mode,
      ...(sourcePageIndex !== undefined ? { sourcePageIndex } : {}),
      order: embeds.length,
    }
    addEmbed(embed)
    return embed
  }

  /** Import the entire source document as-is. */
  async function importFull(file: File): Promise<PdfEmbed> {
    const buf = await file.arrayBuffer()
    const pdfDoc = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise
    const pageCount = pdfDoc.numPages
    await pdfDoc.loadingTask.destroy()
    return persistAndAddEmbed(new Uint8Array(buf), file.name, pageCount, 'full')
  }

  /** Extract exactly one page from the source into a new, genuinely
   *  single-page PDF — the original multi-page source is never persisted. */
  async function importSinglePage(file: File, pageIndex: number): Promise<PdfEmbed> {
    const srcBuf = await file.arrayBuffer()
    const srcDoc = await PDFDocument.load(srcBuf)
    const newDoc = await PDFDocument.create()
    const [copiedPage] = await newDoc.copyPages(srcDoc, [pageIndex])
    newDoc.addPage(copiedPage)
    const bytes = await newDoc.save()
    return persistAndAddEmbed(bytes, file.name, 1, 'single-page', pageIndex)
  }

  return { importFull, importSinglePage }
}
