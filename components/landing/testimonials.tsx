import Image from 'next/image'

const testimonials = [
  {
    quote:
      'Imara completely replaced three different tools we were running. Stock, POS, and M-Pesa payments — all in one place. End-of-day reconciliation dropped from 2 hours to under 15 minutes.',
    name: 'Wanjiku Kamau',
    role: 'Owner, Kamau Supermarket',
    location: 'Thika',
    avatar: '/avatars/wanjiku.png',
    rating: 5,
  },
  {
    quote:
      'The M-Pesa integration is completely seamless. Customer pays, it hits our account, and the system reconciles it automatically. I used to dread end-of-day — now it takes two clicks.',
    name: 'Brian Otieno',
    role: 'Manager, Otieno Hardware',
    location: 'Kisumu',
    avatar: '/avatars/brian.png',
    rating: 5,
  },
  {
    quote:
      'Managing inventory across three pharmacy branches was a nightmare before Imara. Now I can see every location from my phone in real time. I caught a stock discrepancy within minutes of it happening.',
    name: 'Amina Hassan',
    role: 'Director, Hassan Pharmacy Group',
    location: 'Mombasa',
    avatar: '/avatars/amina.png',
    rating: 5,
  },
  {
    quote:
      'We run a busy salon and the POS + client records combo is everything. Clients pay, earn loyalty points, and I can see exactly which stylist is generating the most revenue per shift.',
    name: 'Njeri Muthoni',
    role: 'Founder, Glow Beauty Studio',
    location: 'Westlands, Nairobi',
    avatar: '/avatars/njeri.png',
    rating: 5,
  },
  {
    quote:
      'The analytics are genuinely useful. Top-selling categories, slow movers, peak hours — all there without me building a single spreadsheet. It just tells me what I need to know.',
    name: 'David Kimani',
    role: 'CEO, Kimani Wholesale',
    location: 'Nakuru',
    avatar: '/avatars/david.png',
    rating: 5,
  },
  {
    quote:
      'Setup was faster than I expected. We were live on day one with all our inventory imported. The support team answered every question the same day. I recommend Imara to every business owner I know.',
    name: 'Grace Achieng',
    role: 'Owner, Achieng Restaurant',
    location: 'Eldoret',
    avatar: '/avatars/grace.png',
    rating: 5,
  },
  {
    quote:
      'Before Imara, I was running inventory on a notebook and WhatsApp. Now everything is digital, tracked, and accurate. I know my margins on every product without doing any manual calculation.',
    name: 'James Mwangi',
    role: 'Owner, Mwangi General Store',
    location: 'Nyeri',
    avatar: '/avatars/david.png',
    rating: 5,
  },
  {
    quote:
      'The multi-branch feature alone is worth every shilling. I open one screen in the morning and I can see how all four of my salons are doing — staff, stock, revenue. All of it.',
    name: 'Fatuma Ali',
    role: 'Director, Ali Beauty Centers',
    location: 'Nairobi',
    avatar: '/avatars/amina.png',
    rating: 5,
  },
]

// Split into two rows for the dual-marquee effect
const row1 = testimonials.slice(0, 4)
const row2 = testimonials.slice(4, 8)

function StarRating() {
  return (
    <div className="flex gap-0.5" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className="h-3.5 w-3.5 text-amber-400 fill-amber-400" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

function TestimonialCard({ t }: { t: typeof testimonials[0] }) {
  return (
    <div className="w-[340px] shrink-0 fluent-card p-6 flex flex-col gap-4 select-none">
      <StarRating />
      <p className="text-sm text-foreground leading-relaxed flex-1">
        &ldquo;{t.quote}&rdquo;
      </p>
      <div className="flex items-center gap-3 pt-3 border-t border-border">
        <div className="relative h-10 w-10 rounded-full overflow-hidden shrink-0 bg-secondary">
          <Image
            src={t.avatar}
            alt={t.name}
            fill
            className="object-cover"
            sizes="40px"
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground leading-tight">{t.name}</p>
          <p className="text-xs text-muted-foreground">{t.role}</p>
          <p className="text-[11px] text-muted-foreground/70">{t.location}</p>
        </div>
      </div>
    </div>
  )
}

function MarqueeRow({
  items,
  reverse = false,
}: {
  items: typeof testimonials
  reverse?: boolean
}) {
  // Duplicate items for seamless infinite loop
  const doubled = [...items, ...items]
  return (
    <div className="overflow-hidden">
      <div
        className={`flex gap-4 w-max ${
          reverse ? 'animate-marquee-reverse' : 'animate-marquee'
        }`}
        style={{ willChange: 'transform' }}
      >
        {doubled.map((t, i) => (
          <TestimonialCard key={`${t.name}-${i}`} t={t} />
        ))}
      </div>
    </div>
  )
}

export function LandingTestimonials() {
  return (
    <section className="section-padding bg-background overflow-hidden">
      <div className="container-wide mb-12">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto">
          <p className="section-eyebrow mb-3">Customer Stories</p>
          <h2 className="section-heading mb-4">
            Real businesses. Real results.
          </h2>
          <p className="section-subheading mx-auto">
            From corner shops in Thika to multi-branch pharmacies in Mombasa — Imara is helping thousands of Kenyan businesses thrive.
          </p>
        </div>
      </div>

      {/* Dual marquee rows — edge-to-edge, overflow the container */}
      <div className="flex flex-col gap-4 relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        <MarqueeRow items={row1} />
        <MarqueeRow items={row2} reverse />
      </div>

      {/* Bottom aggregate rating */}
      <div className="container-wide mt-12 flex flex-col sm:flex-row items-center justify-center gap-3">
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <svg key={i} className="h-5 w-5 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">4.9 out of 5</span> — rated by 5,000+ businesses
        </p>
      </div>
    </section>
  )
}
