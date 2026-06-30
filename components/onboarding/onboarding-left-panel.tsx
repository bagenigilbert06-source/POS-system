'use client'

import { motion } from 'framer-motion'
import { 
  ShoppingCart, 
  UtensilsCrossed, 
  Pill, 
  FileText, 
  MapPin, 
  Users, 
  Lightbulb,
  CheckCircle2
} from 'lucide-react'

interface LeftPanelProps {
  currentStep: number
  totalSteps: number
}

const stepContent = [
  {
    icon: ShoppingCart,
    title: 'Select Your Business',
    description: 'Choose the type of business you operate',
    gradient: 'from-blue-500/20 to-blue-600/20',
  },
  {
    icon: UtensilsCrossed,
    title: 'Define Your Category',
    description: 'Help us customize for your specific industry',
    gradient: 'from-amber-500/20 to-amber-600/20',
  },
  {
    icon: FileText,
    title: 'Business Details',
    description: 'Tell us about your business',
    gradient: 'from-purple-500/20 to-purple-600/20',
  },
  {
    icon: MapPin,
    title: 'Your Location',
    description: 'Set your timezone and country',
    gradient: 'from-green-500/20 to-green-600/20',
  },
  {
    icon: Users,
    title: 'Team Size',
    description: 'How many people work with you',
    gradient: 'from-pink-500/20 to-pink-600/20',
  },
  {
    icon: Lightbulb,
    title: 'Workspace Setup',
    description: 'Configure your first workspace',
    gradient: 'from-cyan-500/20 to-cyan-600/20',
  },
  {
    icon: CheckCircle2,
    title: 'All Set!',
    description: 'Ready to launch your business',
    gradient: 'from-emerald-500/20 to-emerald-600/20',
  },
]

export function OnboardingLeftPanel({ currentStep, totalSteps }: LeftPanelProps) {
  const content = stepContent[currentStep] || stepContent[0]
  const Icon = content.icon

  return (
    <div className="hidden md:flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted/50 p-8 sticky top-0">
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-sm space-y-6"
      >
        {/* Icon background */}
        <div className={`relative w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br ${content.gradient} flex items-center justify-center`}>
          <div className="absolute inset-0 rounded-2xl bg-white/5 backdrop-blur" />
          <Icon className="h-12 w-12 text-primary relative z-10" />
        </div>

        {/* Title and description */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">{content.title}</h2>
          <p className="text-sm text-muted-foreground">{content.description}</p>
        </div>

        {/* Progress indicator */}
        <div className="pt-6 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Step {currentStep + 1}</span>
            <span>{Math.round(((currentStep + 1) / totalSteps) * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-border rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
            />
          </div>
        </div>

        {/* Motivational text */}
        <div className="pt-6 text-xs text-muted-foreground italic">
          {currentStep === 0 && "Let's get started with your business setup"}
          {currentStep === 1 && "We'll personalize IMARA for your exact needs"}
          {currentStep === 2 && "Your business information helps us serve you better"}
          {currentStep === 3 && "Almost there! Just a bit more setup"}
          {currentStep === 4 && "Tell us about your team"}
          {currentStep === 5 && "Final touches before launch"}
          {currentStep === 6 && "Congratulations on getting started!"}
        </div>
      </motion.div>
    </div>
  )
}
