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
  },
  {
    quote: 'M-Pesa integration is completely seamless. Customer pays, it hits our account, the system reconciles it automatically. I used to dread end-of-day.',
    name: 'Brian Otieno',
    role: 'Manager',
    business: 'Otieno Hardware, Kisumu',
    avatar: '/avatars/brian.png',
    initials: 'BO',
  },
  {
    quote: 'Managing inventory across three pharmacy branches was a nightmare before Imara. Now I see every location from my phone in real time.',
    name: 'Amina Hassan',
    role: 'Director',
    business: 'Hassan Pharmacy Group, Mombasa',
    avatar: '/avatars/amina.png',
    initials: 'AH',
  },
  {
    quote: 'The POS and client records combo is everything for us. Clients earn loyalty points and I can see exactly which stylist is generating the most revenue per shift.',
    name: 'Njeri Muthoni',
    role: 'Founder',
    business: 'Glow Beauty Studio, Nairobi',
    avatar: '/avatars/njeri.png',
    initials: 'NM',
  },
  {
    quote: 'The analytics are genuinely useful. Top-selling categories, slow movers, peak hours — all there without building a single spreadsheet.',
    name: 'David Kimani',
    role: 'CEO',
    business: 'Kimani Wholesale, Nakuru',
    avatar: '/avatars/david.png',
    initials: 'DK',
  },
  {
    quote: 'Setup was faster than I expected. We were live on day one with all our inventory imported. Support answered every question the same day.',
    name: 'Grace Achieng',
    role: 'Owner',
    business: 'Achieng Restaurant, Eldoret',
    avatar: '/avatars/grace.png',
    initials: 'GA',
  },
  {
    quote: 'Before Imara I was running inventory on a notebook and WhatsApp. Now everything is digital, tracked, and accurate. I know my margins on every product.',
    name: 'James Mwangi',
    role: 'Owner',
    business: 'Mwangi General Store, Nyeri',
    avatar: '/avatars/james.png',
    initials: 'JM',
  },
  {
    quote: 'The multi-branch feature alone is worth every shilling. I open one screen each morning and see how all four of my salons are doing — staff, stock, revenue.',
    name: 'Fatuma Ali',
    role: 'Director',
    business: 'Ali Beauty Centers, Nairobi',
    avatar: '/avatars/fatuma.png',
    initials: 'FA',
  },
]

export function LandingTestimonials() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [autoplayRef] = useState(() => Autoplay({ 
    delay: 6000, 
    stopOnInteraction: true,
    stopOnMouseEnter: true,
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

    return () => emblaApi.off('select', selectHandler)
  }, [emblaApi])

  const scroll = (direction: 'prev' | 'next') => {
    if (emblaApi) {
      direction === 'prev' ? emblaApi.scrollPrev() : emblaApi.scrollNext()
    }
  }

  const handleDotClick = (index: number) => {
    if (emblaApi) {
      emblaApi.scrollTo(index)
      autoplayRef.reset()
    }
  }

  return (
    <section className="py-16 sm:py-24 md:py-28 px-4 bg-background border-t border-border">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-16 sm:mb-20">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-primary mb-4">Trusted by thousands</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-5 leading-tight">
            Loved by business owners across Kenya
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            See how real businesses are transforming their operations with Imara
          </p>
        </div>

        {/* Testimonial Display */}
        <div className="relative">
          {/* Current Testimonial Card */}
          <div className="mb-10 sm:mb-14">
            <div className="rounded-2xl border border-border bg-card p-8 sm:p-10 lg:p-12 shadow-sm hover:shadow-md transition-shadow duration-300 min-h-[280px] sm:min-h-[300px] flex flex-col justify-between">
              {/* Quote Mark */}
              <div className="inline-flex w-fit mb-6">
                <svg className="h-8 w-8 text-primary/20" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 21c3 0 7-1 7-8V5c0-1.25-4.716-2-6.142-2.642C2.337 2.4 1 3.667 1 5v10c0 1 0 7 8 7h8c1 0 1-1 1-1v-5.5c0-.5 0-1-1-1-1 0-4 .5-4-2s4-5 4-6V5c0-.5-.5-1-1-1-1 0-3 .5-4-2s4-5 6-5 6 1 6 8v10" />
                </svg>
              </div>

              {/* Quote Text */}
              <p className="text-lg sm:text-xl text-foreground leading-relaxed font-medium mb-8 flex-1">
                {testimonials[selectedIndex].quote}
              </p>

              {/* Author Info */}
              <div className="flex items-center gap-4 pt-6 border-t border-border">
                <div className="relative h-12 w-12 rounded-full overflow-hidden bg-gradient-to-br from-primary/40 to-primary/20 flex-shrink-0">
                  <Image
                    src={testimonials[selectedIndex].avatar}
                    alt={testimonials[selectedIndex].name}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                  {!testimonials[selectedIndex].avatar && (
                    <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                      {testimonials[selectedIndex].initials}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{testimonials[selectedIndex].name}</p>
                  <p className="text-xs text-muted-foreground">{testimonials[selectedIndex].role} • {testimonials[selectedIndex].business}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => scroll('prev')}
                className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="h-5 w-5 text-foreground" />
              </button>
              <button
                onClick={() => scroll('next')}
                className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
                aria-label="Next testimonial"
              >
                <ChevronRight className="h-5 w-5 text-foreground" />
              </button>
            </div>

            {/* Dots indicator */}
            <div className="flex gap-1.5 flex-wrap justify-center">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleDotClick(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === selectedIndex
                      ? 'bg-primary w-8'
                      : 'bg-border hover:bg-primary/40 w-2 hover:w-3'
                  }`}
                  aria-label={`Go to testimonial ${i + 1}`}
                  aria-current={i === selectedIndex ? 'true' : 'false'}
                />
              ))}
            </div>

            {/* Stats */}
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">{selectedIndex + 1} of {testimonials.length}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
