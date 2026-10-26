import { defineConfig } from 'eslint/config'
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended'

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  eslintPluginPrettier,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true }
      ]
    }
  },
  {
    // The webapp is a browser bundle with its own compiler settings.
    files: ['web/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: {
      parserOptions: {
        project: './web/tsconfig.json',
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  {
    ignores: ['plugin/**', 'public/**', 'node_modules/**']
  }
)
