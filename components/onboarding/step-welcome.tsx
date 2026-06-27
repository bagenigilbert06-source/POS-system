'use client'

import { CheckCircle2, Sparkles } from 'lucide-react'

interface StepWelcomeProps {
  businessName: string
}

export function StepWelcome({ businessName }: StepWelcomeProps) {
  return (
    <div className="space-y-8 text-center">
      <div className="flex justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
          <CheckCircle2 className="h-20 w-20 text-primary relative" />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-3xl font-bold text-foreground">Welcome to Imara!</h2>
        <p className="text-lg text-muted-foreground">
          {businessName && `${businessName} is all set up and ready to go.`}
          {!businessName && `You're all set up and ready to go.`}
        </p>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 space-y-3 text-left">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-foreground text-sm">Quick tips to get started</h3>
            <ul className="space-y-2 mt-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span>Add your first product to start tracking inventory</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span>Process your first sale to test the system</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span>Check the dashboard for key metrics and insights</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        You can always update your business settings later from your account preferences.
      </p>
    </div>
  )
}
