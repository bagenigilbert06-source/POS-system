'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'

const faqs = [
  {
    question: 'How long is the free trial?',
    answer: 'You get 30 days of access to the Growth plan. No credit card is required to get started.',
  },
  {
    question: 'Does Imara work on my existing hardware?',
    answer: 'Yes. Imara runs in any modern browser on a computer, tablet or smartphone. You can also connect common receipt printers and barcode scanners.',
  },
  {
    question: 'Can I manage multiple branches?',
    answer: 'Yes. Growth and Enterprise plans support multiple locations with centralized inventory, reporting and staff management across branches.',
  },
  {
    question: 'How secure is my data?',
    answer: 'We use encryption at rest and in transit, role-based access controls, automatic backups and audit logs so teams can operate with confidence.',
  },
  {
    question: 'How long does setup take?',
    answer: 'Most businesses are live in under two hours. You can import your existing product catalogue, and our onboarding team walks you through everything step by step.',
  },
  {
    question: 'What payment methods does Imara accept?',
    answer: 'Imara supports mobile money, card, invoice and cash workflows, with clean reconciliation for finance and operations teams.',
  },
]

export function LandingFAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  return (
    <section id="faq" className="section-padding-premium bg-background">
      <div className="container-wide">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-16 items-start">
          {/* Left — sticky heading */}
          <div className="lg:sticky lg:top-24">
            <p className="section-eyebrow mb-3">FAQ</p>
            <h2 className="section-heading mb-4">Common questions.</h2>
            <p className="section-subheading">
              Anything else? Reach us at{' '}
              <a href="mailto:hello@imara.co" className="text-primary hover:underline">
                hello@imara.co
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
                  className="w-full flex items-center justify-between gap-4 py-5 text-left"
                >
                  <span className="text-sm font-semibold text-foreground">{faq.question}</span>
                  {openIdx === idx
                    ? <Minus className="h-4 w-4 text-primary shrink-0" />
                    : <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                  }
                </button>
                {openIdx === idx && (
                  <p id={`faq-answer-${idx}`} className="pb-5 text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
