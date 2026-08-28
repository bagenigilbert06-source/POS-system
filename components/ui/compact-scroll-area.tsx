'use client'

import { useCallback, useEffect, useRef, useState, type HTMLAttributes, type PointerEvent } from 'react'
import { cn } from '@/lib/utils'

const TRACK_INSET = 8
const MIN_THUMB_HEIGHT = 56
const SCROLLBAR_HIDE_DELAY = 900

export function CompactScrollArea({ className, children, onScroll, ...props }: HTMLAttributes<HTMLDivElement>) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ pointerY: number; scrollTop: number } | null>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [thumb, setThumb] = useState({ visible: false, top: 0, height: MIN_THUMB_HEIGHT })
  const [scrollbarActive, setScrollbarActive] = useState(false)

  const revealScrollbar = useCallback((keepVisible = false) => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    setScrollbarActive(true)
    if (!keepVisible) {
      hideTimerRef.current = setTimeout(
        () => setScrollbarActive(false),
        SCROLLBAR_HIDE_DELAY
      )
    }
  }, [])

  const updateThumb = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const maxScroll = viewport.scrollHeight - viewport.clientHeight
    const trackHeight = Math.max(0, viewport.clientHeight - TRACK_INSET * 2)
    const proportionalHeight = viewport.scrollHeight > 0
      ? trackHeight * (viewport.clientHeight / viewport.scrollHeight)
      : trackHeight
    const height = Math.min(trackHeight, Math.max(MIN_THUMB_HEIGHT, proportionalHeight))
    const travel = Math.max(0, trackHeight - height)
    setThumb({
      visible: maxScroll > 1,
      top: maxScroll > 0 ? (viewport.scrollTop / maxScroll) * travel : 0,
      height,
    })
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const observer = new ResizeObserver(updateThumb)
    observer.observe(viewport)
    if (viewport.firstElementChild) observer.observe(viewport.firstElementChild)
    updateThumb()
    return () => {
      observer.disconnect()
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [children, updateThumb])

  const moveThumb = (event: PointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current
    const drag = dragRef.current
    if (!viewport || !drag) return
    const travel = Math.max(1, viewport.clientHeight - TRACK_INSET * 2 - thumb.height)
    const maxScroll = viewport.scrollHeight - viewport.clientHeight
    viewport.scrollTop = drag.scrollTop + ((event.clientY - drag.pointerY) / travel) * maxScroll
  }

  return (
    <div className="group/compact-scroll relative min-h-0 flex-1">
      <div
        ref={viewportRef}
        onScroll={(event) => {
          updateThumb()
          revealScrollbar()
          onScroll?.(event)
        }}
        className={cn('compact-scroll-viewport h-full overflow-y-auto', className)}
        {...props}
      >
        {children}
      </div>
      {thumb.visible && (
        <div
          aria-hidden="true"
          className={cn(
            'absolute inset-y-2 right-1 z-20 hidden w-2 cursor-pointer rounded-full bg-slate-200/35 opacity-0 transition-opacity duration-200 lg:block dark:bg-white/[.04]',
            scrollbarActive ? 'pointer-events-auto opacity-100' : 'pointer-events-none'
          )}
          onPointerDown={(event) => {
            if (event.target !== event.currentTarget) return
            const viewport = viewportRef.current
            if (!viewport) return
            const bounds = event.currentTarget.getBoundingClientRect()
            const travel = Math.max(1, bounds.height - thumb.height)
            const nextTop = Math.min(travel, Math.max(0, event.clientY - bounds.top - thumb.height / 2))
            viewport.scrollTop = (nextTop / travel) * (viewport.scrollHeight - viewport.clientHeight)
          }}
        >
          <div
            className="absolute left-1/2 w-1.5 -translate-x-1/2 touch-none cursor-grab rounded-full bg-slate-400/65 transition-[background-color,width] hover:w-2 hover:bg-slate-500/80 active:cursor-grabbing dark:bg-slate-400/50 dark:hover:bg-slate-300/75"
            style={{ height: `${thumb.height}px`, transform: `translate(-50%, ${thumb.top}px)` }}
            onPointerDown={(event) => {
              const viewport = viewportRef.current
              if (!viewport) return
              revealScrollbar(true)
              event.currentTarget.setPointerCapture(event.pointerId)
              dragRef.current = { pointerY: event.clientY, scrollTop: viewport.scrollTop }
            }}
            onPointerMove={moveThumb}
            onPointerUp={(event) => {
              dragRef.current = null
              event.currentTarget.releasePointerCapture(event.pointerId)
              revealScrollbar()
            }}
            onPointerCancel={() => {
              dragRef.current = null
              revealScrollbar()
            }}
          />
        </div>
      )}
    </div>
  )
}
