import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/utils'

interface EditableStatProps {
  /** Text shown while not editing, e.g. "3 / 73" or "124%". */
  display: string
  /** Raw numeric value to seed the input with when editing starts. */
  value: number
  onCommit: (value: number) => void
  title?: string
  className?: string
}

/** A toolbar stat (page number, zoom %) that's a plain span until clicked,
 *  then becomes a number input — Enter or blur commits, Escape cancels. */
export function EditableStat({ display, value, onCommit, title, className }: EditableStatProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const commit = () => {
    const parsed = Number(draft)
    if (Number.isFinite(parsed) && parsed > 0) onCommit(parsed)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={1}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            setEditing(false)
          }
        }}
        className={cn(
          'bg-muted rounded w-12 text-xs text-center tabular-nums outline-none',
          '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
          className,
        )}
      />
    )
  }

  return (
    <button
      type="button"
      title={title}
      onClick={() => {
        setDraft(String(value))
        setEditing(true)
      }}
      className={cn(
        'hover:bg-muted px-1 rounded text-muted-foreground text-xs tabular-nums transition-colors',
        className,
      )}
    >
      {display}
    </button>
  )
}
