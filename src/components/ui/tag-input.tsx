import { useState } from 'react'
import { X } from 'lucide-react'
import { Input } from './input'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Command, CommandList, CommandEmpty, CommandGroup, CommandItem } from './command'

interface TagInputProps {
  tags: string[]
  suggestions: string[]
  onAdd: (tag: string) => void
  onRemove: (tag: string) => void
  placeholder?: string
}

export function TagInput({ tags, suggestions, onAdd, onRemove, placeholder }: TagInputProps) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')

  const filtered = suggestions.filter(
    (t) => !tags.includes(t) && t.toLowerCase().includes(value.trim().toLowerCase()),
  )

  const commit = (raw: string) => {
    const v = raw.trim()
    if (v && !tags.includes(v)) onAdd(v)
    setValue('')
    setOpen(false)
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border"
          >
            {tag}
            <button onClick={() => onRemove(tag)} className="hover:text-red-400 transition-colors">
              <X size={9} />
            </button>
          </span>
        ))}
      </div>
      <Popover open={open && filtered.length > 0}>
        <PopoverTrigger asChild>
          <Input
            value={value}
            placeholder={placeholder}
            className="h-7 text-xs"
            onChange={(e) => {
              setValue(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && value.trim()) {
                e.preventDefault()
                commit(value)
              } else if (e.key === 'Escape') {
                setOpen(false)
              }
            }}
          />
        </PopoverTrigger>
        <PopoverContent
          className="p-0 w-(--radix-popover-trigger-width)"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter={false}>
            <CommandList>
              <CommandEmpty className="py-2 text-xs">No matches</CommandEmpty>
              <CommandGroup>
                {filtered.map((t) => (
                  // onMouseDown fires before the input's onBlur closes the popover.
                  <CommandItem key={t} onMouseDown={(e) => { e.preventDefault(); commit(t) }}>
                    {t}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
