'use client'

import { useEffect, useState } from 'react'

interface TypewriterProps {
  text: string
  speed?: number
  delay?: number
  className?: string
  cursor?: boolean
}

export function Typewriter({
  text,
  speed = 50,
  delay = 0,
  className = '',
  cursor = true,
}: TypewriterProps) {
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    if (delay > 0) {
      timeoutId = setTimeout(() => setIsTyping(true), delay)
    } else {
      setIsTyping(true)
    }

    return () => clearTimeout(timeoutId)
  }, [delay])

  useEffect(() => {
    if (!isTyping) return

    let index = 0
    const intervalId = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1))
        index++
      } else {
        clearInterval(intervalId)
      }
    }, speed)

    return () => clearInterval(intervalId)
  }, [isTyping, text, speed])

  return (
    <span className={className}>
      {displayedText}
      {cursor && isTyping && displayedText.length < text.length && (
        <span className="animate-pulse">|</span>
      )}
    </span>
  )
}
