'use client'

import { CheckCircle2, Sparkles, Zap, TrendingUp, ArrowRight } from 'lucide-react'

interface StepWelcomeProps {
  businessName: string
}

export function StepWelcome({ businessName }: StepWelcomeProps) {
  return (
    <div className="space-y-12 text-center py-8">
      {/* Celebration icon */}
      <div className="flex justify-center pt-4">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
          <CheckCircle2 className="h-24 w-24 text-primary relative animate-bounce" />
        </div>
      </div>

      {/* Main heading */}
      <div className="space-y-3">
        <h1 className="text-5xl font-bold text-foreground leading-tight">
          Welcome to IMARA
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed">
          {businessName && `${businessName} is all set up and ready to go.`}
          {!businessName && `You're all set up and ready to go.`}
        </p>
      </div>

      {/* Next steps cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8">
        <div className="rounded-2xl bg-card border border-border p-6 space-y-4 text-left shadow-sm-soft hover:shadow-md-soft transition-all">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Quick Start</h3>
          </div>
          <p className="text-sm text-muted-foreground">Add your first product and process a test sale to familiarize yourself with the system.</p>
        </div>

        <div className="rounded-2xl bg-card border border-border p-6 space-y-4 text-left shadow-sm-soft hover:shadow-md-soft transition-all">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Track & Analyze</h3>
          </div>
          <p className="text-sm text-muted-foreground">Check your dashboard for real-time metrics and detailed insights about your business performance.</p>
        </div>

        <div className="rounded-2xl bg-card border border-border p-6 space-y-4 text-left shadow-sm-soft hover:shadow-md-soft transition-all">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Customize</h3>
          </div>
          <p className="text-sm text-muted-foreground">Fine-tune your settings, add team members, and configure features for your business.</p>
        </div>
      </div>

      {/* Pro tips section */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 space-y-4 text-left max-w-2xl mx-auto">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
          <h3 className="font-semibold text-foreground text-base">Getting Started Tips</h3>
        </div>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li className="flex items-start gap-3">
            <ArrowRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <span>Add products and organize them into categories for better inventory management</span>
          </li>
          <li className="flex items-start gap-3">
            <ArrowRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <span>Process your first sale to test the checkout flow and POS system</span>
          </li>
          <li className="flex items-start gap-3">
            <ArrowRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <span>Invite team members from the settings to enable collaborative management</span>
          </li>
        </ul>
      </div>

      {/* Support message */}
      <p className="text-sm text-muted-foreground leading-relaxed">
        You can update your business settings anytime from your account preferences.
        <br className="hidden md:block" />
        Need help? Visit our help center or contact our support team.
      </p>
    </div>
  )
}
