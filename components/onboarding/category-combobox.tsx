'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CategoryComboboxProps {
  suggestions: string[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  description?: string
}

export function CategoryCombobox({
  suggestions,
  value,
  onChange,
  placeholder = 'Search or type your business',
  description,
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter suggestions based on search
  const filtered = useMemo(() => {
    if (!search.trim()) return suggestions
    const searchLower = search.toLowerCase()
    return suggestions.filter((item) => item.toLowerCase().includes(searchLower))
  }, [search, suggestions])

  // Handle selection
  const handleSelect = (item: string) => {
    onChange(item)
    setSearch(item)
    setOpen(false)
  }

  // Handle custom input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setOpen(true)
  }

  // Handle blur
  const handleBlur = () => {
    // Only close if we're not selecting from dropdown
    setTimeout(() => {
      if (search.trim() && search !== value) {
        onChange(search)
      }
      setOpen(false)
    }, 100)
  }

  // Handle focus
  const handleFocus = () => {
    setOpen(true)
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (e.key === 'Enter') {
      if (search.trim()) {
        onChange(search)
        setOpen(false)
      }
      return
    }
  }

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="w-full">
      <div className="relative">
        <div
          className={cn(
            'w-full rounded-lg border px-4 py-3 flex items-center gap-2 transition-all duration-200',
            'bg-card border-border',
            open ? 'ring-2 ring-primary ring-offset-2 ring-offset-background border-primary' : ''
          )}
        >
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            aria-label="Search business category"
            aria-autocomplete="list"
            aria-controls="category-suggestions"
            aria-expanded={open}
          />
          {search && (
            <button
              onClick={() => {
                setSearch('')
                onChange('')
                inputRef.current?.focus()
              }}
              className="p-1 hover:bg-muted rounded transition-colors"
              aria-label="Clear input"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </div>

        {/* Dropdown */}
        {open && filtered.length > 0 && (
          <div
            id="category-suggestions"
            className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
          >
            <div className="space-y-1 p-2">
              {filtered.map((item) => (
                <button
                  key={item}
                  onClick={() => handleSelect(item)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded transition-colors text-sm',
                    'hover:bg-primary/10 hover:text-primary',
                    value === item ? 'bg-primary/15 text-primary font-medium' : 'text-foreground'
                  )}
                  role="option"
                  aria-selected={value === item}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No results message */}
        {open && search.trim() && filtered.length === 0 && (
          <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-50 p-4">
            <p className="text-sm text-muted-foreground mb-3">Can&apos;t find yours?</p>
            <p className="text-xs text-muted-foreground mb-3">
              You can use &quot;{search}&quot; as your custom category.
            </p>
            <button
              onClick={() => handleSelect(search)}
              className="w-full px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              Use &quot;{search}&quot;
            </button>
          </div>
        )}
      </div>

      {description && <p className="text-xs text-muted-foreground mt-2">{description}</p>}
    </div>
  )
}
