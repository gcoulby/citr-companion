import { useEffect, useState, type ReactNode } from 'react'
import { Plus, Trash2, ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import { Button } from '../ui/button'
import { DialogTitle, DialogDescription } from '../ui/dialog'
import { DialogShell } from '../ui/dialog-shell'
import { usePdfLibraryStore } from '../../store/pdfLibraryStore'
import type { PdfEmbed } from '../../types'

interface PdfTabBarProps {
  onRequestImport: () => void
  renderViewer: (embed: PdfEmbed) => ReactNode
}

/** One tab per embedded PDF — rename in place, reorder, remove (with a small
 *  inline confirm), import. */
export function PdfTabBar({ onRequestImport, renderViewer }: PdfTabBarProps) {
  const embeds = usePdfLibraryStore((s) => s.embeds)
  const renameEmbed = usePdfLibraryStore((s) => s.renameEmbed)
  const reorderEmbeds = usePdfLibraryStore((s) => s.reorderEmbeds)
  const removeEmbed = usePdfLibraryStore((s) => s.removeEmbed)
  const activeEmbedId = usePdfLibraryStore((s) => s.activeEmbedId)
  const setActiveEmbedId = usePdfLibraryStore((s) => s.setActiveEmbedId)
  const [pendingDelete, setPendingDelete] = useState<PdfEmbed | null>(null)

  const sorted = [...embeds].sort((a, b) => a.order - b.order)
  const activeId = sorted.some((e) => e.id === activeEmbedId) ? activeEmbedId! : (sorted[0]?.id ?? '')

  // Keep the store's activeEmbedId in sync with whichever tab is actually
  // showing — including the very first default-to-first-tab case, which
  // otherwise never fires (Radix Tabs' `value` prop is happy to just display
  // `activeId`'s fallback without the store ever being told), leaving the
  // sidebar (a separate consumer of activeEmbedId, outside this component's
  // tree) stuck showing its "no active embed" empty state.
  useEffect(() => {
    if (activeId && activeId !== activeEmbedId) setActiveEmbedId(activeId)
  }, [activeId, activeEmbedId, setActiveEmbedId])

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center gap-3 py-10 text-muted-foreground">
        <FileText size={28} />
        <p className="text-sm">No PDFs imported yet.</p>
        <Button variant="outline" size="sm" onClick={onRequestImport}>
          <Plus size={14} />
          Import PDF
        </Button>
      </div>
    )
  }

  return (
    <Tabs
      value={activeId}
      onValueChange={(v) => setActiveEmbedId(v)}
      className="flex flex-col gap-0 w-full h-full"
    >
      <div className="flex items-center gap-2 px-2 border-b border-border shrink-0">
        <TabsList variant="line" className="max-w-full overflow-x-auto">
          {sorted.map((embed) => (
            <TabsTrigger key={embed.id} value={embed.id} className="shrink-0">
              <span className="max-w-40 truncate">{embed.fileName}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto shrink-0"
          onClick={onRequestImport}
          title="Import PDF"
        >
          <Plus size={16} />
        </Button>
      </div>

      {sorted.map((embed, index) => (
        <TabsContent key={embed.id} value={embed.id} className="flex flex-col flex-1 gap-0 min-h-0">
          <div className="flex items-center gap-2 bg-card px-3 py-1.5 border-b border-border shrink-0">
            <input
              value={embed.fileName}
              onChange={(e) => renameEmbed(embed.id, e.target.value)}
              className="flex-1 bg-transparent hover:border-border focus-visible:border-ring border border-transparent rounded outline-none min-w-0 h-6 text-xs"
              title="Rename tab"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => reorderEmbeds(embed.id, -1)}
              disabled={index === 0}
              title="Move tab left"
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => reorderEmbeds(embed.id, 1)}
              disabled={index === sorted.length - 1}
              title="Move tab right"
            >
              <ChevronRight size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setPendingDelete(embed)}
              title="Remove PDF"
            >
              <Trash2 size={14} />
            </Button>
          </div>
          {/* Only the active tab's viewer mounts — switching tabs means
              switching documents (a new PDFViewer instance), so there's no
              benefit to keeping inactive tabs' viewers alive. */}
          <div className="flex-1 min-h-0">{embed.id === activeId ? renderViewer(embed) : null}</div>
        </TabsContent>
      ))}

      <DialogShell
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        className="sm:max-w-sm"
        header={
          <>
            <DialogTitle>Remove &quot;{pendingDelete?.fileName}&quot;?</DialogTitle>
            <DialogDescription>This removes the PDF from this case. This cannot be undone.</DialogDescription>
          </>
        }
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (pendingDelete) removeEmbed(pendingDelete.id)
                setPendingDelete(null)
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        <></>
      </DialogShell>
    </Tabs>
  )
}
