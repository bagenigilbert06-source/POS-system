import { redirect } from 'next/navigation'

// This old route group is superseded by /dashboard
export default function OldRootLayout({ children }: { children: React.ReactNode }) {
  redirect('/dashboard')
}
