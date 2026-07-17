import nextVitals from 'eslint-config-next/core-web-vitals'

const config = [
  ...nextVitals,
  {
    ignores: ['.next/**', 'node_modules/**', 'public/**', 'prisma/generated/**'],
    rules: {
      // Legacy dashboard widgets intentionally synchronize third-party chart/form state in effects.
      // Keep these React Compiler advisory rules disabled until those unrelated widgets are migrated.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
    },
  },
]

export default config
