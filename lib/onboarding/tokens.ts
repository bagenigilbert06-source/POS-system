/**
 * Onboarding Design Tokens
 * Centralized design system for consistent, reusable onboarding experience
 */

export const ONBOARDING_TOKENS = {
  // Typography Scale
  typography: {
    // Step indicator - STEP X OF 7
    stepIndicator: 'text-xs font-medium uppercase tracking-widest',
    stepIndicatorColor: 'text-muted-foreground',

    // Main heading - "How will you use IMARA?"
    heading: 'text-2xl md:text-3xl font-semibold tracking-tight',
    headingColor: 'text-foreground',

    // Supporting text
    description: 'text-sm text-muted-foreground leading-relaxed',

    // Card titles
    cardTitle: 'text-base font-semibold',
    cardTitleColor: 'text-foreground',

    // Card descriptions
    cardDescription: 'text-sm text-muted-foreground leading-relaxed',

    // Form labels
    label: 'text-sm font-semibold',
    labelColor: 'text-foreground',

    // Helper text
    helperText: 'text-xs text-muted-foreground',

    // Pill/badge text
    pill: 'text-xs font-medium',
    pillColor: 'text-muted-foreground',
  },

  // Spacing Scale (in px)
  spacing: {
    xs: '4px',    // 0.25rem
    sm: '8px',    // 0.5rem
    md: '12px',   // 0.75rem
    lg: '16px',   // 1rem
    xl: '24px',   // 1.5rem
    '2xl': '32px', // 2rem
    '3xl': '40px', // 2.5rem
    '4xl': '48px', // 3rem
    '5xl': '56px', // 3.5rem
    '6xl': '64px', // 4rem
  },

  // Border Radius
  borderRadius: {
    card: 'rounded-xl',       // 12px - clean card appearance
    input: 'rounded-lg',      // 8px - form inputs
    button: 'rounded-lg',     // 8px - buttons
    icon: 'rounded-lg',       // 8px - icon containers
    avatar: 'rounded-full',
  },

  // Animation / Transition
  animation: {
    fast: 'duration-150',      // Quick feedback (hover, focus)
    normal: 'duration-200',    // Standard transitions
    slow: 'duration-300',      // Entrance/exit animations
  },

  // Elevation / Shadow System
  elevation: {
    none: 'shadow-none',
    small: 'shadow-sm-soft',    // Subtle card elevation
    medium: 'shadow-md-soft',   // Interactive hover state
    large: 'shadow-lg-soft',    // Modal/elevated content
    xl: 'shadow-xl-soft',       // Maximum elevation
  },

  // Component-specific spacing patterns
  components: {
    // Card padding
    cardPadding: 'p-5',
    cardPaddingMobile: 'p-4',

    // Form input height
    inputHeight: 'h-10',        // 40px - modern touch target
    inputPadding: 'px-3 py-2',

    // Selection card
    selectionCardMinHeight: 'min-h-[160px]',

    // Step header spacing
    stepHeaderGap: 'gap-1.5',

    // Layout max-width for centered content
    contentMaxWidth: 'max-w-2xl',  // 640px - optimal for content

    // Panel spacing
    panelPadding: 'p-12',
    panelPaddingMobile: 'p-6 md:p-8',
  },

  // Color States
  states: {
    default: {
      bg: 'bg-card',
      border: 'border-border',
      text: 'text-foreground',
    },
    hover: {
      bg: 'hover:bg-secondary',
      shadow: 'hover:shadow-md-soft',
      translate: 'hover:-translate-y-1',
    },
    active: {
      bg: 'bg-primary/8',
      border: 'border-primary/20',
      shadow: 'shadow-lg shadow-primary/20',
      scale: 'scale-[1.02]',
    },
    focused: {
      ring: 'focus:ring-2 focus:ring-primary/30 focus:border-primary',
      outline: 'focus:outline-none',
    },
    disabled: {
      opacity: 'disabled:opacity-50',
      cursor: 'disabled:cursor-not-allowed',
    },
  },

  // Responsive breakpoints (Tailwind default)
  breakpoints: {
    mobile: '320px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1440px',
  },
} as const

// Helper function to combine token classes
export function combineTokens(...tokens: (string | undefined)[]): string {
  return tokens.filter(Boolean).join(' ')
}

// Preset class combinations for common patterns
export const ONBOARDING_PRESETS = {
  stepHeader: 'flex flex-col gap-3',
  stepTitle: `${ONBOARDING_TOKENS.typography.heading} ${ONBOARDING_TOKENS.typography.headingColor}`,
  stepDescription: `${ONBOARDING_TOKENS.typography.description}`,
  selectionCard: `group relative w-full ${ONBOARDING_TOKENS.borderRadius.card} ${ONBOARDING_TOKENS.components.cardPadding} text-left transition-all ${ONBOARDING_TOKENS.animation.normal} flex flex-col gap-6 ${ONBOARDING_TOKENS.components.selectionCardMinHeight}`,
  premiumInput: `w-full ${ONBOARDING_TOKENS.components.inputHeight} ${ONBOARDING_TOKENS.components.inputPadding} rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${ONBOARDING_TOKENS.animation.fast}`,
  formLabel: `${ONBOARDING_TOKENS.typography.label} ${ONBOARDING_TOKENS.typography.labelColor}`,
  navigationButton: 'px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200',
  navigationButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed',
  navigationButtonSecondary: 'border border-border bg-background text-foreground hover:bg-secondary',
} as const
