'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'

const testimonials = [
  {
    quote: 'Imara replaced three different tools we were running — POS, stock, and M-Pesa. End-of-day reconciliation dropped from 2 hours to under 15 minutes.',
    name: 'Wanjiku Kamau',
    role: 'Owner',
    business: 'Kamau Supermarket, Thika',
    avatar: '/avatars/wanjiku.png',
    initials: 'WK',
    color: '#2563eb',
  },
  {
    quote: 'M-Pesa integration is completely seamless. Customer pays, it hits our account, the system reconciles it automatically. I used to dread end-of-day.',
    name: 'Brian Otieno',
    role: 'Manager',
    business: 'Otieno Hardware, Kisumu',
    avatar: '/avatars/brian.png',
    initials: 'BO',
    color: '#0891b2',
  },
  {
    quote: 'Managing inventory across three pharmacy branches was a nightmare before Imara. Now I see every location from my phone in real time.',
    name: 'Amina Hassan',
    role: 'Director',
    business: 'Hassan Pharmacy Group, Mombasa',
    avatar: '/avatars/amina.png',
    initials: 'AH',
    color: '#7c3aed',
  },
  {
    quote: 'The POS and client records combo is everything for us. Clients earn loyalty points and I can see exactly which stylist is generating the most revenue per shift.',
    name: 'Njeri Muthoni',
    role: 'Founder',
    business: 'Glow Beauty Studio, Nairobi',
    avatar: '/avatars/njeri.png',
    initials: 'NM',
    color: '#db2777',
  },
  {
    quote: 'The analytics are genuinely useful. Top-selling categories, slow movers, peak hours — all there without building a single spreadsheet.',
    name: 'David Kimani',
    role: 'CEO',
    business: 'Kimani Wholesale, Nakuru',
    avatar: '/avatars/david.png',
    initials: 'DK',
    color: '#059669',
  },
  {
    quote: 'Setup was faster than I expected. We were live on day one with all our inventory imported. Support answered every question the same day.',
    name: 'Grace Achieng',
    role: 'Owner',
    business: 'Achieng Restaurant, Eldoret',
    avatar: '/avatars/grace.png',
    initials: 'GA',
    color: '#d97706',
  },
  {
    quote: 'Before Imara I was running inventory on a notebook and WhatsApp. Now everything is digital, tracked, and accurate. I know my margins on every product.',
    name: 'James Mwangi',
    role: 'Owner',
    business: 'Mwangi General Store, Nyeri',
    avatar: '/avatars/james.png',
    initials: 'JM',
    color: '#0f766e',
  },
  {
    quote: 'The multi-branch feature alone is worth every shilling. I open one screen each morning and see how all four of my salons are doing — staff, stock, revenue.',
    name: 'Fatuma Ali',
    role: 'Director',
    business: 'Ali Beauty Centers, Nairobi',
    avatar: '/avatars/fatuma.png',
    initials: 'FA',
    color: '#be185d',
  },
]


export function LandingTestimonials() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [autoplayRef] = useState(() => Autoplay({ 
    delay: 6000, 
    stopOnInteraction: false,
    stopOnMouseEnter: false,
    rootNode: (emblaRoot) => emblaRoot?.parentElement,
  }))

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: 'start',
      slidesToScroll: 1,
      loop: true,
      skipSnaps: false,
      containScroll: 'trimSnaps',
      dragFree: false,
    },
    [autoplayRef]
  )

  useEffect(() => {
    if (!emblaApi) return

    const selectHandler = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap())
    }

    emblaApi.on('select', selectHandler)
    selectHandler()

    return () => {
      emblaApi.off('select', selectHandler)
    }
  }, [emblaApi])

  const scroll = (direction: 'prev' | 'next') => {
    if (emblaApi) {
      direction === 'prev' ? emblaApi.scrollPrev() : emblaApi.scrollNext()
    }
  }

  const handleDotClick = (index: number) => {
    if (emblaApi) {
      emblaApi.scrollTo(index)
    }
  }

  return (
    <section className="py-16 sm:py-20 md:py-28 px-4 bg-background">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="text-center mb-14 sm:mb-16 md:mb-20">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-primary/90 mb-4">Customer Stories</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            Real businesses. Real results.
          </h2>
          <p className="text-base text-muted-foreground/90 max-w-2xl mx-auto leading-relaxed">
            From corner shops in Thika to multi-branch pharmacies in Mombasa — thousands of Kenyan businesses trust Imara every day.
          </p>
        </div>

        {/* Carousel */}
        <div className="mb-10 sm:mb-12">
          <div className="overflow-hidden rounded-xl" ref={emblaRef}>
            <div className="flex gap-4 sm:gap-6 lg:gap-8">
              {testimonials.map((t, i) => (
                <div
                  key={i}
                  className="flex-[0_0_100%] sm:flex-[0_0_calc(50%-12px)] lg:flex-[0_0_calc(33.333%-16px)] min-w-0"
                >
                  <div className="h-full rounded-2xl border border-border/40 bg-gradient-to-br from-slate-900/30 via-slate-950/50 to-slate-950/40 dark:from-slate-900/40 dark:to-slate-950/60 backdrop-blur-xl p-6 sm:p-7 flex flex-col hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 dark:hover:bg-slate-900/60 transition-all duration-500 ease-out group">
                    {/* Stars */}
                    <div className="flex gap-1.5 mb-5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg key={i} width="18" height="18" viewBox="0 0 20 20" className="text-amber-400/90 group-hover:text-amber-400 transition-colors">
                          <path fill="currentColor" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                      ))}
                    </div>

                    {/* Quote */}
                    <p className="text-sm leading-relaxed mb-6 flex-1 text-foreground/95">
                      &quot;{t.quote}&quot;
                    </p>

                    {/* Divider */}
                    <div className="h-px bg-gradient-to-r from-border/0 via-border/40 to-border/0 mb-5" />

                    {/* Footer */}
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-border/50 group-hover:ring-primary/30 transition-all"
                        style={{ background: t.color }}
                      >
                        <Image
                          src={t.avatar}
                          alt={t.name}
                          width={40}
                          height={40}
                          className="rounded-full w-full h-full object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                        />
                        <span className="text-white font-semibold text-xs">{t.initials}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground/80 truncate">{t.role} · {t.business}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Carousel Controls - Hidden on mobile */}
          <div className="hidden sm:flex items-center justify-between mt-10 sm:mt-12">
            {/* Navigation Arrows */}
            <div className="flex gap-2.5">
              <button
                onClick={() => scroll('prev')}
                className="inline-flex items-center justify-center h-10 w-10 rounded-full border border-border/60 bg-slate-900/40 hover:bg-slate-900/70 hover:border-primary/50 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-90"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="h-5 w-5 text-foreground/70 hover:text-primary group-hover:text-primary" />
              </button>
              <button
                onClick={() => scroll('next')}
                className="inline-flex items-center justify-center h-10 w-10 rounded-full border border-border/60 bg-slate-900/40 hover:bg-slate-900/70 hover:border-primary/50 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-90"
                aria-label="Next testimonial"
              >
                <ChevronRight className="h-5 w-5 text-foreground/70 hover:text-primary group-hover:text-primary" />
              </button>
            </div>

            {/* Dots indicator */}
            <div className="flex gap-2.5">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleDotClick(i)}
                  className={`rounded-full transition-all duration-300 h-1.5 ${
                    i === selectedIndex
                      ? 'bg-primary w-8 shadow-lg shadow-primary/30'
                      : 'bg-border/50 hover:bg-border/80 w-1.5 hover:w-2'
                  }`}
                  aria-label={`Go to testimonial ${i + 1}`}
                  aria-current={i === selectedIndex ? 'true' : 'false'}
                />
              ))}
            </div>

            {/* Rating on the right */}
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} width="16" height="16" viewBox="0 0 20 20" className="text-amber-400/90">
                    <path fill="currentColor" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                ))}
              </div>
              <p className="text-xs text-muted-foreground/80">
                <strong className="text-foreground">4.9/5</strong> from 5K+ users
              </p>
            </div>
          </div>

          {/* Mobile rating - shown on mobile only */}
          <div className="sm:hidden text-center mt-10">
            <div className="flex justify-center gap-1.5 mb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} width="17" height="17" viewBox="0 0 20 20" className="text-amber-400/90">
                  <path fill="currentColor" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              ))}
            </div>
            <p className="text-xs text-muted-foreground/80">
              <strong className="text-foreground">4.9 out of 5</strong> from 5,000+ businesses
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
