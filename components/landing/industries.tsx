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
    img: '/industries/retail.png',
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
    img: '/industries/restaurant.png',
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
    img: '/industries/salon.png',
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
    img: '/industries/pharmacy.png',
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
    img: '/industries/hardware.png',
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
    img: '/industries/wholesale.png',
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
    <section id="industries" className="section-padding bg-secondary/20">
      <div className="container-wide">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="section-eyebrow mb-3">Industries</p>
          <h2 className="section-heading mb-4">
            Built for every type of business.
          </h2>
          <p className="section-subheading mx-auto">
            One platform, tailored to how your specific type of business actually works — not a generic tool that forces you to adapt.
          </p>
        </div>

        {/* Tab pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {industries.map((ind) => (
            <button
              key={ind.id}
              onClick={() => setActiveId(ind.id)}
              className={`rounded-full px-4 py-2 text-xs font-semibold border transition-all duration-150 ${
                activeId === ind.id
                  ? 'bg-primary text-white border-primary shadow-sm-soft'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
              }`}
            >
              {ind.name}
            </button>
          ))}
        </div>

        {/* Active industry detail */}
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Image */}
          <div className="relative rounded-2xl overflow-hidden border border-border shadow-lg-soft aspect-[4/3]">
            <Image
              src={active.img}
              alt={active.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition-all duration-500"
              priority
            />
            {/* Stat badge overlaid on image */}
            <div className="absolute bottom-4 left-4 flex items-center gap-3 rounded-xl bg-black/70 backdrop-blur-sm px-4 py-2.5 border border-white/10">
              <div>
                <p className="text-base font-bold text-white leading-tight">{active.stat.number}</p>
                <p className="text-[11px] text-white/70">{active.stat.label}</p>
              </div>
            </div>
          </div>

          {/* Text */}
          <div>
            <h3 className="text-2xl font-bold text-foreground mb-1">{active.name}</h3>
            <p className="text-sm text-muted-foreground mb-6">{active.subtitle}</p>
            <ul className="space-y-3 mb-8">
              {active.features.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/sign-up" className="fluent-btn-primary text-sm">
              Get started — free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-10">
          Don&apos;t see your industry?{' '}
          <a href="mailto:hello@imara.co" className="text-primary hover:underline font-medium">
            Talk to us — Imara works for any product or service business.
          </a>
        </p>
      </div>
    </section>
  )
}
