'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LandingFAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  const faqs = [
    {
      question: 'How long is the free trial?',
      answer: 'You get 30 days of full access to all features in the Pro plan. No credit card required to get started.',
    },
    {
      question: 'Can I use BizOS with my existing hardware?',
      answer: 'Yes! BizOS works on any device - computers, tablets, and smartphones. You can use your existing hardware or our recommended devices.',
    },
    {
      question: 'What if I have multiple locations?',
      answer: 'On the Pro and Enterprise plans, you can manage multiple locations from one dashboard. Get unified reports across all your branches.',
    },
    {
      question: 'Is my data secure?',
      answer: 'Absolutely. We use bank-level encryption, automatic backups, and comply with international security standards. Your business data is always protected.',
    },
    {
      question: 'How long does onboarding take?',
      answer: 'Most businesses are set up and running in under 2 hours. Our support team will guide you through everything, and we provide training for your staff.',
    },
    {
      question: 'Do you have customer support?',
      answer: 'Yes! All plans include support. Starter plan has email support, Pro gets priority support, and Enterprise gets a dedicated account manager.',
    },
  ]

  return (
    <section id="faq" className="py-20 md:py-32">
      <div className="mx-auto max-w-3xl px-6">
        {/* Section header */}
        <div className="text-center mb-16 md:mb-24">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary mb-4">
            FAQ
          </p>
          <h2 className="text-4xl md:text-5xl font-bold">
            Common questions
          </h2>
        </div>

        {/* FAQ items */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="border border-border rounded-lg overflow-hidden hover:border-border/50 transition-colors"
            >
              <button
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                className="w-full p-6 flex items-center justify-between bg-background hover:bg-card/50 transition-colors text-left"
              >
                <h3 className="font-semibold text-foreground pr-4">{faq.question}</h3>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 text-muted-foreground flex-shrink-0 transition-transform',
                    openIdx === idx && 'rotate-180'
                  )}
                />
              </button>
              {openIdx === idx && (
                <div className="bg-card/50 px-6 py-4 border-t border-border">
                  <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
