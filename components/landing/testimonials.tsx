import Image from 'next/image'

const testimonials = [
  {
    quote: 'Imara replaced three different tools we were running — POS, stock, and M-Pesa. End-of-day reconciliation dropped from 2 hours to under 15 minutes.',
    name: 'Wanjiku Kamau',
    role: 'Owner',
    business: 'Kamau Supermarket, Thika',
    avatar: '/avatars/wanjiku.png',
  },
  {
    quote: 'M-Pesa integration is completely seamless. Customer pays, it hits our account, the system reconciles it automatically. I used to dread end-of-day.',
    name: 'Brian Otieno',
    role: 'Manager',
    business: 'Otieno Hardware, Kisumu',
    avatar: '/avatars/brian.png',
  },
  {
    quote: 'Managing inventory across three pharmacy branches was a nightmare before Imara. Now I see every location from my phone in real time.',
    name: 'Amina Hassan',
    role: 'Director',
    business: 'Hassan Pharmacy Group, Mombasa',
    avatar: '/avatars/amina.png',
  },
  {
    quote: 'The POS and client records combo is everything for us. Clients earn loyalty points and I can see exactly which stylist is generating the most revenue per shift.',
    name: 'Njeri Muthoni',
    role: 'Founder',
    business: 'Glow Beauty Studio, Nairobi',
    avatar: '/avatars/njeri.png',
  },
  {
    quote: 'The analytics are genuinely useful. Top-selling categories, slow movers, peak hours — all there without building a single spreadsheet.',
    name: 'David Kimani',
    role: 'CEO',
    business: 'Kimani Wholesale, Nakuru',
    avatar: '/avatars/david.png',
  },
  {
    quote: 'Setup was faster than I expected. We were live on day one with all our inventory imported. Support answered every question the same day.',
    name: 'Grace Achieng',
    role: 'Owner',
    business: 'Achieng Restaurant, Eldoret',
    avatar: '/avatars/grace.png',
  },
  {
    quote: 'Before Imara I was running inventory on a notebook and WhatsApp. Now everything is digital, tracked, and accurate. I know my margins on every product.',
    name: 'James Mwangi',
    role: 'Owner',
    business: 'Mwangi General Store, Nyeri',
    avatar: '/avatars/david.png',
  },
  {
    quote: 'The multi-branch feature alone is worth every shilling. I open one screen each morning and see how all four of my salons are doing — staff, stock, revenue.',
    name: 'Fatuma Ali',
    role: 'Director',
    business: 'Ali Beauty Centers, Nairobi',
    avatar: '/avatars/amina.png',
  },
]

const row1 = testimonials.slice(0, 4)
const row2 = testimonials.slice(4)

function Stars() {
  return (
    <div className="flex gap-0.5" aria-label="5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

function Card({ t }: { t: typeof testimonials[0] }) {
  return (
    <div className="w-[320px] shrink-0 fluent-card p-5 flex flex-col gap-4 select-none">
      <Stars />
      <p className="text-sm text-foreground leading-relaxed flex-1">
        &ldquo;{t.quote}&rdquo;
      </p>
      <div className="flex items-center gap-3 pt-3 border-t border-border">
        <div className="relative h-9 w-9 rounded-full overflow-hidden shrink-0 bg-secondary">
          <Image src={t.avatar} alt={t.name} fill className="object-cover" sizes="36px" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{t.name}</p>
          <p className="text-[11px] text-muted-foreground truncate">{t.role} &mdash; {t.business}</p>
        </div>
      </div>
    </div>
  )
}

function MarqueeRow({ items, reverse = false }: { items: typeof testimonials; reverse?: boolean }) {
  const doubled = [...items, ...items]
  return (
    <div className="overflow-hidden">
      <div
        className={`flex gap-4 w-max ${reverse ? 'animate-marquee-reverse' : 'animate-marquee'}`}
        style={{ willChange: 'transform' }}
      >
        {doubled.map((t, i) => (
          <Card key={`${t.name}-${i}`} t={t} />
        ))}
      </div>
    </div>
  )
}

export function LandingTestimonials() {
  return (
    <section className="section-padding bg-secondary/20 overflow-hidden">
      <div className="container-wide mb-12">
        <div className="text-center max-w-xl mx-auto">
          <p className="section-eyebrow mb-3">Customer Stories</p>
          <h2 className="section-heading mb-4">
            Real businesses. Real results.
          </h2>
          <p className="section-subheading mx-auto">
            From corner shops in Thika to multi-branch pharmacies in Mombasa — thousands of Kenyan businesses trust Imara every day.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 relative">
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-secondary/20 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-secondary/20 to-transparent z-10 pointer-events-none" />
        <MarqueeRow items={row1} />
        <MarqueeRow items={row2} reverse />
      </div>

      <div className="container-wide mt-12">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} className="h-5 w-5 fill-amber-400 text-amber-400" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">4.9 out of 5</span> &mdash; rated by 5,000+ businesses across Kenya
          </p>
        </div>
      </div>
    </section>
  )
}
