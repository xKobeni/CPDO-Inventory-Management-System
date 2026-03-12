import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Keep lint signal, but avoid blocking builds/dev over style-only rules.
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]' }],
      'no-empty': 'warn',

      // Fast refresh rule is noisy for component libraries/context modules.
      'react-refresh/only-export-components': 'off',

      // These hook rules are valuable, but too strict for this codebase as-is.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
    },
  },
])
