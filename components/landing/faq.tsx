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
    <section id="faq" className="py-24 md:py-36 bg-gradient-to-b from-background via-background to-primary/2">
      <div className="mx-auto max-w-3xl px-6">
        {/* Section header - MD3 Typography */}
        <div className="text-center mb-20 md:mb-28">
          <p className="text-md3-label-small text-primary mb-6">
            FAQ
          </p>
          <h2 className="text-md3-headline-large md:text-md3-display-small text-foreground">
            Common questions
          </h2>
        </div>

        {/* FAQ items - MD3 Expandable Cards */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="group border border-border rounded-2xl overflow-hidden elevation-1 hover:elevation-2 transition-all duration-200 md3-card"
            >
              <button
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                className="w-full p-6 md:p-8 flex items-center justify-between bg-card hover:bg-secondary/20 transition-colors text-left"
              >
                <h3 className="text-md3-headline-small text-foreground pr-4">{faq.question}</h3>
                <ChevronDown
                  className={cn(
                    'h-6 w-6 text-primary flex-shrink-0 transition-transform duration-200 group-hover:scale-110',
                    openIdx === idx && 'rotate-180'
                  )}
                />
              </button>
              {openIdx === idx && (
                <div className="bg-secondary/10 px-6 md:px-8 py-6 border-t border-border">
                  <p className="text-md3-body-large text-muted-foreground leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
