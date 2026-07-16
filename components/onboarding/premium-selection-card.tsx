'use client'

import { Check } from 'lucide-react'
import React from 'react'

interface PremiumSelectionCardProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  examples?: string[]
  selected: boolean
  onClick: () => void
  badge?: string
}

export function PremiumSelectionCard({
  icon: Icon,
  title,
  description,
  selected,
  onClick,
  badge,
}: PremiumSelectionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group relative min-h-44 w-full rounded-xl border p-5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527] focus-visible:ring-offset-2 ${
        selected
          ? 'border-[#e1b900] bg-[#ffda32]'
          : 'border-zinc-200 bg-white hover:border-zinc-400 hover:bg-[#fffdf8]'
      }`}
    >
      {/* Check mark in top-right */}
      {selected && (
        <span
          className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-[#050816]"
        >
          <Check aria-hidden="true" className="h-3.5 w-3.5 text-white stroke-[3]" />
        </span>
      )}

      {/* Icon */}
      <div
        className={`mb-5 flex h-11 w-11 items-center justify-center rounded-lg ${
          selected ? 'bg-[#050816] text-[#ffda32]' : 'bg-[#fff4c4] text-[#050816]'
        }`}
      >
        <Icon aria-hidden="true" className="h-5 w-5" />
      </div>

      {/* Title */}
      <p
        className="mb-2 text-[15px] font-bold leading-snug text-[#050816]"
      >
        {title}
        {badge && (
          <span
            className="ml-2 rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700"
          >
            {badge}
          </span>
        )}
      </p>

      {/* Description */}
      <p
        className="line-clamp-3 text-[13px] leading-5 text-zinc-600"
      >
        {description}
      </p>
    </button>
  )
}
