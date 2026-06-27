'use client'

import Image from 'next/image'
import { useReducedMotion } from 'framer-motion'

const brands = [
  { label: 'Supermarkets',      domain: 'mpesa.com',            bg: '#4CAF50' },
  { label: 'Retail Stores',     domain: 'safaricom.co.ke',      bg: '#00A650' },
  { label: 'Hardware Stores',   domain: 'equitybankgroup.com',  bg: '#D32F2F' },
  { label: 'Restaurants',       domain: 'kcbgroup.com',         bg: '#1A237E' },
  { label: 'Hotels',            domain: 'co-opbank.co.ke',      bg: '#004D40' },
  { label: 'Pharmacies',        domain: 'airtel.com',           bg: '#F44336' },
  { label: 'Wholesalers',       domain: 'stanbicbank.co.ke',    bg: '#003087' },
  { label: 'Electronics Stores',domain: 'absa.co.ke',           bg: '#DC0037' },
  { label: 'Fashion Stores',    domain: 'ncbabank.com',         bg: '#1565C0' },
  { label: 'Beauty & Salons',   domain: 'dtbafrica.com',        bg: '#0D47A1' },
]

function logoUrl(domain: string) {
  return `https://img.logokit.com/${domain}?size=128`
}

function tripled<T>(arr: T[]): T[] {
  return [...arr, ...arr, ...arr]
}

interface BrandCardProps {
  label: string
  domain: string
  bg: string
}

function BrandCard({ label, domain, bg }: BrandCardProps) {
  return (
    <li className="logo-card">
      <div className="logo-icon" style={{ background: `${bg}1a` }}>
        <Image
          src={logoUrl(domain)}
          alt={label}
          width={36}
          height={36}
          className="logo-img"
          unoptimized
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement
            img.style.display = 'none'
            const wrap = img.parentElement
            if (wrap) {
              wrap.style.background = bg
              wrap.style.color = '#fff'
              wrap.style.fontSize = '14px'
              wrap.style.fontWeight = '700'
              wrap.textContent = label[0]
            }
          }}
        />
      </div>
      <span className="logo-label">{label}</span>
    </li>
  )
}

export function LogoCarousel() {
  const prefersReduced = useReducedMotion()
  const items = tripled(brands)

  return (
    <section className="carousel-section" aria-label="Businesses powered by Imara">

      <div className="carousel-heading">
        <p className="carousel-title">
          Built for every business that <span className="accent">sells, serves, and grows.</span>
        </p>
        <p className="carousel-sub">
          One platform helping businesses manage sales, inventory, payments, customers, suppliers, employees, and operations from one place.
        </p>
      </div>

      {/* Outer mask: pointer-events: none on the whole strip */}
      <div className="carousel-track-wrap">
        <div className="fade fade-left"  aria-hidden="true" />
        <div className="fade fade-right" aria-hidden="true" />

        <ul
          className="carousel-track"
          aria-hidden="true"
          style={{
            animation: prefersReduced
              ? 'none'
              : 'logo-scroll 40s linear infinite',
          }}
        >
          {items.map(({ label, domain, bg }, i) => (
            <BrandCard key={`${domain}-${i}`} label={label} domain={domain} bg={bg} />
          ))}
        </ul>
      </div>

      <style>{`
        /* ── Section ───────────────────────────────────────────────── */
        .carousel-section {
          width: 100%;
          max-width: 860px;
          margin: 0 auto;
          padding: 48px 0;
          box-sizing: border-box;
        }

        /* ── Heading ───────────────────────────────────────────────── */
        .carousel-heading {
          text-align: center;
          margin-bottom: 32px;
          padding: 0 24px;
        }
        .carousel-title {
          margin: 0;
          font-size: 1.45rem;
          font-weight: 650;
          color: hsl(var(--foreground));
          line-height: 1.35;
          letter-spacing: -0.015em;
        }
        .carousel-title .accent {
          color: hsl(var(--primary));
        }
        .carousel-sub {
          margin: 8px 0 0;
          font-size: 0.875rem;
          color: hsl(var(--muted-foreground));
          line-height: 1.6;
        }

        /* ── Track wrapper ─────────────────────────────────────────── */
        .carousel-track-wrap {
          position: relative;
          overflow: hidden;
          /* Block all mouse interaction so it truly feels like a passive image strip */
          pointer-events: none;
          user-select: none;
          -webkit-user-select: none;
        }

        /* Soft edge fades */
        .fade {
          position: absolute;
          inset-block: 0;
          z-index: 10;
          width: 72px;
          pointer-events: none;
        }
        .fade-left  { left: 0;  background: linear-gradient(to right, hsl(var(--background)) 0%, hsl(var(--background)) 60%, transparent 100%); }
        .fade-right { right: 0; background: linear-gradient(to left, hsl(var(--background)) 0%, hsl(var(--background)) 60%, transparent 100%); }

        /* ── Scrolling list ────────────────────────────────────────── */
        .carousel-track {
          display: flex;
          width: max-content;
          gap: 12px;
          padding: 6px 4px;
          list-style: none;
          margin: 0;
          /* No hover-pause — it scrolls like a film strip, always */
        }

        /* ── Individual card ───────────────────────────────────────── */
        .logo-card {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 11px 18px;
          border-radius: 14px;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--card));
          box-shadow:
            0 1px 3px rgba(0,0,0,0.06),
            0 1px 2px rgba(0,0,0,0.04);
          white-space: nowrap;
          /* Hard read-only: no cursor change, no selection, no hover feedback */
          cursor: default;
          pointer-events: none;
        }

        /* ── Logo icon ─────────────────────────────────────────────── */
        .logo-icon {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }
        .logo-img {
          width: 26px;
          height: 26px;
          object-fit: contain;
          display: block;
        }

        /* ── Label ─────────────────────────────────────────────────── */
        .logo-label {
          font-size: 13.5px;
          font-weight: 600;
          color: hsl(var(--foreground));
          line-height: 1;
          letter-spacing: -0.005em;
        }

        /* ── Animation ────────────────────────────────────────��────── */
        @keyframes logo-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(calc(-100% / 3)); }
        }
        @media (prefers-reduced-motion: reduce) {
          .carousel-track { animation: none !important; }
        }
      `}</style>
    </section>
  )
}
