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
    img: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=900&q=80&auto=format&fit=crop',
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
    img: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&q=80&auto=format&fit=crop',
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
    img: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=900&q=80&auto=format&fit=crop',
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
    img: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=900&q=80&auto=format&fit=crop',
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
    img: 'https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=900&q=80&auto=format&fit=crop',
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
    img: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=900&q=80&auto=format&fit=crop',
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
              unoptimized
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
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
          padding: 80px 24px;
          box-sizing: border-box;
        }

        .ind-inner {
          max-width: 1040px;
          margin: 0 auto;
        }

        /* ── Header ────────────────────────────────────────────── */
        .ind-header {
          text-align: center;
          max-width: 560px;
          margin: 0 auto 44px;
        }

        .ind-eyebrow {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #2563eb;
          margin-bottom: 12px;
        }

        .ind-headline {
          margin: 0 0 14px;
          font-size: clamp(1.6rem, 3vw, 2.2rem);
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.03em;
          line-height: 1.15;
        }

        .ind-sub {
          margin: 0;
          font-size: 0.9375rem;
          color: #64748b;
          line-height: 1.65;
        }

        /* ── Tabs ──────────────────────────────────────────────── */
        .ind-tabs {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
          margin-bottom: 40px;
        }

        .ind-tab {
          padding: 8px 18px;
          border-radius: 999px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          font-size: 12.5px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
          line-height: 1;
        }

        .ind-tab:hover {
          border-color: #2563eb;
          color: #2563eb;
        }

        .ind-tab-active {
          background: #2563eb;
          border-color: #2563eb;
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(37,99,235,0.25);
        }

        .ind-tab-active:hover {
          color: #ffffff;
        }

        /* ── Panel ─────────────────────────────────────────────── */
        .ind-panel {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          align-items: center;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          overflow: hidden;
          box-shadow:
            0 1px 3px rgba(0,0,0,0.05),
            0 8px 24px rgba(0,0,0,0.05);
        }

        @media (max-width: 820px) {
          .ind-panel {
            grid-template-columns: 1fr;
            gap: 0;
          }
        }

        /* ── Image side ────────────────────────────────────────── */
        .ind-img-wrap {
          position: relative;
          aspect-ratio: 4 / 3;
          overflow: hidden;
          background: #e2e8f0;
        }

        @media (max-width: 820px) {
          .ind-img-wrap {
            aspect-ratio: 16 / 9;
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
          bottom: 20px;
          left: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.8);
          border-radius: 12px;
          padding: 12px 16px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
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
          margin: 0 0 2px;
          font-size: 1rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
          line-height: 1;
        }

        .ind-badge-label {
          margin: 0;
          font-size: 11px;
          color: #64748b;
          line-height: 1.3;
        }

        /* ── Copy side ─────────────────────────────────────────── */
        .ind-copy {
          padding: 40px 40px 40px 0;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        @media (max-width: 820px) {
          .ind-copy {
            padding: 32px 28px;
          }
        }

        .ind-copy-header {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .ind-copy-title {
          margin: 0;
          font-size: 1.375rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.025em;
          line-height: 1.2;
        }

        .ind-copy-sub {
          margin: 0;
          font-size: 0.875rem;
          color: #64748b;
          line-height: 1.5;
        }

        /* ── Feature list ──────────────────────────────────────── */
        .ind-features {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .ind-feature {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.875rem;
          color: #1e293b;
          line-height: 1.4;
        }

        .ind-check {
          color: #2563eb;
          flex-shrink: 0;
        }

        /* ── CTA ───────────────────────────────────────────────── */
        .ind-actions {
          padding-top: 4px;
        }

        .ind-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 22px;
          background: #2563eb;
          color: #ffffff;
          font-size: 0.875rem;
          font-weight: 600;
          border-radius: 10px;
          text-decoration: none;
          transition: background 0.15s ease, box-shadow 0.15s ease;
          box-shadow: 0 2px 8px rgba(37,99,235,0.25);
        }

        .ind-cta:hover {
          background: #1d4ed8;
          box-shadow: 0 4px 16px rgba(37,99,235,0.35);
        }

        /* ── Footer note ───────────────────────────────────────── */
        .ind-footer-note {
          text-align: center;
          margin-top: 28px;
          font-size: 0.8125rem;
          color: #94a3b8;
        }

        .ind-footer-link {
          color: #2563eb;
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