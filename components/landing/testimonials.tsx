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

const row1 = testimonials.slice(0, 4)
const row2 = testimonials.slice(4)

function Stars() {
  return (
    <div className="t-stars" aria-label="5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="13" height="13" viewBox="0 0 20 20" aria-hidden="true">
          <path fill="#f59e0b" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      ))}
    </div>
  )
}

function Avatar({ src, name, initials, color }: { src: string; name: string; initials: string; color: string }) {
  return (
    <div className="t-avatar" style={{ background: color }}>
      <Image
        src={src}
        alt={name}
        fill
        className="t-avatar-img"
        sizes="40px"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
      />
      <span className="t-avatar-fallback">{initials}</span>
    </div>
  )
}

function Card({ t }: { t: typeof testimonials[0] }) {
  return (
    <article className="t-card" aria-label={`Testimonial from ${t.name}`}>
      <Stars />
      <blockquote className="t-quote">"{t.quote}"</blockquote>
      <footer className="t-footer">
        <div className="t-avatar-wrap">
          <Avatar src={t.avatar} name={t.name} initials={t.initials} color={t.color} />
        </div>
        <div className="t-meta">
          <p className="t-name">{t.name}</p>
          <p className="t-role">{t.role} &mdash; {t.business}</p>
        </div>
      </footer>
    </article>
  )
}

function MarqueeRow({ items, reverse = false }: { items: typeof testimonials; reverse?: boolean }) {
  const doubled = [...items, ...items]
  return (
    <div className="t-row-wrap">
      <div
        className="t-row"
        style={{ animationName: reverse ? 't-scroll-reverse' : 't-scroll', willChange: 'transform' }}
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
    <section className="t-section">

      {/* Header */}
      <div className="t-header">
        <span className="t-eyebrow">Customer Stories</span>
        <h2 className="t-headline">Real businesses. Real results.</h2>
        <p className="t-sub">
          From corner shops in Thika to multi-branch pharmacies in Mombasa —
          thousands of Kenyan businesses trust Imara every day.
        </p>
      </div>

      {/* Marquee rows */}
      <div className="t-marquee-area">
        <div className="t-fade t-fade-left"  aria-hidden="true" />
        <div className="t-fade t-fade-right" aria-hidden="true" />
        <div className="t-rows">
          <MarqueeRow items={row1} />
          <MarqueeRow items={row2} reverse />
        </div>
      </div>

      {/* Rating footer */}
      <div className="t-rating">
        <div className="t-rating-stars">
          {Array.from({ length: 5 }).map((_, i) => (
            <svg key={i} width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
              <path fill="#f59e0b" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
          ))}
        </div>
        <p className="t-rating-text">
          <strong>4.9 out of 5</strong> &mdash; rated by 5,000+ businesses across Kenya
        </p>
      </div>

      <style>{`
        /* ── Section ───────────────────────────────────────────── */
        .t-section {
          width: 100%;
          background: hsl(var(--secondary));
          border-top: 1px solid hsl(var(--border));
          border-bottom: 1px solid hsl(var(--border));
          padding: 96px 0;
          overflow: hidden;
          box-sizing: border-box;
        }

        /* ── Header ────────────────────────────────────────────── */
        .t-header {
          text-align: center;
          max-width: 560px;
          margin: 0 auto 56px;
          padding: 0 24px;
        }

        .t-eyebrow {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: hsl(var(--primary));
          margin-bottom: 12px;
        }

        .t-headline {
          margin: 0 0 14px;
          font-size: clamp(1.6rem, 3.5vw, 2.2rem);
          font-weight: 750;
          color: hsl(var(--foreground));
          letter-spacing: -0.03em;
          line-height: 1.15;
        }

        .t-sub {
          margin: 0;
          font-size: 0.9375rem;
          color: hsl(var(--muted-foreground));
          line-height: 1.65;
        }

        /* ── Marquee area ──────────────────────────────────────── */
        .t-marquee-area {
          position: relative;
        }

        .t-fade {
          pointer-events: none;
          position: absolute;
          inset-block: 0;
          z-index: 10;
          width: 96px;
        }
        .t-fade-left  { left: 0;  background: linear-gradient(to right, hsl(var(--secondary)) 30%, transparent); }
        .t-fade-right { right: 0; background: linear-gradient(to left,  hsl(var(--secondary)) 30%, transparent); }

        .t-rows {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* ── Marquee row ───────────────────────────────────────── */
        .t-row-wrap {
          overflow: hidden;
        }

        .t-row {
          display: flex;
          gap: 16px;
          width: max-content;
          animation-duration: 38s;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          pointer-events: none;
          user-select: none;
        }

        @keyframes t-scroll         { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes t-scroll-reverse { from { transform: translateX(-50%); } to { transform: translateX(0); } }

        @media (prefers-reduced-motion: reduce) {
          .t-row { animation: none !important; }
        }

        /* ── Card ──────────────────────────────────────────────── */
        .t-card {
          width: 340px;
          flex-shrink: 0;
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          box-shadow:
            0 1px 2px rgba(0,0,0,0.04),
            0 4px 12px rgba(0,0,0,0.04);
          box-sizing: border-box;
        }

        /* ── Stars ─────────────────────────────────────────────── */
        .t-stars {
          display: flex;
          gap: 2px;
        }

        /* ── Quote ─────────────────────────────────────────────── */
        .t-quote {
          margin: 0;
          font-size: 0.875rem;
          color: hsl(var(--foreground));
          line-height: 1.7;
          font-style: normal;
          flex: 1;
        }

        /* ── Footer ────────────────────────────────────────────── */
        .t-footer {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-top: 16px;
          border-top: 1px solid hsl(var(--border));
          margin-top: auto;
        }

        /* ── Avatar ────────────────────────────────────────────── */
        .t-avatar-wrap {
          flex-shrink: 0;
        }

        .t-avatar {
          position: relative;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .t-avatar-img {
          object-fit: cover;
        }

        .t-avatar-fallback {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          color: #fff;
          letter-spacing: 0.02em;
          z-index: 0;
        }

        /* ── Meta ──────────────────────────────────────────────── */
        .t-meta {
          min-width: 0;
        }

        .t-name {
          margin: 0 0 2px;
          font-size: 0.8125rem;
          font-weight: 700;
          color: hsl(var(--foreground));
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .t-role {
          margin: 0;
          font-size: 0.6875rem;
          color: hsl(var(--muted-foreground));
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ── Rating footer ─────────────────────────────────────── */
        .t-rating {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          margin-top: 52px;
          padding: 0 24px;
        }

        .t-rating-stars {
          display: flex;
          gap: 3px;
        }

        .t-rating-text {
          margin: 0;
          font-size: 0.875rem;
          color: #64748b;
        }

        .t-rating-text strong {
          color: #0f172a;
          font-weight: 700;
        }
      `}</style>
    </section>
  )
}
