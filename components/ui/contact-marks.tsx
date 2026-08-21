import Image from 'next/image'

export function GmailMark({ className = 'h-4 w-[21px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 193" aria-hidden="true" className={`${className} shrink-0`} focusable="false">
      <path fill="#4285F4" d="M58.181 192.05V93.451L28.576 66.37 0 50.22v124.306c0 9.69 7.851 17.542 17.542 17.542h40.639Z" />
      <path fill="#34A853" d="M197.82 192.05h40.639c9.69 0 17.542-7.851 17.542-17.542V50.22l-28.576 16.151-29.605 27.08v98.599Z" />
      <path fill="#EA4335" d="M197.82 26.012v67.44L256 50.22V34.783C256 13.115 231.248.76 213.916 13.761L197.82 26.012Z" />
      <path fill="#FBBC04" d="M58.181 93.451v-67.44l69.82 52.364 69.819-52.364v67.44L128 145.816 58.181 93.451Z" />
      <path fill="#C5221F" d="M0 34.783V50.22l58.181 43.231v-67.44L42.084 13.762C24.752.76 0 13.115 0 34.783Z" />
    </svg>
  )
}

export function PhoneMark({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`${className} shrink-0`} focusable="false">
      <path fill="#34A853" d="M6.62 10.79a15.46 15.46 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2Z" />
    </svg>
  )
}

export function GoogleMapsMark({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <Image src="/google-maps-logo-2026-96.png" alt="" width={24} height={24} className={`${className} shrink-0 object-contain`} aria-hidden="true" />
  )
}

export function GoogleCalendarMark({ className = 'h-5 w-5' }: { className?: string }) {
  return <Image src="/google-calendar-logo-2026-96.png" alt="" width={20} height={22} className={`${className} shrink-0 object-contain`} aria-hidden="true" />
}

export function GoogleContactsMark({ className = 'h-5 w-5' }: { className?: string }) {
  return <Image src="/google-contacts-logo-96.png" alt="" width={20} height={20} className={`${className} shrink-0 object-contain`} aria-hidden="true" />
}

export function CashierPosMark({ className = 'h-5 w-5' }: { className?: string }) {
  return <Image src="/cashier-pos-icon.svg" alt="" width={20} height={20} className={`${className} shrink-0 object-contain dark:invert`} aria-hidden="true" />
}
