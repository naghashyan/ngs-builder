/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    ignores: ['node_modules/**', 'coverage/**']
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly',
        fetch: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', {argsIgnorePattern: '^_'}],
      'no-undef': 'error',
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', {avoidEscape: true}],
      'comma-dangle': ['error', 'never'],
      'no-console': 'off'
    }
  }
];

