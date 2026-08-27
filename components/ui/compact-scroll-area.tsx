'use client'

import { useCallback, useEffect, useRef, useState, type HTMLAttributes, type PointerEvent } from 'react'
import { cn } from '@/lib/utils'

const THUMB_HEIGHT = 116
const TRACK_INSET = 8

export function CompactScrollArea({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ pointerY: number; scrollTop: number } | null>(null)
  const [thumb, setThumb] = useState({ visible: false, top: 0 })

  const updateThumb = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const maxScroll = viewport.scrollHeight - viewport.clientHeight
    const travel = Math.max(0, viewport.clientHeight - TRACK_INSET * 2 - THUMB_HEIGHT)
    setThumb({
      visible: maxScroll > 1,
      top: maxScroll > 0 ? (viewport.scrollTop / maxScroll) * travel : 0,
    })
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const observer = new ResizeObserver(updateThumb)
    observer.observe(viewport)
    if (viewport.firstElementChild) observer.observe(viewport.firstElementChild)
    updateThumb()
    return () => observer.disconnect()
  }, [children, updateThumb])

  const moveThumb = (event: PointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current
    const drag = dragRef.current
    if (!viewport || !drag) return
    const travel = Math.max(1, viewport.clientHeight - TRACK_INSET * 2 - THUMB_HEIGHT)
    const maxScroll = viewport.scrollHeight - viewport.clientHeight
    viewport.scrollTop = drag.scrollTop + ((event.clientY - drag.pointerY) / travel) * maxScroll
  }

  return (
    <div className="group/compact-scroll relative min-h-0 flex-1">
      <div ref={viewportRef} onScroll={updateThumb} className={cn('compact-scroll-viewport h-full overflow-y-auto', className)} {...props}>
        {children}
      </div>
      {thumb.visible && (
        <div
          aria-hidden="true"
          className="absolute inset-y-2 right-1 z-20 w-1 cursor-pointer rounded-full"
          onPointerDown={(event) => {
            if (event.target !== event.currentTarget) return
            const viewport = viewportRef.current
            if (!viewport) return
            const bounds = event.currentTarget.getBoundingClientRect()
            const travel = Math.max(1, bounds.height - THUMB_HEIGHT)
            const nextTop = Math.min(travel, Math.max(0, event.clientY - bounds.top - THUMB_HEIGHT / 2))
            viewport.scrollTop = (nextTop / travel) * (viewport.scrollHeight - viewport.clientHeight)
          }}
        >
          <div
            className="absolute left-0 h-[116px] w-1 touch-none cursor-grab rounded-full bg-slate-400/55 transition-colors hover:bg-slate-500/75 active:cursor-grabbing dark:bg-slate-400/45 dark:hover:bg-slate-300/70"
            style={{ transform: `translateY(${thumb.top}px)` }}
            onPointerDown={(event) => {
              const viewport = viewportRef.current
              if (!viewport) return
              event.currentTarget.setPointerCapture(event.pointerId)
              dragRef.current = { pointerY: event.clientY, scrollTop: viewport.scrollTop }
            }}
            onPointerMove={moveThumb}
            onPointerUp={(event) => {
              dragRef.current = null
              event.currentTarget.releasePointerCapture(event.pointerId)
            }}
            onPointerCancel={() => { dragRef.current = null }}
          />
        </div>
      )}
    </div>
  )
}
