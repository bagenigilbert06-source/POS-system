'use client'

import { useEffect, useState } from 'react'

function hourInTimeZone(timeZone: string) {
  try {
    const hour = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date()).find((part) => part.type === 'hour')?.value
    return Number(hour ?? new Date().getHours())
  } catch {
    return new Date().getHours()
  }
}

function greetingForHour(hour: number) {
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  if (hour >= 17 && hour < 21) return 'Good evening'
  return 'Good night'
}

export function TimeGreeting({ name, timeZone, className }: { name?: string | null; timeZone: string; className?: string }) {
  const firstName = name?.trim().split(/\s+/)[0]
  const fallback = firstName ? `Welcome, ${firstName}` : 'Welcome'
  const [message, setMessage] = useState(fallback)

  useEffect(() => {
    const update = () => {
      const greeting = greetingForHour(hourInTimeZone(timeZone))
      setMessage(firstName ? `${greeting}, ${firstName}` : greeting)
    }
    update()
    const timer = window.setInterval(update, 60_000)
    return () => window.clearInterval(timer)
  }, [firstName, timeZone])

  return <span className={className}>{message}</span>
}
