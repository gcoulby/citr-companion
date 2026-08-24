import { useState } from 'react'
import { FileStack, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import { Sidebar, SidebarProvider, SidebarHeader, SidebarContent } from '../ui/sidebar'
import { Button } from '../ui/button'
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
 *  PDFs, browse them, pull a single page out as its own tab.
 *
 *  The sidebar starts collapsed to an icon rail and its contents aren't
 *  mounted until expanded — building the fuzzy-search full-text index walks
 *  every page of the document, which is by far the slowest part of opening a
 *  PDF, so skipping it (and the page-thumbnail grid) unless the user actually
 *  opens the sidebar makes the PDF itself appear much faster. */
export function PdfView() {
  const [importOpen, setImportOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('pages')

  const embeds = usePdfLibraryStore((s) => s.embeds)
  const activeEmbedId = usePdfLibraryStore((s) => s.activeEmbedId)
  const activePage = usePdfLibraryStore((s) => s.activePage)
  const requestPageJump = usePdfLibraryStore((s) => s.requestPageJump)

  const activeEmbed = embeds.find((e) => e.id === activeEmbedId) ?? null
  const { pdfDoc } = usePdfDocument(activeEmbed?.assetId ?? '')
  const { pages, loading } = usePdfFulltextIndex(
    sidebarOpen && activeEmbed ? pdfDoc : null,
  )

  const goToPage = (page: number, highlightText?: string) => {
    if (activeEmbed) requestPageJump(activeEmbed.id, page, highlightText)
  }

  return (
    <SidebarProvider className="flex w-full h-full min-h-0">
      {sidebarOpen ? (
        <Sidebar collapsible="none" className="flex flex-col border-border border-r w-64 h-full shrink-0">
          <SidebarHeader className="flex-row justify-between items-center gap-1 px-3 py-2 border-border border-b">
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
              PDF View
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setSidebarOpen(false)}
              title="Collapse sidebar"
            >
              <PanelLeftClose size={12} />
            </Button>
          </SidebarHeader>
          <SidebarContent className="flex flex-col flex-1 min-h-0">
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
          </SidebarContent>
        </Sidebar>
      ) : (
        <Sidebar collapsible="none" className="border-border border-r w-12 h-full shrink-0">
          <SidebarHeader className="items-center px-0 py-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSidebarOpen(true)}
              title="Expand sidebar"
            >
              <PanelLeftOpen size={14} />
            </Button>
          </SidebarHeader>
        </Sidebar>
      )}

      <div className="flex-1 min-w-0">
        <PdfTabBar
          onRequestImport={() => setImportOpen(true)}
          renderViewer={(embed) => <PdfViewer key={embed.id} embed={embed} />}
        />
      </div>

      <PdfImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </SidebarProvider>
  )
}
