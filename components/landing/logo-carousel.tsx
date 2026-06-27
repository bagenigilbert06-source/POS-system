'use client'

import { useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'

export function LogoCarousel() {
  const [emblaRef] = useEmblaCarousel(
    { loop: true, align: 'center', skipSnaps: false },
    [Autoplay({ playOnInit: true, delay: 3000 })]
  )

  const companies = [
    { name: 'M-Pesa', description: 'Mobile Payment' },
    { name: 'Safaricom', description: 'Telecom Partner' },
    { name: 'Kenya Revenue Authority', description: 'Tax Compliance' },
    { name: 'Commercial Bank', description: 'Banking Integration' },
    { name: 'Equity Bank', description: 'Financial Services' },
    { name: 'Co-op Bank', description: 'Business Banking' },
  ]

  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-4">
            Trusted Integrations
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Powerful Partnerships
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Seamlessly integrated with Kenya&apos;s leading financial and telecom providers
          </p>
        </div>

        {/* Carousel */}
        <div className="relative">
          <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
            <div className="flex gap-8 md:gap-12 px-4">
              {companies.map((company, idx) => (
                <div
                  key={idx}
                  className="flex-shrink-0 w-48 md:w-64 flex flex-col items-center justify-center gap-3 p-8 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300 group cursor-pointer"
                >
                  {/* Logo placeholder - Material UI style */}
                  <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-300">
                    <div className="text-lg font-bold text-primary">
                      {company.name.substring(0, 2).toUpperCase()}
                    </div>
                  </div>
                  <h3 className="text-center font-semibold text-foreground text-sm">
                    {company.name}
                  </h3>
                  <p className="text-xs text-muted-foreground text-center">
                    {company.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Gradient overlays */}
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
        </div>

        {/* Trust statement */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground inline-flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-full px-4 py-2">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            Trusted by 5000+ Kenyan businesses nationwide
          </p>
        </div>
      </div>
    </section>
  )
}
