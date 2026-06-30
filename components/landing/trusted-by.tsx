import { Sparkles } from 'lucide-react'

export function TrustedBy() {
  return (
    <section className="py-12 md:py-16 bg-background border-t border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 md:gap-6">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span>Trusted by leading businesses</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 md:gap-10 items-center">
            {[
              { name: 'Retailer 1', initials: 'R1' },
              { name: 'Retailer 2', initials: 'R2' },
              { name: 'Restaurant 3', initials: 'R3' },
              { name: 'Pharmacy 4', initials: 'P4' },
              { name: 'Clinic 5', initials: 'C5' },
            ].map((company) => (
              <div
                key={company.name}
                className="flex items-center justify-center h-12 text-gray-400 font-semibold text-lg"
              >
                {company.initials}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
