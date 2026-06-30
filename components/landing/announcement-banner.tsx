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
        className="sticky top-0 z-40 border-b border-primary/10 bg-gradient-to-r from-primary/5 via-primary/3 to-primary/5 backdrop-blur-sm"
      >
        <div className="container-wide flex items-center justify-between gap-3 px-4 py-3.5 sm:py-4">
          {/* Message */}
          <div className="flex-1 flex items-center gap-2.5 text-center sm:text-left">
            <span className="hidden sm:inline-flex h-2 w-2 rounded-full bg-primary flex-shrink-0" />
            <p className="text-xs sm:text-sm font-semibold text-foreground">
              🎉{' '}
              <span className="text-muted-foreground">
                Join 5,000+ businesses running operations on Imara —
              </span>
              {' '}
              <span className="text-primary font-bold">
                Start free today
              </span>
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={() => setIsVisible(false)}
            className="flex-shrink-0 -mr-1 inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Close announcement banner"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
