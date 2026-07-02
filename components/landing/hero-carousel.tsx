'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { ArrowRight, TrendingUp } from 'lucide-react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'

const carouselSlides = [
  {
    id: 1,
    badge: 'Smart Retail Solutions',
    headline: {
      colored: 'Manage',
      text: 'Your Store Smarter',
    },
    description: 'Get ready for modern retail. Run inventory, track sales, manage staff, and grow your business all in one powerful platform.',
    image: '/images/pos-terminal-1.png',
    accentColor: 'emerald',
  },
  {
    id: 2,
    badge: 'Inventory Excellence',
    headline: {
      colored: 'Track',
      text: 'Every Item Perfectly',
    },
    description: 'Real-time stock visibility across all branches. Never run out of bestsellers or waste money on overstocking.',
    image: '/images/pos-inventory.png',
    accentColor: 'emerald',
  },
  {
    id: 3,
    badge: 'Payment Processing',
    headline: {
      colored: 'Accept',
      text: 'Every Payment Method',
    },
    description: 'Cash, cards, mobile money, and digital wallets. Process payments instantly and securely with automatic reconciliation.',
    image: '/images/pos-dashboard.png',
    accentColor: 'emerald',
  },
]

export function HeroCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 6000, stopOnInteraction: false }),
  ])
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    if (!emblaApi) return

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap())
    }

    emblaApi.on('select', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi])

  const slide = carouselSlides[selectedIndex]

  return (
    <section className="relative overflow-hidden pt-0 bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100">
      {/* Consistent decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-green-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-200/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {carouselSlides.map((s) => (
            <div
              key={s.id}
              className="min-w-full flex-shrink-0 transition-all duration-1000 ease-out pt-0"
            >

              <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-screen lg:min-h-[600px] py-16 sm:py-20 lg:py-24">
                  {/* Left Content */}
                  <div className="animate-fade-in">
                    {/* Badge */}
                    <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white px-4 py-2 shadow-sm">
                      <div className="h-2 w-2 rounded-full bg-emerald-600" />
                      <span className="text-sm font-semibold text-emerald-600">{s.badge}</span>
                    </div>

                    {/* Headline - Split colors */}
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight mb-6">
                      <span className="text-emerald-600">{s.headline.colored}</span>{' '}
                      <span className="text-slate-950">{s.headline.text}</span>
                    </h1>

                    {/* Description */}
                    <p className="text-lg text-slate-700 mb-8 max-w-md leading-relaxed">
                      {s.description}
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-10 animate-fade-in-delayed">
                      <Link
                        href="/sign-up"
                        className="inline-flex h-12 items-center justify-center rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold shadow-xl hover:from-emerald-700 hover:to-green-700 transition-all duration-300 px-8"
                      >
                        Activate free trial
                        <ArrowRight className="h-5 w-5 ml-2" aria-hidden="true" />
                      </Link>
                      <Link
                        href="mailto:hello@pesaby.com"
                        className="inline-flex h-12 items-center justify-center rounded-lg border-2 border-slate-900 bg-white text-slate-900 font-bold hover:bg-slate-50 transition-all duration-300 px-8"
                      >
                        Schedule Demo
                      </Link>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-4 animate-fade-in-delayed-2">
                      {[
                        { label: 'Fast Setup', value: '5 min' },
                        { label: '4.9★ Rating', value: 'Trusted' },
                        { label: '24/7 Support', value: 'Always Ready' },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="rounded-lg border border-emerald-200 bg-white/70 backdrop-blur-sm p-4 text-center"
                        >
                          <p className="text-2xl font-black mb-1 text-emerald-600">{stat.value}</p>
                          <p className="text-xs font-semibold text-slate-600">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right - Product Image Area */}
                  <div className="relative h-96 sm:h-[500px] lg:h-[600px] animate-fade-in-right">
                    {/* Discount badge */}
                    <div className="absolute top-8 right-8 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white font-bold shadow-xl text-sm">
                      Save
                    </div>

                    {/* Product display area - Real Image */}
                    <div className="relative h-full w-full">
                      <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl">
                        <Image
                          src={s.image}
                          alt={s.headline.colored}
                          fill
                          className="object-cover"
                          priority
                          sizes="(max-width: 1024px) 100vw, 50vw"
                        />
                      </div>

                      {/* Floating card - Left */}
                      <div className="absolute -left-6 top-1/4 z-20 w-48 rounded-xl bg-white shadow-xl border border-emerald-200 p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                            <TrendingUp className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-600">Today Sales</p>
                            <p className="text-lg font-black text-emerald-600">KES 85K</p>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-slate-200">
                          <div className="h-2 w-3/4 rounded-full bg-emerald-600" />
                        </div>
                      </div>

                      {/* Floating card - Bottom Right */}
                      <div className="absolute -bottom-6 -right-6 z-20 w-40 rounded-xl bg-white shadow-xl border border-slate-200 p-4">
                        <p className="text-xs font-semibold text-slate-600 mb-2">Quick Stats</p>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-600">Revenue</span>
                            <span className="text-sm font-bold text-emerald-600">↑ 24%</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-600">Orders</span>
                            <span className="text-sm font-bold text-slate-900">142</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Carousel Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {carouselSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => emblaApi?.scrollTo(index)}
            className={`h-3 rounded-full transition-all duration-500 ${
              index === selectedIndex ? 'w-8 bg-slate-900' : 'w-3 bg-slate-300 hover:bg-slate-400'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fade-in {
          animation: fadeIn 0.8s ease-out 0.2s both;
        }

        .animate-fade-in-delayed {
          animation: fadeIn 0.8s ease-out 0.4s both;
        }

        .animate-fade-in-delayed-2 {
          animation: fadeIn 0.8s ease-out 0.6s both;
        }

        .animate-fade-in-right {
          animation: fadeInRight 0.8s ease-out 0.3s both;
        }
      `}</style>
    </section>
  )
}
