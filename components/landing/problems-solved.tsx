import { AlertCircle, Clock, Users, BarChart3 } from 'lucide-react'

const PROBLEMS = [
  {
    icon: Clock,
    title: 'Slow Checkout Process',
    description: 'Traditional POS systems waste precious time at checkout, frustrating customers and reducing throughput.',
    metric: 'Average checkout: 5+ minutes',
  },
  {
    icon: AlertCircle,
    title: 'Manual Inventory Headaches',
    description: 'Stock tracking across multiple locations leads to errors, overstocking, and missed sales.',
    metric: '30% of time spent on inventory',
  },
  {
    icon: Users,
    title: 'Poor Team Coordination',
    description: 'Disconnected systems make it impossible for teams to work together efficiently across locations.',
    metric: 'Multiple tools = chaos',
  },
  {
    icon: BarChart3,
    title: 'Lack of Real-Time Insights',
    description: 'Without live data, business owners make decisions blind, missing opportunities and risks.',
    metric: 'Daily delays in reporting',
  },
]

export function ProblemsSolved() {
  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
            The Problems Every Business Faces
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            IMARA eliminates these pain points with a unified platform built for modern retail.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
          {PROBLEMS.map((problem) => {
            const Icon = problem.icon
            return (
              <div
                key={problem.title}
                className="rounded-xl border border-border bg-card p-8 hover:border-primary/30 hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-6 w-6 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-2">{problem.title}</h3>
                    <p className="text-muted-foreground mb-4">{problem.description}</p>
                    <p className="text-sm font-medium text-primary">{problem.metric}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
