'use client'

import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const testimonials = [
  {
    quote: 'PESABY replaced three different tools we were running — POS, stock, and M-Pesa. End-of-day reconciliation dropped from 2 hours to under 15 minutes.',
    name: 'Wanjiku Kamau',
    role: 'Owner, Kamau Supermarket',
    location: 'Thika',
    initials: 'WK',
    color: 'bg-blue-600',
  },
  {
    quote: 'M-Pesa integration is completely seamless. Customer pays, it hits our account, the system reconciles it automatically. I used to dread end-of-day.',
    name: 'Brian Otieno',
    role: 'Manager, Otieno Hardware',
    location: 'Kisumu',
    initials: 'BO',
    color: 'bg-sky-600',
  },
  {
    quote: 'Managing inventory across three pharmacy branches was a nightmare before PESABY. Now I see every location from my phone in real time.',
    name: 'Amina Hassan',
    role: 'Director, Hassan Pharmacy Group',
    location: 'Mombasa',
    initials: 'AH',
    color: 'bg-violet-600',
  },
  {
    quote: 'The POS and client records combo is everything for us. Clients earn loyalty points and I can see exactly which stylist is generating the most revenue.',
    name: 'Njeri Muthoni',
    role: 'Founder, Glow Beauty Studio',
    location: 'Nairobi',
    initials: 'NM',
    color: 'bg-pink-600',
  },
  {
    quote: 'The analytics are genuinely useful. Top-selling categories, slow movers, peak hours — all there without building a single spreadsheet.',
    name: 'David Kimani',
    role: 'CEO, Kimani Wholesale',
    location: 'Nakuru',
    initials: 'DK',
    color: 'bg-emerald-600',
  },
  {
    quote: 'Setup was faster than I expected. We were live on day one with all our inventory imported. Support answered every question the same day.',
    name: 'Grace Achieng',
    role: 'Owner, Achieng Restaurant',
    location: 'Eldoret',
    initials: 'GA',
    color: 'bg-amber-600',
  },
]

function StarRating() {
  return (
    <div className="flex gap-1" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 20 20" aria-hidden="true" className="text-amber-400">
          <path fill="currentColor" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

export function LandingTestimonials() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { align: 'start', loop: true, slidesToScroll: 1, containScroll: 'trimSnaps' },
    [Autoplay({ delay: 5500, stopOnInteraction: false, stopOnMouseEnter: true })]
  )

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap())
    emblaApi.on('select', onSelect)
    onSelect()
    return () => { emblaApi.off('select', onSelect) }
  }, [emblaApi])

  const scroll = (dir: 'prev' | 'next') => emblaApi && (dir === 'prev' ? emblaApi.scrollPrev() : emblaApi.scrollNext())

  return (
    <section className="section-padding-premium bg-secondary border-b border-border">
      <div className="container-wide">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
          <div className="max-w-lg">
            <p className="section-eyebrow mb-3">Customer Stories</p>
            <h2 className="section-heading text-3xl md:text-4xl lg:text-5xl leading-tight">
              Real businesses. Real results.
            </h2>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <StarRating />
              <span className="text-sm font-bold text-foreground">4.9 / 5</span>
            </div>
            <p className="text-xs text-muted-foreground">Rated by 5,000+ businesses across East Africa</p>
          </div>
        </div>

        {/* Carousel */}
        <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
          <div className="flex gap-4 md:gap-6">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="flex-[0_0_100%] sm:flex-[0_0_calc(50%-12px)] lg:flex-[0_0_calc(33.333%-16px)] min-w-0"
              >
                <div className="h-full rounded-2xl border border-border bg-card p-6 flex flex-col gap-5 hover:border-primary/30 transition-colors duration-200">
                  <StarRating />
                  <p className="text-sm text-foreground leading-relaxed flex-1">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3 pt-4 border-t border-border">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${t.color}`}>
                      <span className="text-white font-bold text-xs">{t.initials}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role} · {t.location}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mt-8">
          <div className="flex gap-2">
            <button
              onClick={() => scroll('prev')}
              className="h-10 w-10 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all duration-150"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll('next')}
              className="h-10 w-10 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all duration-150"
              aria-label="Next testimonial"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => emblaApi?.scrollTo(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === selectedIndex ? 'bg-primary w-6' : 'bg-border w-2 hover:bg-primary/40'}`}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
