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
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="sticky top-0 z-40 border-b border-primary/20 bg-gradient-to-r from-primary/8 via-primary/4 to-primary/8 backdrop-blur-md"
      >
        <div className="mx-auto px-4 sm:px-6 flex items-center justify-between gap-2 sm:gap-3 py-2.5 sm:py-3">
          {/* Message */}
          <div className="flex-1 flex items-center gap-2 text-center sm:text-left min-w-0">
            <span className="hidden sm:inline-flex h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
            <p className="text-xs sm:text-sm font-medium text-foreground truncate sm:truncate-none">
              🎉 Join 5,000+ businesses on{' '}
              <span className="text-primary font-bold">Imara</span>
              {' '}
              <span className="hidden sm:inline text-muted-foreground">— Start free today</span>
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={() => setIsVisible(false)}
            className="flex-shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Close announcement"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
