'use client'

import Image from 'next/image'
import { useReducedMotion } from 'framer-motion'

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

function tripled<T>(arr: T[]): T[] {
  return [...arr, ...arr, ...arr]
}

function TestimonialCard({ quote, name, role, business, avatar, initials, color }: typeof testimonials[0]) {
  return (
    <div className="testimonial-card">
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
        &quot;{quote}&quot;
      </p>

      {/* Footer */}
      <div className="pt-4 border-t border-border flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: color }}
        >
          <Image
            src={avatar}
            alt={name}
            width={40}
            height={40}
            className="rounded-full w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
          <span className="text-white font-bold text-xs" style={{ display: 'none' }}>
            {initials}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{name}</p>
          <p className="text-xs text-muted-foreground truncate">{role} — {business}</p>
        </div>
      </div>
    </div>
  )
}

export function LandingTestimonials() {
  const prefersReduced = useReducedMotion()
  const items = tripled(testimonials)

  return (
    <section className="testimonials-section" aria-label="Customer testimonials">
      {/* Header */}
      <div className="testimonials-header">
        <p className="testimonials-eyebrow">Customer Stories</p>
        <h2 className="testimonials-title">
          Real businesses. <span className="testimonials-accent">Real results.</span>
        </h2>
        <p className="testimonials-sub">
          From corner shops in Thika to multi-branch pharmacies in Mombasa — thousands of Kenyan businesses trust Imara every day.
        </p>
      </div>

      {/* Carousel Track */}
      <div className="testimonials-track-wrap">
        <div className="testimonials-fade testimonials-fade-left" aria-hidden="true" />
        <div className="testimonials-fade testimonials-fade-right" aria-hidden="true" />

        <div
          className="testimonials-track"
          aria-hidden="true"
          style={{
            animation: prefersReduced
              ? 'none'
              : 'testimonials-scroll 60s linear infinite',
          }}
        >
          {items.map((t, i) => (
            <TestimonialCard key={`${t.name}-${i}`} {...t} />
          ))}
        </div>
      </div>

      {/* Rating Footer */}
      <div className="testimonials-rating">
        <div className="testimonials-stars">
          {Array.from({ length: 5 }).map((_, i) => (
            <svg key={i} width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
              <path fill="#f59e0b" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
          ))}
        </div>
        <p className="testimonials-rating-text">
          <strong>4.9 out of 5</strong> — rated by 5,000+ businesses across Kenya
        </p>
      </div>

      <style>{`
        /* ── Section ───────────────────────────────────────────────── */
        .testimonials-section {
          width: 100%;
          max-width: 100%;
          padding: 48px 24px;
          box-sizing: border-box;
          background: hsl(var(--background));
        }

        /* ── Header ────────────────────────────────────────────────── */
        .testimonials-header {
          text-align: center;
          margin-bottom: 48px;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
        }

        .testimonials-eyebrow {
          margin: 0;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: hsl(var(--primary));
        }

        .testimonials-title {
          margin: 12px 0 0;
          font-size: 2rem;
          font-weight: 700;
          color: hsl(var(--foreground));
          line-height: 1.2;
          letter-spacing: -0.015em;
        }

        @media (min-width: 640px) {
          .testimonials-title {
            font-size: 2.25rem;
          }
        }

        @media (min-width: 1024px) {
          .testimonials-title {
            font-size: 2.5rem;
          }
        }

        .testimonials-accent {
          color: hsl(var(--primary));
        }

        .testimonials-sub {
          margin: 12px 0 0;
          font-size: 1rem;
          color: hsl(var(--muted-foreground));
          line-height: 1.6;
        }

        /* ── Track wrapper ─────────────────────────────────────────── */
        .testimonials-track-wrap {
          position: relative;
          overflow: hidden;
          pointer-events: none;
          user-select: none;
          -webkit-user-select: none;
          border-radius: 12px;
        }

        /* Soft edge fades */
        .testimonials-fade {
          position: absolute;
          inset-block: 0;
          z-index: 10;
          width: 80px;
          pointer-events: none;
        }

        .testimonials-fade-left {
          left: 0;
          background: linear-gradient(to right, hsl(var(--background)) 0%, hsl(var(--background)) 60%, transparent 100%);
        }

        .testimonials-fade-right {
          right: 0;
          background: linear-gradient(to left, hsl(var(--background)) 0%, hsl(var(--background)) 60%, transparent 100%);
        }

        /* ── Scrolling track ────────────────────────────────────────── */
        .testimonials-track {
          display: flex;
          width: max-content;
          gap: 20px;
          padding: 8px 0;
          list-style: none;
          margin: 0;
        }

        @media (min-width: 640px) {
          .testimonials-track {
            gap: 24px;
          }
        }

        @media (min-width: 1024px) {
          .testimonials-track {
            gap: 32px;
          }
        }

        /* ── Individual card ───────────────────────────────────────── */
        .testimonial-card {
          flex: 0 0 100%;
          min-width: 0;
          height: auto;
          width: 100%;
          border-radius: 12px;
          border: 1px solid hsl(var(--border) / 0.6);
          background: hsl(0 0% 100% / 0.4);
          backdrop-filter: blur(12px);
          padding: 24px;
          display: flex;
          flex-direction: column;
        }

        @media (min-width: 640px) {
          .testimonial-card {
            flex: 0 0 calc(50% - 12px);
            width: auto;
          }
        }

        @media (min-width: 1024px) {
          .testimonial-card {
            flex: 0 0 calc(33.333% - 21px);
            width: auto;
          }
        }

        .dark .testimonial-card {
          background: hsl(0 0% 15% / 0.4);
          border-color: hsl(0 0% 25%);
        }

        .testimonial-card:hover {
          border-color: hsl(var(--primary) / 0.4);
          background: hsl(0 0% 100% / 0.6);
          transition: all 500ms ease-out;
        }

        .dark .testimonial-card:hover {
          background: hsl(0 0% 15% / 0.6);
        }

        /* ── Rating footer ─────────────────────────────────────────── */
        .testimonials-rating {
          text-align: center;
          margin-top: 40px;
          padding-top: 32px;
          border-top: 1px solid hsl(var(--border));
        }

        .testimonials-stars {
          display: flex;
          justify-content: center;
          gap: 4px;
          margin-bottom: 12px;
        }

        .testimonials-rating-text {
          margin: 0;
          font-size: 0.875rem;
          color: hsl(var(--muted-foreground));
        }

        .testimonials-rating-text strong {
          color: hsl(var(--foreground));
          font-weight: 600;
        }

        /* ── Animation ──────────────────────────────────────────────── */
        @keyframes testimonials-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(calc(-100% / 3));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .testimonials-track {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  )
}
