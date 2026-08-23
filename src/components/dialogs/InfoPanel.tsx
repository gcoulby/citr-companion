import { Shield, Lock, Keyboard, FileArchive, Layers } from 'lucide-react'
import { DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { DialogShell } from '../ui/dialog-shell'

interface Props {
  onClose: () => void
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-primary">{icon}</span>
        <h3 className="font-mono text-[11px] text-primary uppercase tracking-wider">
          {title}
        </h3>
      </div>
      {children}
    </div>
  )
}

function KbRow({ keys, action }: { keys: string[]; action: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-border/60 last:border-0 border-b">
      <span className="text-[11px] text-muted-foreground">{action}</span>
      <div className="flex gap-1">
        {keys.map((k) => (
          <kbd
            key={k}
            className="bg-muted px-1.5 py-0.5 border border-border rounded font-mono text-[10px] text-foreground"
          >
            {k}
          </kbd>
        ))}
      </div>
    </div>
  )
}

export function InfoPanel({ onClose }: Props) {
  return (
    <DialogShell
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      className="sm:max-w-150"
      header={
        <DialogTitle className="flex items-center gap-3">
          <Shield size={18} className="text-primary" />
          <div>
            <div className="font-display text-foreground text-sm">
              Caught in the Rain
            </div>
            <div className="font-mono font-normal text-[10px] text-muted-foreground">
              Companion Case Board · v1.0
            </div>
          </div>
        </DialogTitle>
      }
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <Section icon={<Layers size={14} />} title="Caught in the Rain">
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          This is an unoffical companion app and is not affiliated with Caught
          in the Rain, Nicholas Robinia or{' '}
          <a
            className="text-primary"
            href="https://theravensridgeemporium.com/"
            target="_blank"
            rel="norefferer noopenner"
          >
            The Ravens Ridge Emporium
          </a>
        </p>
        <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed">
          I am currently seeking permission from Nicholas to share this app. If
          you are the rights holder, and you find this before authorisation has
          been saught, raise an issue on{' '}
          <a
            className="text-primary"
            href="https://github.com/gcoulby/citr-companion/"
            target="_blank"
            rel="norefferer noopenner"
          >
            GitHub
          </a>{' '}
          and I will promptly remove the app.
        </p>
      </Section>

      <Section icon={<Layers size={14} />} title="What is this?">
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          A companion app for{' '}
          <em className="text-foreground">Caught in the Rain</em>, a solo
          card-and-dice mystery RPG. Build a spatial case board of entities
          (people, locations, objects, events, clues, truths) and the
          relationships between them, alongside your investigator sheet, the
          clue/truth decks, and dice &amp; oracle rollers for the game itself —
          all stored in a single{' '}
          <code className="bg-muted px-1 rounded text-primary">.citr</code> file
          on your disk.
        </p>
        <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed">
          Think of the board as a digital version of the detective's evidence
          board: nodes are index cards, edges are the red threads between them.
        </p>
      </Section>

      <Section icon={<Layers size={14} />} title="Trace Note">
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          This app is forked from an OSINT tool I was experimenting with{' '}
          <a
            className="text-primary"
            href="https://github.com/gcoulby/trace-note/"
            target="_blank"
            rel="norefferer noopenner"
          >
            Trace Note
          </a>
          If you're interested in the detective board aspects for more serious
          applications you should check that first.
        </p>
      </Section>

      <Section icon={<Lock size={14} />} title="Privacy & Security">
        <div className="space-y-2 text-[12px] text-muted-foreground">
          <div className="flex gap-2">
            <span className="mt-0.5 text-primary shrink-0">→</span>
            <span>
              <strong className="text-foreground">Fully offline.</strong> Zero
              network requests at runtime. No analytics, no telemetry, no CDN
              calls.
            </span>
          </div>
          <div className="flex gap-2">
            <span className="mt-0.5 text-primary shrink-0">→</span>
            <span>
              <strong className="text-foreground">Single-file storage.</strong>{' '}
              Everything lives in the{' '}
              <code className="bg-muted px-1 rounded text-primary">.citr</code>{' '}
              file — a ZIP archive you control.
            </span>
          </div>
          <div className="flex gap-2">
            <span className="mt-0.5 text-primary shrink-0">→</span>
            <span>
              <strong className="text-foreground">No cloud.</strong> No
              accounts, no sync services, no external dependencies at runtime.
            </span>
          </div>
          <div className="flex gap-2">
            <span className="mt-0.5 text-primary shrink-0">→</span>
            <span>
              <strong className="text-foreground">USB-safe.</strong> The app can
              run as a static bundle from a USB stick or local file server.
            </span>
          </div>
          <div className="flex gap-2 bg-primary/5 mt-3 p-3 border border-primary/20 rounded">
            <span className="mt-0.5 text-primary shrink-0">⚠</span>
            <span>
              <strong className="text-primary">Note:</strong> The{' '}
              <code className="bg-muted px-1 rounded text-primary">.citr</code>{' '}
              file is only optionally encrypted (set a passphrase when creating
              a case). The 3 sealed truth cards are lightly obfuscated inside
              the file, not cryptographically hidden — treat the file like any
              other document about a case you don't want to spoil for yourself.
            </span>
          </div>
        </div>
      </Section>

      <Section icon={<Keyboard size={14} />} title="Keyboard Shortcuts">
        <div className="bg-background p-3 border border-border rounded">
          <KbRow keys={['Ctrl', 'K']} action="Open search" />
          <KbRow keys={['Esc']} action="Close panel / dismiss" />
          <KbRow keys={['Del']} action="Delete selected node" />
          <KbRow
            keys={['Right-click', 'canvas']}
            action="Add node at position"
          />
          <KbRow keys={['Double-click', 'node']} action="Open node panel" />
          <KbRow keys={['Right-click']} action="Context menu" />
          <KbRow keys={['Drag', 'handle']} action="Connect nodes" />
          <KbRow keys={['Drag to', 'empty']} action="Create connected node" />
          <KbRow keys={['Ctrl', 'A']} action="Select all nodes" />
        </div>
      </Section>

      <Section icon={<FileArchive size={14} />} title="File Format">
        <p className="mb-2 text-[12px] text-muted-foreground leading-relaxed">
          A <code className="bg-muted px-1 rounded text-primary">.citr</code>{' '}
          file is a standard ZIP archive containing:
        </p>
        <div className="space-y-1 bg-background p-3 border border-border rounded font-mono text-[11px] text-muted-foreground">
          <div>
            <span className="text-emerald-500">manifest.json</span> — schema
            version, case title, timestamps
          </div>
          <div>
            <span className="text-emerald-500">graph.json</span> — all nodes and
            edges
          </div>
          <div>
            <span className="text-emerald-500">canvas.json</span> — node
            positions, viewport state
          </div>
          <div>
            <span className="text-emerald-500">investigator.json</span> — your
            investigator's sheet
          </div>
          <div>
            <span className="text-emerald-500">mystery.json</span> — the case's
            problem, danger, clock, clues, threats
          </div>
          <div>
            <span className="text-emerald-500">decks.json</span> — the
            clue/truth decks, incl. the sealed truth cards
          </div>
          <div>
            <span className="text-emerald-500">assets/</span> — thumbnails,
            attached images and PDFs
          </div>
          <div>
            <span className="text-emerald-500">content/</span> — rich text
            content per node
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground/70">
          You can unzip and inspect a{' '}
          <code className="text-primary">.citr</code> file with any standard
          archive tool — though opening{' '}
          <code className="text-primary">decks.json</code> will spoil your own
          mystery.
        </p>
      </Section>
    </DialogShell>
  )
}
