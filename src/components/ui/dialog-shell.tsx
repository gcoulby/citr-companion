import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogFooter } from './dialog'
import { ScrollArea } from './scroll-area'

interface DialogShellProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  header: ReactNode
  footer?: ReactNode
  children: ReactNode
  /** Extra classes for DialogContent — use for e.g. max-width. */
  className?: string
  /** Extra classes for the scrollable body's inner padding wrapper. */
  bodyClassName?: string
  showCloseButton?: boolean
}

// Every dialog with body content long enough to scroll should go through this
// shell: the body is a direct flex child of DialogContent with flex-1/min-h-0,
// which is what lets ScrollArea's Viewport (height: 100%) resolve to a real,
// bounded height. Wrapping ScrollArea in a plain (non-flex) div breaks that
// chain — the Viewport then grows to full content height and gets silently
// clipped instead of scrolling.
export function DialogShell({
  open,
  onOpenChange,
  header,
  footer,
  children,
  className,
  bodyClassName,
  showCloseButton,
}: DialogShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex flex-col gap-0 p-0 max-h-[85dvh] overflow-hidden',
          className,
        )}
        showCloseButton={showCloseButton}
      >
        <DialogHeader className="px-6 py-4 border-border border-b shrink-0">
          {header}
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0">
          <div className={cn('px-6 py-5', bodyClassName)}>{children}</div>
        </ScrollArea>
        {footer && (
          <DialogFooter className="sm:justify-end px-6 py-3 pb-6 border-border border-t shrink-0">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
