'use client'

import Image from 'next/image'

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
  return (
    <section className="py-16 sm:py-20 md:py-24 px-4 bg-background">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-primary mb-3">Customer Stories</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            Real businesses. Real results.
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            From corner shops in Thika to multi-branch pharmacies in Mombasa — thousands of Kenyan businesses trust Imara every day.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm p-6 hover:border-primary/30 hover:bg-white/70 dark:hover:bg-slate-950/70 transition-all duration-300 flex flex-col"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} width="16" height="16" viewBox="0 0 20 20" className="text-amber-400">
                    <path fill="currentColor" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <p className="text-sm text-foreground leading-relaxed mb-6 flex-1">
                &quot;{t.quote}&quot;
              </p>

              {/* Footer */}
              <div className="pt-4 border-t border-border flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
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
                  <span className="text-white font-bold text-xs" style={{ display: 'none' }}>
                    {t.initials}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.role} — {t.business}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Rating footer */}
        <div className="text-center border-t border-border pt-8 sm:pt-12">
          <div className="flex justify-center gap-1 mb-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} width="20" height="20" viewBox="0 0 20 20" className="text-amber-400">
                <path fill="currentColor" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">4.9 out of 5</strong> — rated by 5,000+ businesses across Kenya
          </p>
        </div>
      </div>
    </section>
  )
}
