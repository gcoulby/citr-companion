import { useState } from 'react'
import { FileStack } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import { PdfTabBar } from './PdfTabBar'
import { PdfImportDialog } from './PdfImportDialog'
import { PdfViewer } from './PdfViewer'
import { PdfPageBrowser } from './PdfPageBrowser'
import { PdfFuzzySearchTab } from './PdfFuzzySearchTab'
import { usePdfDocument } from './usePdfDocument'
import { usePdfFulltextIndex } from './usePdfFulltextIndex'
import { usePdfLibraryStore } from '../../store/pdfLibraryStore'

type SidebarTab = 'pages' | 'search'

/** Top-level PDF View — a left sidebar (page thumbnails / fuzzy search over
 *  whichever tab is active) next to the PDF tab bar. Bring in any number of
 *  PDFs, browse them, pull a single page out as its own tab. */
export function PdfView() {
  const [importOpen, setImportOpen] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('pages')

  const embeds = usePdfLibraryStore((s) => s.embeds)
  const activeEmbedId = usePdfLibraryStore((s) => s.activeEmbedId)
  const activePage = usePdfLibraryStore((s) => s.activePage)
  const requestPageJump = usePdfLibraryStore((s) => s.requestPageJump)

  const activeEmbed = embeds.find((e) => e.id === activeEmbedId) ?? null
  const { pdfDoc } = usePdfDocument(activeEmbed?.assetId ?? '')
  const { pages, loading } = usePdfFulltextIndex(activeEmbed ? pdfDoc : null)

  const goToPage = (page: number, highlightText?: string) => {
    if (activeEmbed) requestPageJump(activeEmbed.id, page, highlightText)
  }

  return (
    <div className="flex w-full h-full min-h-0">
      <div className="flex flex-col border-border border-r w-64 shrink-0">
        {!activeEmbed || !pdfDoc ? (
          <div className="flex flex-col flex-1 justify-center items-center gap-2 p-6 text-muted-foreground text-center">
            <FileStack size={28} className="text-muted-foreground/50" />
            <p className="text-xs">
              {embeds.length === 0 ? 'No PDFs imported yet.' : 'Loading PDF…'}
            </p>
          </div>
        ) : (
          <Tabs
            value={sidebarTab}
            onValueChange={(v) => setSidebarTab(v as SidebarTab)}
            className="flex flex-col flex-1 gap-0 min-h-0"
          >
            <TabsList className="grid grid-cols-2 mx-2 mt-2 shrink-0">
              <TabsTrigger value="pages">Pages</TabsTrigger>
              <TabsTrigger value="search">Search</TabsTrigger>
            </TabsList>
            <TabsContent
              value="pages"
              className="flex-1 mt-2 min-h-0 overflow-y-auto"
            >
              <PdfPageBrowser
                pdfDoc={pdfDoc}
                currentPage={activePage ?? 0}
                onSelect={goToPage}
              />
            </TabsContent>
            <TabsContent
              value="search"
              className="flex flex-col flex-1 gap-0 mt-2 min-h-0"
            >
              <PdfFuzzySearchTab
                pages={pages}
                loading={loading}
                onSelectPage={goToPage}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <PdfTabBar
          onRequestImport={() => setImportOpen(true)}
          renderViewer={(embed) => <PdfViewer key={embed.id} embed={embed} />}
        />
      </div>

      <PdfImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}
