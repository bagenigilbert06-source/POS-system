const testimonials = [
  {
    quote: "Imara completely replaced three different tools we were using. Stock management, POS and payments — all in one place. We cut our daily reconciliation time from 2 hours to under 15 minutes.",
    name: 'Wanjiku Kamau',
    role: 'Owner',
    company: 'Kamau Supermarket, Thika',
    initials: 'WK',
  },
  {
    quote: "The M-Pesa integration is seamless. Customers pay, it hits our account, and the system reconciles automatically. I used to dread end-of-day — now it takes two clicks.",
    name: 'Brian Otieno',
    role: 'Manager',
    company: 'Otieno Hardware, Kisumu',
    initials: 'BO',
  },
  {
    quote: "Managing inventory across three branches was a nightmare before Imara. Now I can see every location from my phone in real time. I caught a stock discrepancy within minutes of it happening.",
    name: 'Amina Hassan',
    role: 'Director',
    company: 'Hassan Pharmacy Group, Mombasa',
    initials: 'AH',
  },
  {
    quote: "We run a busy salon and the appointment + POS combo is everything. Clients pay, get their loyalty points, and we know exactly which stylist is bringing in the most revenue.",
    name: 'Njeri Muthoni',
    role: 'Founder',
    company: 'Glow Beauty Studio, Westlands',
    initials: 'NM',
  },
  {
    quote: "The analytics are genuinely useful. I can see my top-selling categories, slow movers, and peak hours without building a single spreadsheet. It just shows me what I need to know.",
    name: 'David Kimani',
    role: 'CEO',
    company: 'Kimani Wholesale, Nakuru',
    initials: 'DK',
  },
  {
    quote: "Setup was surprisingly fast. We were live on our first day with full inventory imported. The support team answered every question within the hour.",
    name: 'Grace Achieng',
    role: 'Owner',
    company: 'Achieng Restaurant, Eldoret',
    initials: 'GA',
  },
]

export function LandingTestimonials() {
  return (
    <section className="section-padding bg-card/30">
      <div className="container-wide">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-14">
          <p className="section-eyebrow mb-3">Customer Stories</p>
          <h2 className="section-heading mb-4">
            Businesses that trust Imara.
          </h2>
          <p className="section-subheading mx-auto">
            From Nairobi to Mombasa — real businesses, real results.
          </p>
        </div>

        {/* Masonry-style 3-col grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="fluent-card p-6 flex flex-col gap-5 hover:fluent-shadow-8 hover:-translate-y-0.5 transition-all duration-200"
            >
              {/* Stars */}
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} className="h-4 w-4 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <p className="text-sm text-foreground leading-relaxed flex-1">{`"${t.quote}"`}</p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{t.initials}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground leading-tight">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role} · {t.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
