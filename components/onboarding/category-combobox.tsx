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
            'flex min-h-12 w-full items-center gap-2 rounded-xl border bg-white px-4 py-3 transition-colors',
            open ? 'border-[#e42527] ring-2 ring-[#e42527]/15' : 'border-zinc-300'
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
            className="flex-1 bg-transparent text-sm text-[#050816] outline-none placeholder:text-zinc-400"
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
              type="button"
              className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527]"
              aria-label="Clear input"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
          <ChevronDown aria-hidden="true" className={cn('h-4 w-4 text-zinc-500 transition-transform', open && 'rotate-180')} />
        </div>

        {/* Dropdown */}
        {open && filtered.length > 0 && (
          <div
            id="category-suggestions"
            className="absolute top-full z-50 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-[0_18px_45px_rgba(5,8,22,0.12)]"
          >
            <div className="space-y-1 p-2">
              {filtered.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={cn(
                    'w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527]',
                    'hover:bg-[#fff4c4] hover:text-[#050816]',
                    value === item ? 'bg-[#ffda32] font-semibold text-[#050816]' : 'text-zinc-700'
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
          <div className="absolute top-full z-50 mt-2 w-full rounded-xl border border-zinc-200 bg-white p-4 shadow-[0_18px_45px_rgba(5,8,22,0.12)]">
            <p className="mb-2 text-sm font-semibold text-[#050816]">Can&apos;t find yours?</p>
            <p className="mb-3 text-xs leading-5 text-zinc-600">
              You can use &quot;{search}&quot; as your custom category.
            </p>
            <button
              onClick={() => handleSelect(search)}
              type="button"
              className="w-full rounded-lg bg-[#ffda32] px-3 py-2.5 text-sm font-bold text-[#050816] transition-colors hover:bg-[#f4c900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527]"
            >
              Use &quot;{search}&quot;
            </button>
          </div>
        )}
      </div>

      {description && <p className="mt-2 text-xs leading-5 text-zinc-500">{description}</p>}
    </div>
  )
}
