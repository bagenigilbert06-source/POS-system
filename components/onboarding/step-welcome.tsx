'use client'

import { CheckCircle2, Sparkles, Zap, TrendingUp } from 'lucide-react'

interface StepWelcomeProps {
  businessName: string
}

export function StepWelcome({ businessName }: StepWelcomeProps) {
  return (
    <div className="space-y-10 text-center">
      <div className="flex justify-center pt-4">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
          <CheckCircle2 className="h-24 w-24 text-primary relative animate-bounce" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-4xl font-bold text-foreground leading-tight">Welcome to IMARA!</h2>
        <p className="text-lg text-muted-foreground leading-relaxed">
          {businessName && `${businessName} is all set up and ready to go.`}
          {!businessName && `You&apos;re all set up and ready to go.`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6">
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-5 space-y-3 text-left">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5 text-primary flex-shrink-0" />
            <h3 className="font-semibold text-sm text-foreground">Quick Start</h3>
          </div>
          <p className="text-xs text-muted-foreground">Add your first product and process a test sale to familiarize yourself with the system.</p>
        </div>

        <div className="rounded-lg bg-primary/5 border border-primary/20 p-5 space-y-3 text-left">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-primary flex-shrink-0" />
            <h3 className="font-semibold text-sm text-foreground">Track & Analyze</h3>
          </div>
          <p className="text-xs text-muted-foreground">Check your dashboard for real-time metrics and detailed insights about your business performance.</p>
        </div>

        <div className="rounded-lg bg-primary/5 border border-primary/20 p-5 space-y-3 text-left">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
            <h3 className="font-semibold text-sm text-foreground">Customize</h3>
          </div>
          <p className="text-xs text-muted-foreground">Fine-tune your settings, add team members, and configure features specific to your business.</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-6 space-y-4 text-left max-w-2xl mx-auto">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-foreground mb-3">Getting Started Tips</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">→</span>
                <span>Add products and organize them into categories for better inventory management</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">→</span>
                <span>Process your first sale to test the checkout flow and POS system</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">→</span>
                <span>Invite team members from the settings to enable collaborative business management</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        You can update your business settings anytime from your account preferences. Need help?<br className="hidden md:block" />
        Visit our help center or contact our support team.
      </p>
    </div>
  )
}
