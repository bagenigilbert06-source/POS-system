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
    <section className="py-24 md:py-36 bg-gradient-to-b from-background via-background to-primary/3">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header - MD3 Typography */}
        <div className="text-center mb-20 md:mb-28">
          <p className="text-md3-label-small text-primary mb-6">
            TRUSTED INTEGRATIONS
          </p>
          <h2 className="text-md3-headline-large md:text-md3-display-small mb-6 text-foreground">
            Powerful Partnerships
          </h2>
          <p className="text-md3-body-large text-on-surface-variant max-w-3xl mx-auto">
            Seamlessly integrated with Kenya&apos;s leading financial and telecom providers
          </p>
        </div>

        {/* Carousel - MD3 Cards */}
        <div className="relative">
          <div className="overflow-hidden rounded-3xl" ref={emblaRef}>
            <div className="flex gap-6 md:gap-8 px-4">
              {companies.map((company, idx) => (
                <div
                  key={idx}
                  className="flex-shrink-0 w-56 md:w-72 flex flex-col items-center justify-center gap-4 p-8 rounded-2xl md3-card-elevated border border-border elevation-1 hover:elevation-3 transition-all duration-200 group cursor-pointer"
                >
                  {/* Logo placeholder - MD3 Style with tonal background */}
                  <div className="h-20 w-20 rounded-2xl bg-primary/15 flex items-center justify-center group-hover:bg-primary/25 group-hover:scale-110 transition-all duration-200">
                    <div className="text-2xl font-bold text-primary">
                      {company.name.substring(0, 2).toUpperCase()}
                    </div>
                  </div>
                  
                  {/* Company name - MD3 Headline Small */}
                  <h3 className="text-center text-md3-headline-small text-foreground">
                    {company.name}
                  </h3>
                  
                  {/* Description - MD3 Body Small */}
                  <p className="text-md3-body-small text-on-surface-variant text-center">
                    {company.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* MD3 Gradient overlays - more refined */}
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
        </div>

        {/* Trust statement - MD3 Assist Chip */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 bg-secondary/40 border border-border rounded-full px-5 py-3 elevation-1 hover:elevation-2 transition-all duration-200">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
            <span className="text-md3-label-medium text-muted-foreground">
              Trusted by 5000+ Kenyan businesses nationwide
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
