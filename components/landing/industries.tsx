'use client'

import Image from 'next/image'
import { useState } from 'react'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const industries = [
  {
    id: 'retail',
    name: 'Retail & Supermarkets',
    subtitle: 'From corner shops to multi-aisle supermarkets',
    img: '/images/industries/retail.png',
    features: [
      'Barcode scanning & receipt printing',
      'Bulk product import via spreadsheet',
      'Daily stock reconciliation',
      'M-Pesa & card payments',
      'Customer loyalty programme',
    ],
    stat: { number: '2,100+', label: 'retail stores using Imara' },
  },
  {
    id: 'restaurant',
    name: 'Restaurants & Cafes',
    subtitle: 'Table service, takeaway & delivery',
    img: '/images/industries/restaurant.png',
    features: [
      'Table & order management',
      'Kitchen display system',
      'Menu & modifier builder',
      'Split-bill & tip tracking',
      'Daily sales & void reports',
    ],
    stat: { number: '800+', label: 'restaurants & cafes' },
  },
  {
    id: 'salon',
    name: 'Salons & Beauty',
    subtitle: 'Hair, nails, spa & wellness services',
    img: '/images/industries/salon.png',
    features: [
      'Appointment booking & calendar',
      'Stylist performance tracking',
      'Product & service sales',
      'Client history & notes',
      'Commission management',
    ],
    stat: { number: '650+', label: 'salons & spas' },
  },
  {
    id: 'pharmacy',
    name: 'Pharmacies',
    subtitle: 'Retail clinics, drugstores & dispensaries',
    img: '/images/industries/pharmacy.png',
    features: [
      'Expiry date tracking & alerts',
      'Prescription & patient records',
      'Controlled substance logs',
      'NHIF billing support',
      'Supplier reorder management',
    ],
    stat: { number: '420+', label: 'pharmacies & clinics' },
  },
  {
    id: 'hardware',
    name: 'Hardware Stores',
    subtitle: 'Tools, building materials & supplies',
    img: '/images/industries/hardware.png',
    features: [
      'Bulk & per-unit sales',
      'Customer credit accounts',
      'Supplier purchase orders',
      'Stock by warehouse location',
      'LPO & invoice generation',
    ],
    stat: { number: '380+', label: 'hardware stores' },
  },
  {
    id: 'wholesale',
    name: 'Wholesale & Distribution',
    subtitle: 'Bulk goods, depots & national delivery',
    img: '/images/industries/wholesale.png',
    features: [
      'Tiered pricing by customer',
      'Delivery & route management',
      'Multi-warehouse stock control',
      'Credit & debt management',
      'Volume discount automation',
    ],
    stat: { number: '650+', label: 'wholesalers & distributors' },
  },
]

export function LandingIndustries() {
  const [activeId, setActiveId] = useState('retail')
  const active = industries.find((i) => i.id === activeId) ?? industries[0]

  return (
    <section id="industries" className="ind-section">
      <div className="ind-inner">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="ind-header">
          <span className="ind-eyebrow">Industries</span>
          <h2 className="ind-headline">Built for every type of business.</h2>
          <p className="ind-sub">
            One platform, tailored to how your specific type of business actually works —
            not a generic tool that forces you to adapt.
          </p>
        </div>

        {/* ── Tab pills ──────────────────────────────────────────── */}
        <div className="ind-tabs" role="tablist" aria-label="Industry selector">
          {industries.map((ind) => (
            <button
              key={ind.id}
              role="tab"
              aria-selected={activeId === ind.id}
              aria-controls={`ind-panel-${ind.id}`}
              onClick={() => setActiveId(ind.id)}
              className={`ind-tab ${activeId === ind.id ? 'ind-tab-active' : ''}`}
            >
              {ind.name}
            </button>
          ))}
        </div>

        {/* ── Detail panel ───────────────────────────────────────── */}
        <div
          id={`ind-panel-${active.id}`}
          role="tabpanel"
          aria-label={active.name}
          className="ind-panel"
        >
          {/* Image */}
          <div className="ind-img-wrap">
            <Image
              src={active.img}
              alt={active.name}
              fill
              sizes="(max-width: 900px) 100vw, 50vw"
              className="ind-img"
              priority
            />
            {/* Gradient at bottom for badge legibility */}
            <div className="ind-img-gradient" aria-hidden="true" />

            {/* Stat badge */}
            <div className="ind-badge">
              <div className="ind-badge-dot" />
              <div>
                <p className="ind-badge-number">{active.stat.number}</p>
                <p className="ind-badge-label">{active.stat.label}</p>
              </div>
            </div>
          </div>

          {/* Copy */}
          <div className="ind-copy">
            <div className="ind-copy-header">
              <h3 className="ind-copy-title">{active.name}</h3>
              <p className="ind-copy-sub">{active.subtitle}</p>
            </div>

            <ul className="ind-features" aria-label={`Features for ${active.name}`}>
              {active.features.map((f) => (
                <li key={f} className="ind-feature">
                  <CheckCircle2 size={16} className="ind-check" aria-hidden="true" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="ind-actions">
              <Link href="/sign-up" className="ind-cta">
                Get started — free
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── Footer note ────────────────────────────────────────── */}
        <p className="ind-footer-note">
          Don&apos;t see your industry?{' '}
          <a href="mailto:hello@imara.co" className="ind-footer-link">
            Talk to us — Imara works for any product or service business.
          </a>
        </p>

      </div>

      <style>{`
        /* ── Section ───────────────────────────────────────────── */
        .ind-section {
          width: 100%;
          background: hsl(var(--secondary));
          border-top: 1px solid hsl(var(--border));
          border-bottom: 1px solid hsl(var(--border));
          padding: 32px 12px;
          box-sizing: border-box;
        }

        @media (min-width: 640px) {
          .ind-section {
            padding: 56px 24px;
          }
        }

        @media (min-width: 1024px) {
          .ind-section {
            padding: 88px 24px;
          }
        }

        .ind-inner {
          max-width: 1040px;
          margin: 0 auto;
        }

        /* ── Header ────────────────────────────────────────────── */
        .ind-header {
          text-align: center;
          max-width: 560px;
          margin: 0 auto 20px;
          padding: 0 2px;
        }

        @media (min-width: 640px) {
          .ind-header {
            margin-bottom: 28px;
          }
        }

        @media (min-width: 1024px) {
          .ind-header {
            margin-bottom: 40px;
          }
        }

        .ind-eyebrow {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: hsl(var(--primary));
          margin-bottom: 8px;
        }

        @media (min-width: 640px) {
          .ind-eyebrow {
            font-size: 11px;
            margin-bottom: 12px;
          }
        }

        .ind-headline {
          margin: 0 0 8px;
          font-size: clamp(1.4rem, 4vw, 2.2rem);
          font-weight: 800;
          color: hsl(var(--foreground));
          letter-spacing: -0.03em;
          line-height: 1.15;
        }

        @media (min-width: 640px) {
          .ind-headline {
            margin-bottom: 14px;
          }
        }

        .ind-sub {
          margin: 0;
          font-size: 0.8125rem;
          color: hsl(var(--muted-foreground));
          line-height: 1.6;
        }

        @media (min-width: 640px) {
          .ind-sub {
            font-size: 0.9375rem;
            line-height: 1.65;
          }
        }

        /* ── Tabs ──────────────────────────────────────────────── */
        .ind-tabs {
          display: flex;
          overflow-x: auto;
          overflow-y: hidden;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          gap: 6px;
          margin-bottom: 20px;
          padding: 0 0 4px 0;
        }

        @media (min-width: 640px) {
          .ind-tabs {
            flex-wrap: wrap;
            justify-content: center;
            gap: 7px;
            margin-bottom: 24px;
            padding: 0;
          }
        }

        @media (min-width: 1024px) {
          .ind-tabs {
            margin-bottom: 36px;
          }
        }

        .ind-tab {
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--card));
          font-size: 10px;
          font-weight: 600;
          color: hsl(var(--muted-foreground));
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
          line-height: 1;
          flex-shrink: 0;
          scroll-snap-align: start;
          min-height: 40px;
          display: flex;
          align-items: center;
        }

        @media (min-width: 640px) {
          .ind-tab {
            padding: 8px 16px;
            font-size: 12px;
            min-height: 44px;
          }
        }

        .ind-tab:hover {
          border-color: hsl(var(--primary));
          color: hsl(var(--primary));
        }

        .ind-tab-active {
          background: hsl(var(--primary));
          border-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          box-shadow: 0 2px 8px hsla(221, 83%, 53%, 0.25);
        }

        .ind-tab-active:hover {
          color: hsl(var(--primary-foreground));
        }

        /* ── Panel ─────────────────────────────────────────────── */
        .ind-panel {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0;
          align-items: center;
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 16px;
          overflow: hidden;
          box-shadow:
            0 1px 3px rgba(0,0,0,0.05),
            0 8px 24px rgba(0,0,0,0.05);
        }

        @media (min-width: 821px) {
          .ind-panel {
            grid-template-columns: 1fr 1fr;
            gap: 48px;
            border-radius: 20px;
          }
        }

        /* ── Image side ────────────────────────────────────────── */
        .ind-img-wrap {
          position: relative;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background: hsl(var(--border));
        }

        @media (min-width: 821px) {
          .ind-img-wrap {
            aspect-ratio: 4 / 3;
          }
        }

        .ind-img {
          object-fit: cover;
          transition: opacity 0.4s ease;
        }

        .ind-img-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top,
            rgba(15, 23, 42, 0.55) 0%,
            rgba(15, 23, 42, 0.10) 50%,
            transparent 100%
          );
        }

        /* ── Stat badge ────────────────────────────────────────── */
        .ind-badge {
          position: absolute;
          bottom: 12px;
          left: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.8);
          border-radius: 10px;
          padding: 10px 12px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }

        @media (min-width: 640px) {
          .ind-badge {
            bottom: 16px;
            left: 16px;
            gap: 12px;
            border-radius: 12px;
            padding: 12px 14px;
          }
        }

        @media (min-width: 1024px) {
          .ind-badge {
            bottom: 20px;
            left: 20px;
            padding: 12px 16px;
          }
        }

        .ind-badge-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #22c55e;
          flex-shrink: 0;
          box-shadow: 0 0 0 3px rgba(34,197,94,0.2);
          animation: ind-pulse 2.2s ease-in-out infinite;
        }

        @keyframes ind-pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(34,197,94,0.2); }
          50%       { box-shadow: 0 0 0 6px rgba(34,197,94,0.08); }
        }

        @media (prefers-reduced-motion: reduce) {
          .ind-badge-dot { animation: none; }
        }

        .ind-badge-number {
          margin: 0 0 1px;
          font-size: 0.875rem;
          font-weight: 800;
          color: hsl(var(--foreground));
          letter-spacing: -0.02em;
          line-height: 1;
        }

        @media (min-width: 640px) {
          .ind-badge-number {
            font-size: 1rem;
            margin-bottom: 2px;
          }
        }

        .ind-badge-label {
          margin: 0;
          font-size: 10px;
          color: hsl(var(--muted-foreground));
          line-height: 1.2;
        }

        @media (min-width: 640px) {
          .ind-badge-label {
            font-size: 11px;
            line-height: 1.3;
          }
        }

        /* ── Copy side ─────────────────────────────────────���───── */
        .ind-copy {
          padding: 20px 14px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        @media (min-width: 640px) {
          .ind-copy {
            padding: 24px 26px;
            gap: 18px;
          }
        }

        @media (min-width: 821px) {
          .ind-copy {
            padding: 36px 40px 36px 0;
            gap: 24px;
          }
        }

        .ind-copy-header {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .ind-copy-title {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 800;
          color: hsl(var(--foreground));
          letter-spacing: -0.025em;
          line-height: 1.2;
        }

        @media (min-width: 640px) {
          .ind-copy-title {
            font-size: 1.25rem;
          }
        }

        @media (min-width: 821px) {
          .ind-copy-title {
            font-size: 1.375rem;
          }
        }

        .ind-copy-sub {
          margin: 0;
          font-size: 0.8125rem;
          color: hsl(var(--muted-foreground));
          line-height: 1.5;
        }

        @media (min-width: 640px) {
          .ind-copy-sub {
            font-size: 0.875rem;
          }
        }

        /* ── Feature list ──────────────────────────────────────── */
        .ind-features {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        @media (min-width: 640px) {
          .ind-features {
            gap: 12px;
          }
        }

        .ind-feature {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 0.8125rem;
          color: hsl(var(--foreground));
          line-height: 1.4;
        }

        @media (min-width: 640px) {
          .ind-feature {
            gap: 10px;
            font-size: 0.875rem;
          }
        }

        .ind-check {
          color: hsl(var(--primary));
          flex-shrink: 0;
        }

        /* ── CTA ───────────────────────────────────────────────── */
        .ind-actions {
          padding-top: 2px;
        }

        .ind-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          font-size: 0.8125rem;
          font-weight: 600;
          border-radius: 8px;
          text-decoration: none;
          transition: background 0.15s ease, box-shadow 0.15s ease;
          box-shadow: 0 2px 8px hsla(221, 83%, 53%, 0.25);
          min-height: 40px;
          display: inline-flex;
          align-items: center;
        }

        @media (min-width: 640px) {
          .ind-cta {
            padding: 11px 22px;
            font-size: 0.875rem;
            border-radius: 10px;
          }
        }

        .ind-cta:hover {
          opacity: 0.9;
          box-shadow: 0 4px 16px hsla(221, 83%, 53%, 0.35);
        }

        /* ── Footer note ───────────────────────────────────────── */
        .ind-footer-note {
          text-align: center;
          margin-top: 20px;
          font-size: 0.75rem;
          color: hsl(var(--muted-foreground));
        }

        @media (min-width: 640px) {
          .ind-footer-note {
            margin-top: 24px;
            font-size: 0.8125rem;
          }
        }

        @media (min-width: 1024px) {
          .ind-footer-note {
            margin-top: 28px;
          }
        }

        .ind-footer-link {
          color: hsl(var(--primary));
          font-weight: 600;
          text-decoration: none;
        }

        .ind-footer-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </section>
  )
}
