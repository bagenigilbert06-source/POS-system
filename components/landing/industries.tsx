import Image from 'next/image'

const industries = [
  { name: 'Retail',      subtitle: 'Supermarkets & boutiques', img: '/industries/retail.png' },
  { name: 'Restaurants', subtitle: 'Full-service & quick eats', img: '/industries/restaurant.png' },
  { name: 'Pharmacy',    subtitle: 'Drugs & healthcare',        img: '/industries/pharmacy.png' },
  { name: 'Salons',      subtitle: 'Hair, beauty & grooming',   img: '/industries/salon.png' },
  { name: 'Hardware',    subtitle: 'Tools & construction',      img: '/industries/hardware.png' },
  { name: 'Wholesale',   subtitle: 'Bulk & distribution',       img: '/industries/wholesale.png' },
]

export function LandingIndustries() {
  return (
    <section id="industries" className="section-padding bg-card/30">
      <div className="container-wide">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <p className="section-eyebrow mb-3">Industries</p>
            <h2 className="section-heading">
              Built for every type of business.
            </h2>
          </div>
          <p className="section-subheading md:text-right md:max-w-xs">
            One platform, any industry — from a single shop to a national chain.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {industries.map((ind) => (
            <div
              key={ind.name}
              className="group relative rounded-xl overflow-hidden border border-border fluent-shadow-2 hover:fluent-shadow-8 hover:-translate-y-0.5 transition-all duration-200 cursor-default"
            >
              {/* Image */}
              <div className="aspect-[3/4] relative">
                <Image
                  src={ind.img}
                  alt={ind.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/10 to-transparent" />
              </div>
              {/* Label */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-sm font-semibold text-white leading-tight">{ind.name}</p>
                <p className="text-xs text-white/70 mt-0.5">{ind.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
