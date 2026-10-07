import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'

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
      globals: { ...globals.browser, __APP_VERSION__: "readonly", __DOCS_BUILT_AT__: "readonly", __DOCS_COMMIT__: "readonly" },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  { files: ['vite.config.js'], languageOptions: { globals: globals.node } },
])
