'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export function AnnouncementBanner() {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40"
      >
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-center gap-4">
          {/* Message - Centered */}
          <div className="flex-1 flex items-center justify-center gap-3 text-center min-w-0">
            <p className="text-sm font-medium text-foreground">
              Join 8,500+ businesses running on{' '}
              <span className="text-primary font-semibold">PESABY</span>
              <span className="hidden sm:inline text-muted-foreground"> — Free for 30 days, no card required</span>
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={() => setIsVisible(false)}
            className="flex-shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Close announcement"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
