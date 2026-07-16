'use client'

import { Check } from 'lucide-react'

interface BusinessCategoryItemProps {
  id: string
  name: string
  selected: boolean
  onClick: () => void
}

export function BusinessCategoryItem({
  id,
  name,
  selected,
  onClick,
}: BusinessCategoryItemProps) {
  return (
    <button
      onClick={onClick}
      type="button"
      aria-pressed={selected}
      className={`w-full rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527] focus-visible:ring-offset-2 ${
        selected
          ? 'border-[#e1b900] bg-[#ffda32]'
          : 'border-zinc-200 bg-white hover:border-zinc-400 hover:bg-[#fffdf8]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3
          className="text-sm font-bold text-[#050816]"
        >
          {name}
        </h3>
        <div
          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
            selected ? 'border-[#050816] bg-[#050816]' : 'border-zinc-300 bg-white'
          }`}
        >
          {selected && <Check aria-hidden="true" className="h-3 w-3 text-white" />}
        </div>
      </div>
    </button>
  )
}
