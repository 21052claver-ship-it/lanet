import globals from 'globals';
import react from 'eslint-plugin-react';
export default [
  {
    files: [
      'src/**/*.{js,jsx}',
      'worker/**/*.js',
      'shared/**/*.js',
      'scripts/**/*.mjs',
      'tests/**/*.js',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { react },
    rules: { 'no-undef': 'error', 'react/jsx-no-undef': 'error' },
  },
];
