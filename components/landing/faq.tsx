'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'

const faqs = [
  {
    question: 'What exactly is IMARA?',
    answer: 'IMARA is a Business Operating System — not just a POS. It combines point of sale, inventory, purchasing, CRM, employees, finance, analytics, and multi-branch management in one platform. Think of it as the operating system your business runs on.',
  },
  {
    question: 'How is IMARA different from a regular POS?',
    answer: 'A regular POS handles checkout. IMARA handles your entire business — from opening the shop to closing it. Sales, stock, suppliers, customers, employees, reports, and multi-branch operations are all connected and working together automatically.',
  },
  {
    question: 'How long is the free trial?',
    answer: 'You get 30 days of full access. No credit card required to get started. Most businesses are live within a few hours of signing up.',
  },
  {
    question: 'How long does setup take?',
    answer: 'Most businesses are live in under two hours. You can import your existing product catalogue, and our onboarding team walks you through everything step by step.',
  },
  {
    question: 'Can I manage multiple branches?',
    answer: 'Yes. IMARA supports unlimited locations with centralized inventory, reporting, and staff management. See all your branches from a single dashboard, transfer stock between locations, and compare performance across sites.',
  },
  {
    question: 'Does IMARA work on my existing hardware?',
    answer: 'IMARA runs in any modern browser on desktop, tablet, or smartphone. You can also connect common receipt printers and barcode scanners without extra software.',
  },
  {
    question: 'What payment methods does IMARA support?',
    answer: 'IMARA supports M-Pesa, card, cash, and invoice workflows — all automatically reconciled so your finance team has clean records every day.',
  },
  {
    question: 'How secure is my data?',
    answer: 'We use encryption at rest and in transit, role-based access controls, automatic backups, and full audit logs. Your data is yours, always backed up, and never sold.',
  },
]

export function LandingFAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  return (
    <section id="faq" className="section-padding-premium bg-background border-b border-border">
      <div className="container-wide">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-12 lg:gap-20 items-start">
          {/* Left — sticky heading */}
          <div className="lg:sticky lg:top-24">
            <p className="section-eyebrow mb-3">FAQ</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-tight mb-5">
              Common questions.
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-6">
              Everything you need to know about IMARA before getting started.
            </p>
            <p className="text-sm text-muted-foreground">
              Still have questions?{' '}
              <a href="mailto:hello@imara.co" className="text-primary font-semibold hover:underline">
                Write to us
              </a>
            </p>
          </div>

          {/* Right — accordion */}
          <div className="divide-y divide-border">
            {faqs.map((faq, idx) => (
              <div key={idx}>
                <button
                  onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                  aria-expanded={openIdx === idx}
                  aria-controls={`faq-answer-${idx}`}
                  className="w-full flex items-center justify-between gap-4 py-5 text-left group"
                >
                  <span className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
                    {faq.question}
                  </span>
                  <span className="flex-shrink-0 h-6 w-6 rounded-full border border-border flex items-center justify-center">
                    {openIdx === idx
                      ? <Minus className="h-3.5 w-3.5 text-primary" />
                      : <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                    }
                  </span>
                </button>
                {openIdx === idx && (
                  <p id={`faq-answer-${idx}`} className="pb-5 text-sm text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
