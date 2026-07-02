'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, BookOpen, Share2, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

const stats = [
  { label: 'Fast Setup', value: '5 min' },
  { label: '4.9★ Rating', value: 'Trusted' },
  { label: '24/7 Support', value: 'Always Ready' },
]

export function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 pt-0">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-200/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="container-wide relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-screen lg:min-h-[600px] py-16 sm:py-20 lg:py-24">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative z-10 px-4 sm:px-0"
          >
            {/* Badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-4 py-2 shadow-sm">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-sm font-semibold text-amber-900">New Era of Retail</span>
            </div>

            {/* Headline - Split colors */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight mb-6">
              <span className="text-amber-600">Manage</span>{' '}
              <span className="text-slate-950">Your Store Smarter</span>
            </h1>

            {/* Description */}
            <p className="text-lg text-slate-700 mb-8 max-w-md leading-relaxed">
              Get ready for modern retail. Run inventory, track sales, manage staff, and grow your business all in one powerful platform.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold shadow-xl hover:from-amber-700 hover:to-orange-700 transition-all duration-300"
              >
                <Link href="/sign-up" className="inline-flex items-center justify-center gap-2.5">
                  Start Free Trial
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-lg border-2 border-slate-900 bg-white text-slate-900 font-bold hover:bg-slate-50 transition-all duration-300"
              >
                <Link href="mailto:hello@pesaby.com" className="inline-flex items-center justify-center gap-2.5">
                  <BookOpen className="h-5 w-5" aria-hidden="true" />
                  Schedule Demo
                </Link>
              </Button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-lg bg-white/70 backdrop-blur-sm border border-amber-200 p-4 text-center">
                  <p className="text-2xl font-black text-amber-600 mb-1">{stat.value}</p>
                  <p className="text-xs font-semibold text-slate-600">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right - Product Image */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative h-96 sm:h-[500px] lg:h-[600px]"
          >
            {/* Discount badge */}
            <div className="absolute top-8 right-8 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white font-bold shadow-xl">
              <span className="text-sm">Save</span>
            </div>

            {/* Placeholder for product image - using gradient placeholder */}
            <div className="relative h-full w-full">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl flex items-center justify-center overflow-hidden">
                {/* Product display area with pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,#fff9_1px,transparent_1px)] bg-[length:20px_20px]" />
                </div>
                
                {/* Simulated POS system mockup */}
                <div className="relative z-10 w-full h-full flex items-center justify-center p-8">
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl w-full max-w-sm h-80 flex flex-col justify-between p-6 border border-white/20">
                    <div className="space-y-4">
                      <div className="h-3 w-24 rounded bg-white/30" />
                      <div className="space-y-2">
                        <div className="h-2 w-full rounded bg-white/20" />
                        <div className="h-2 w-5/6 rounded bg-white/20" />
                        <div className="h-2 w-4/5 rounded bg-white/20" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-10 w-full rounded bg-gradient-to-r from-amber-400 to-orange-400" />
                      <div className="h-2 w-full rounded bg-white/10" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating card - Left */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="absolute -left-6 top-1/4 z-20 w-48 rounded-xl bg-white shadow-xl border border-amber-200 p-4"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600">Today Sales</p>
                    <p className="text-lg font-black text-amber-600">KES 85K</p>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-slate-200">
                  <div className="h-2 w-3/4 rounded-full bg-amber-500" />
                </div>
              </motion.div>

              {/* Floating card - Bottom Right */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute -bottom-6 -right-6 z-20 w-40 rounded-xl bg-white shadow-xl border border-amber-200 p-4"
              >
                <p className="text-xs font-semibold text-slate-600 mb-2">Quick Stats</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600">Revenue</span>
                    <span className="text-sm font-bold text-slate-900">↑ 24%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600">Orders</span>
                    <span className="text-sm font-bold text-slate-900">142</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
