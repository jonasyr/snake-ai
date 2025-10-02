# Development Workflow and Code Quality

This document outlines the development workflow and code quality tools configured for the Snake AI project.

## Git Hooks Overview

We use [Husky](https://typicode.github.io/husky/) to enforce code quality and prevent issues from entering the codebase.

### Pre-commit Hook

**Triggered:** Before every commit
**Purpose:** Ensure code quality and basic functionality

**Checks performed:**
1. 🔍 **Lint-staged** - Automatically fixes and formats staged files
2. ✨ **ESLint** - Validates JavaScript/JSX code quality
3. 🧪 **Tests** - Runs test suite to catch regressions
4. 🏗️ **Build** - Verifies the project builds successfully

### Commit Message Hook

**Triggered:** When creating a commit message
**Purpose:** Enforce conventional commit format

**Required format:**
```
<type>[optional scope]: <description>

Types: feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert
```

**Examples:**
- `feat(pathfinding): add new A* strategy`
- `fix: resolve collision detection bug`
- `docs: update API documentation`
- `test(engine): add hamiltonian cycle tests`

### Pre-push Hook

**Triggered:** Before pushing to remote
**Purpose:** Comprehensive validation before sharing code

**Checks performed:**
1. 🧪 **Full test suite** with coverage reporting
2. 🏗️ **Production build** verification
3. 🎮 **Simulation test** to validate core game logic

## Available Scripts

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Testing
```bash
npm run test         # Run tests in watch mode
npm run test:ui      # Run tests with UI
npm run test:coverage # Run tests with coverage
npm run test:ci      # Run tests for CI (no watch)
```

### Code Quality
```bash
npm run lint         # Check code with ESLint
npm run lint:fix     # Fix ESLint issues automatically
npm run format       # Format code with Prettier
npm run format:check # Check if code is formatted
npm run quality      # Run all quality checks
npm run quality:fix  # Fix all quality issues
```

### Simulation & Analysis
```bash
npm run simulate     # Run game simulations
npm run optimize     # Run parameter optimization
npm run analyze      # Analyze simulation results
```

## Lint-staged Configuration

Automatically processes staged files:

**JavaScript/JSX files:**
- Fixes ESLint issues
- Formats with Prettier
- Validates with zero warnings policy

**Other files (JSON, CSS, Markdown):**
- Formats with Prettier

## Code Formatting Standards

### Prettier Configuration
- **Semicolons:** Required
- **Quotes:** Single quotes for JS, double for JSX attributes
- **Tab width:** 2 spaces
- **Line length:** 80 characters (120 for JSON)
- **Trailing commas:** ES5 compatible

### ESLint Rules
- Zero warnings policy in pre-commit
- React hooks rules enforced
- Modern JavaScript standards
- Import/export validation

## Manual Quality Checks

You can run quality checks manually:

```bash
# Quick check before committing
npm run quality

# Fix all issues automatically
npm run quality:fix

# Manual pre-commit simulation
npm run pre-commit
```

## Bypassing Hooks (Emergency Only)

**⚠️ Use sparingly and only in emergencies:**

```bash
# Skip pre-commit hooks
git commit --no-verify -m "emergency fix"

# Skip pre-push hooks
git push --no-verify
```

## File Exclusions

### Prettier ignores:
- `node_modules/`, `dist/`, `coverage/`
- Lock files (`package-lock.json`, etc.)
- Generated files (`*.min.js`, `*.min.css`)
- Husky hooks and Git files

### ESLint ignores:
- `dist/` - Build output
- Generated documentation

## Troubleshooting

### Hook fails with permission error
```bash
chmod +x .husky/_/*
```

### Tests fail in pre-commit
- Fix failing tests before committing
- Or run `npm run test:ui` to debug interactively

### Build fails
- Check for TypeScript/syntax errors
- Ensure all dependencies are installed
- Clear cache: `rm -rf node_modules/.vite`

### Lint-staged hangs
- Check for large files being processed
- Restart with `npm run lint:fix`

## Best Practices

1. **Commit frequently** with meaningful messages
2. **Run tests locally** before pushing
3. **Use conventional commits** for better changelog generation
4. **Fix quality issues** immediately when hooks catch them
5. **Keep commits focused** on single features/fixes
6. **Write descriptive commit messages** explaining the "why"

## Quality Gates Summary

```
📝 Commit Message Format ✓
🔍 Code Linting ✓
✨ Code Formatting ✓
🧪 Unit Tests ✓
🏗️ Build Verification ✓
🎮 Simulation Test ✓
📊 Coverage Reporting ✓
```

This setup ensures consistent code quality and prevents common issues from entering the main codebase.