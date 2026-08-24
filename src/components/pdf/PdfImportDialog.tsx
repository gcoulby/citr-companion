import { useState } from 'react'
import { FileText, FileStack } from 'lucide-react'
import { DialogTitle, DialogDescription } from '../ui/dialog'
import { DialogShell } from '../ui/dialog-shell'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { PdfPagePicker } from './PdfPagePicker'
import { usePdfImport, PDF_SIZE_WARNING_BYTES } from './usePdfImport'

type Step = 'pick-file' | 'choose-mode' | 'pick-page'

interface PdfImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** File picker → full-vs-single-page mode choice → (single-page only) page
 *  picker → import. Resets to the first step every time the dialog reopens. */
export function PdfImportDialog({ open, onOpenChange }: PdfImportDialogProps) {
  const { importFull, importSinglePage } = usePdfImport()
  const [step, setStep] = useState<Step>('pick-file')
  const [file, setFile] = useState<File | null>(null)
  const [pageIndex, setPageIndex] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sizeWarning, setSizeWarning] = useState('')

  const reset = () => {
    setStep('pick-file')
    setFile(null)
    setPageIndex(null)
    setBusy(false)
    setError('')
    setSizeWarning('')
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleFileChosen = (picked: File) => {
    if (picked.type !== 'application/pdf' && !picked.name.toLowerCase().endsWith('.pdf')) {
      setError('Please choose a PDF file.')
      return
    }
    setError('')
    setSizeWarning(
      picked.size > PDF_SIZE_WARNING_BYTES
        ? `${picked.name} is large (${(picked.size / (1024 * 1024)).toFixed(1)}MB) — it'll be stored in this browser, separately from the case file.`
        : '',
    )
    setFile(picked)
    setStep('choose-mode')
  }

  const handleImportFull = async () => {
    if (!file) return
    setBusy(true)
    try {
      await importFull(file)
      handleOpenChange(false)
    } catch (err) {
      setError(`Import failed: ${err instanceof Error ? err.message : String(err)}`)
      setBusy(false)
    }
  }

  const handleImportSinglePage = async () => {
    if (!file || pageIndex === null) return
    setBusy(true)
    try {
      await importSinglePage(file, pageIndex)
      handleOpenChange(false)
    } catch (err) {
      setError(`Import failed: ${err instanceof Error ? err.message : String(err)}`)
      setBusy(false)
    }
  }

  return (
    <DialogShell
      open={open}
      onOpenChange={handleOpenChange}
      className="sm:max-w-2xl"
      header={
        <>
          <DialogTitle>Import PDF</DialogTitle>
          <DialogDescription>
            {step === 'pick-file' && 'Choose a PDF to bring into this case.'}
            {step === 'choose-mode' && file?.name}
            {step === 'pick-page' && 'Pick the page to keep — the rest of the source is discarded.'}
          </DialogDescription>
        </>
      }
      footer={
        step === 'pick-page' ? (
          <Button size="sm" disabled={pageIndex === null || busy} onClick={() => void handleImportSinglePage()}>
            Import Page
          </Button>
        ) : undefined
      }
    >
      {step === 'pick-file' && (
        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => {
            const picked = e.target.files?.[0]
            if (picked) handleFileChosen(picked)
          }}
          className="file:bg-muted file:hover:bg-primary/10 file:mr-3 file:px-3 file:py-1.5 file:border-0 file:rounded-md w-full text-xs file:text-xs"
        />
      )}

      {step === 'choose-mode' && (
        <div className="gap-3 grid grid-cols-1 sm:grid-cols-2">
          <Card
            className="group hover:bg-muted cursor-pointer transition-colors"
            onClick={() => void handleImportFull()}
          >
            <CardHeader className="flex flex-row items-center gap-2.5 pb-2">
              <div className="flex justify-center items-center bg-primary/10 rounded-md size-8 text-primary shrink-0">
                <FileStack size={16} />
              </div>
              <CardTitle className="text-xs">Full document</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Embed every page, browsable and searchable.
              </p>
            </CardContent>
          </Card>
          <Card
            className="group hover:bg-muted cursor-pointer transition-colors"
            onClick={() => setStep('pick-page')}
          >
            <CardHeader className="flex flex-row items-center gap-2.5 pb-2">
              <div className="flex justify-center items-center bg-primary/10 rounded-md size-8 text-primary shrink-0">
                <FileText size={16} />
              </div>
              <CardTitle className="text-xs">Single page</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Pull one page out (e.g. a character sheet or handout from a rulebook) — the
                rest of the source isn't kept.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 'pick-page' && file && (
        <PdfPagePicker file={file} selectedIndex={pageIndex} onSelect={setPageIndex} />
      )}

      {sizeWarning && <p className="mt-3 text-[11px] text-muted-foreground">{sizeWarning}</p>}
      {error && <p className="mt-3 text-[11px] text-destructive">{error}</p>}
    </DialogShell>
  )
}
