// Prettier configuration for Snake AI project
export default {
  // Basic formatting
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  tabWidth: 2,
  useTabs: false,
  
  // Line length to match ESLint and readability
  printWidth: 80,
  
  // React/JSX specific
  jsxSingleQuote: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  
  // File type specific overrides
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 120,
        trailingComma: 'none',
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 100,
        proseWrap: 'always',
      },
    },
    {
      files: '*.{js,jsx}',
      options: {
        // Ensure object destructuring is clean
        bracketSpacing: true,
        // Function parameters
        arrowParens: 'avoid',
      },
    },
  ],
};