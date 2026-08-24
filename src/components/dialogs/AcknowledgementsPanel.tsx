import { Heart, Quote, FileStack, Layers } from 'lucide-react'
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

export function AcknowledgementsPanel({ onClose }: Props) {
  return (
    <DialogShell
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      className="sm:max-w-150"
      header={
        <DialogTitle className="flex items-center gap-3">
          <Heart size={18} className="text-primary" />
          <div>
            <div className="font-display text-foreground text-sm">
              Acknowledgements
            </div>
            <div className="font-mono font-normal text-[10px] text-muted-foreground">
              Credit where it's due
            </div>
          </div>
        </DialogTitle>
      }
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <Section icon={<Layers size={14} />} title="Caught in the Rain">
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          This is an unofficial companion app for{' '}
          <em className="text-foreground">Caught in the Rain</em>, a solo
          card-and-dice mystery RPG by Nicholas Robinia, and is not affiliated
          with Nicholas Robinia or{' '}
          <a
            className="text-primary"
            href="https://theravensridgeemporium.com/"
            target="_blank"
            rel="noreferrer noopener"
          >
            The Ravens Ridge Emporium
          </a>
          . It's shared with Nicholas's explicit permission.
        </p>
        <div className="flex gap-2 bg-primary/5 mt-3 p-3 border border-primary/20 rounded">
          <Quote size={13} className="mt-0.5 text-primary shrink-0" />
          <p className="text-[12px] text-muted-foreground italic leading-relaxed">
            "I'm very happy for you to share it around freely for people to
            use with the oracles and random tables if that's what you're
            asking so long as there is some credit that links directly to our
            game and the tool doesn't share the .pdf."
            <span className="block mt-1.5 text-foreground/80 not-italic">
              — Nicholas Robinia
            </span>
          </p>
        </div>
        <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed">
          If you're the rights holder and have any concerns, raise an issue on{' '}
          <a
            className="text-primary"
            href="https://github.com/gcoulby/citr-companion/"
            target="_blank"
            rel="noreferrer noopener"
          >
            GitHub
          </a>{' '}
          and it will be addressed promptly.
        </p>
      </Section>

      <Section icon={<FileStack size={14} />} title="Your rulebook PDF stays yours">
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          When you import the <em className="text-foreground">Caught in the
          Rain</em> PDF (or any PDF) into PDF View, it's saved directly in
          this browser's local storage — never inside the{' '}
          <code className="bg-muted px-1 rounded text-primary">.citr</code>{' '}
          case file itself.
        </p>
        <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed">
          That means you can freely share, back up, or hand your{' '}
          <code className="bg-muted px-1 rounded text-primary">.citr</code>{' '}
          mystery file to someone else without also handing them a copy of the
          rulebook — respecting the permission above, which is granted for the
          tool, not for redistributing the PDF.
        </p>
      </Section>

      <Section icon={<Layers size={14} />} title="Trace Note">
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          This app is forked from an OSINT tool I was experimenting with,{' '}
          <a
            className="text-primary"
            href="https://github.com/gcoulby/trace-note/"
            target="_blank"
            rel="noreferrer noopener"
          >
            Trace Note
          </a>
          . If you're interested in the detective board aspects for more
          serious applications, check that out too.
        </p>
      </Section>
    </DialogShell>
  )
}
