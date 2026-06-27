import Image from 'next/image'
import { CheckCircle2 } from 'lucide-react'

const industries = [
  {
    name: 'Retail & Supermarkets',
    subtitle: 'From kiosks to multi-aisle stores',
    img: '/industries/retail.png',
    features: ['Barcode scanning & receipt printing', 'Bulk product import', 'Daily stock reconciliation'],
    featured: true,
  },
  {
    name: 'Restaurants & Cafes',
    subtitle: 'Table service, takeaway & delivery',
    img: '/industries/restaurant.png',
    features: ['Table management', 'Kitchen order display', 'Menu & modifier management'],
    featured: true,
  },
  {
    name: 'Salons & Beauty',
    subtitle: 'Hair, nails, spa & wellness',
    img: '/industries/salon.png',
    features: ['Appointment booking', 'Stylist performance tracking', 'Product & service sales'],
    featured: false,
  },
  {
    name: 'Pharmacies',
    subtitle: 'Retail clinics & drugstores',
    img: '/industries/pharmacy.png',
    features: ['Expiry date tracking', 'Prescription records', 'Controlled substance logs'],
    featured: false,
  },
  {
    name: 'Hardware Stores',
    subtitle: 'Tools, building materials & supplies',
    img: '/industries/hardware.png',
    features: ['Bulk & unit sales', 'Customer credit accounts', 'Supplier purchase orders'],
    featured: false,
  },
  {
    name: 'Wholesale & Distribution',
    subtitle: 'Bulk goods & national delivery',
    img: '/industries/wholesale.png',
    features: ['Tiered pricing by customer', 'Delivery & route tracking', 'Multi-warehouse stock'],
    featured: false,
  },
]

const featured = industries.filter((i) => i.featured)
const rest = industries.filter((i) => !i.featured)

export function LandingIndustries() {
  return (
    <section id="industries" className="section-padding bg-secondary/30">
      <div className="container-wide">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
          <div>
            <p className="section-eyebrow mb-3">Industries</p>
            <h2 className="section-heading">
              Built for every type of business.
            </h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-xs md:text-right">
            One platform, tailored to how your specific business works — not a generic tool.
          </p>
        </div>

        {/* Featured two — large cards side by side */}
        <div className="grid md:grid-cols-2 gap-5 mb-5">
          {featured.map((ind) => (
            <div
              key={ind.name}
              className="group relative rounded-2xl overflow-hidden border border-border fluent-shadow-4 hover:fluent-shadow-16 transition-all duration-300 bg-background"
            >
              {/* Image */}
              <div className="relative h-64 md:h-72 overflow-hidden">
                <Image
                  src={ind.img}
                  alt={ind.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              </div>

              {/* Text below image */}
              <div className="p-6">
                <h3 className="text-base font-bold text-foreground mb-1">{ind.name}</h3>
                <p className="text-xs text-muted-foreground mb-4">{ind.subtitle}</p>
                <ul className="space-y-2">
                  {ind.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Remaining 4 — smaller cards in a 2×2 / 4-col grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {rest.map((ind) => (
            <div
              key={ind.name}
              className="group relative rounded-2xl overflow-hidden border border-border fluent-shadow-2 hover:fluent-shadow-8 transition-all duration-300 bg-background"
            >
              {/* Image */}
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={ind.img}
                  alt={ind.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
                {/* Name overlay on image */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-sm font-bold text-white leading-tight">{ind.name}</p>
                  <p className="text-[11px] text-white/65 mt-0.5">{ind.subtitle}</p>
                </div>
              </div>

              {/* Features */}
              <div className="p-4">
                <ul className="space-y-1.5">
                  {ind.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-[11px] text-muted-foreground leading-relaxed">
                      <CheckCircle2 className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom footnote */}
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
