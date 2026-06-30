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

/**
 * Zoho-style selection card — white background, crisp border,
 * blue accent when selected, icon in a coloured square badge.
 */
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
      className="group relative w-full rounded-xl text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      style={{
        background: selected ? '#eff6ff' : '#fff',
        border: selected ? '2px solid #1a56db' : '1.5px solid #e2e8f0',
        padding: '20px',
        boxShadow: selected
          ? '0 0 0 3px rgba(26,86,219,0.08)'
          : '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {/* Check badge */}
      {selected && (
        <span
          className="absolute top-3.5 right-3.5 h-5 w-5 rounded-full flex items-center justify-center"
          style={{ background: '#1a56db' }}
        >
          <Check className="h-3 w-3 text-white stroke-[3]" />
        </span>
      )}

      {/* Icon square */}
      <div
        className="mb-4 h-11 w-11 rounded-lg flex items-center justify-center transition-colors duration-150"
        style={{
          background: selected ? '#1a56db' : '#f1f5f9',
          color: selected ? '#fff' : '#475569',
        }}
      >
        <Icon className="h-5 w-5" />
      </div>

      {/* Text */}
      <p
        className="text-[14px] font-semibold mb-1 leading-snug"
        style={{ color: selected ? '#1a56db' : '#0f172a' }}
      >
        {title}
        {badge && (
          <span
            className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{ background: '#dbeafe', color: '#1d4ed8' }}
          >
            {badge}
          </span>
        )}
      </p>
      <p className="text-[12px] leading-relaxed line-clamp-2" style={{ color: '#64748b' }}>
        {description}
      </p>
    </button>
  )
}
