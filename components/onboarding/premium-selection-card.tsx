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
      onClick={onClick}
      aria-pressed={selected}
      className="group relative w-full rounded-xl text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{
        background: '#ffffff',
        border: selected ? '2px solid #111827' : '1.5px solid #e5e7eb',
        padding: '20px',
        boxShadow: selected ? 'none' : '0 1px 2px rgba(0,0,0,0.04)',
        fontFamily: 'var(--font-inter, Inter, sans-serif)',
        outline: 'none',
      }}
    >
      {/* Check mark in top-right */}
      {selected && (
        <span
          className="absolute top-3 right-3 h-[22px] w-[22px] rounded-full flex items-center justify-center"
          style={{ background: '#111827' }}
        >
          <Check className="h-3 w-3 text-white stroke-[3]" />
        </span>
      )}

      {/* Icon */}
      <div
        className="mb-4 h-10 w-10 rounded-lg flex items-center justify-center"
        style={{
          background: selected ? '#111827' : '#f3f4f6',
          color: selected ? '#ffffff' : '#374151',
        }}
      >
        <Icon className="h-5 w-5" />
      </div>

      {/* Title */}
      <p
        className="text-[14px] font-semibold mb-1 leading-snug"
        style={{ color: '#111827' }}
      >
        {title}
        {badge && (
          <span
            className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{ background: '#f3f4f6', color: '#374151' }}
          >
            {badge}
          </span>
        )}
      </p>

      {/* Description */}
      <p
        className="text-[12px] leading-relaxed line-clamp-2"
        style={{ color: '#9ca3af' }}
      >
        {description}
      </p>
    </button>
  )
}
