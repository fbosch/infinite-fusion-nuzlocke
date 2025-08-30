# AGENTS.md - Infinite Fusion Nuzlocke Tracker

**Essential guide for AI agents working on this project**

## 🚀 Quick Start

### What You Need to Know First

- **Project**: Pokémon Infinite Fusion Nuzlocke Tracker
- **Tech Stack**: Next.js 15 + TypeScript + Tailwind CSS + Vitest
- **Package Manager**: Always use `pnpm` (never npm/yarn)
- **Testing**: Vitest MCP is your primary testing tool
- **Icons**: Lucide React only (never UTF-8 symbols)

### Essential Commands

```bash
pnpm install      # Install dependencies
pnpm dev          # Start development server
pnpm test:run     # Run tests
pnpm build        # Build for production
pnpm lint         # Check code quality
```

## 🎯 Project Overview

**What it solves**: Pokémon trainers need a way to track their Nuzlocke challenge runs (a hardcore challenge where fainted Pokémon are considered dead and only first encounters can be caught). This app provides that tracking with special support for Infinite Fusion's unique mechanics like DNA Splicers and 251,001 possible fusion combinations.

## 🏗️ Technology Stack

| Category             | Technology                    | Notes                       |
| -------------------- | ----------------------------- | --------------------------- |
| **Framework**        | Next.js 15 + App Router       | Modern React framework      |
| **Language**         | TypeScript                    | Strict mode enabled         |
| **Styling**          | Tailwind CSS v4               | Utility-first CSS           |
| **Testing**          | Vitest with UI                | Primary testing tool        |
| **Package Manager**  | pnpm                          | Always use this             |
| **Linting**          | ESLint + Prettier             | Code quality enforcement    |
| **State Management** | React hooks + Zustand         | Local state + global stores |
| **Database**         | Local storage + export/import | No external database        |
| **Icons**            | Lucide React                  | Never UTF-8 symbols         |

## 🔧 MCP Tools Priority

**Use this order for all operations:**

1. **Vitest MCP** - Testing (files, coverage, debugging)
2. **GitMCP** - Project docs and code search
3. **Context7** - External library documentation
4. **Browser Tools** - Web testing and audits
5. **Sequential Thinking** - Complex problem solving
6. **ESLint MCP** - Code quality verification

## 🚨 Critical Rules

### State Management

- **Prefer alternatives to useState/useEffect** when possible
- **Avoid unnecessary state** for values that can be derived from props or other state
- **Use calculated state** for filtering/searching instead of storing filtered results
- **Handle filtering locally in UI components** as calculated state

### Icon Usage

- **Always use Lucide React icons** - never UTF-8 symbols
- **Consistent sizing**: `h-4 w-4`, `h-5 w-5`, `h-6 w-6`
- **Accessibility**: Include proper ARIA labels and screen reader support

### Accessibility

- **WCAG 2.1 AA compliance** mandatory
- **Semantic HTML** before ARIA attributes
- **Keyboard navigation** support required
- **Screen reader** compatibility mandatory

## 🎮 Core Game Mechanics

### Nuzlocke Rules (Must Implement)

1. **First Encounter Rule**: Only catch first Pokémon in each new area
2. **Fainting = Death**: Fainted Pokémon cannot be used again
3. **Nickname Rule**: All Pokémon must be nicknamed

### Infinite Fusion Features

- **DNA Splicers**: Track usage and availability
- **Head/Body Combinations**: 251,001 possible combinations
- **Fusion Stats**: Calculate and display fusion stats
- **Triple Fusions**: Support for Kyurem triple fusions

## 📁 Project Structure

```
src/
├── app/           # Next.js App Router pages
├── components/    # React components
├── lib/          # Utility functions
├── stores/        # Zustand state stores
├── data/         # Static Pokémon data
└── types/        # TypeScript type definitions
```

## 🧪 Testing & Quality

### Testing Strategy

- **Vitest MCP** is primary testing tool
- **Test alongside source files** or in `tests/` directory
- **Browser tests** for DOM-dependent functionality
- **Coverage analysis** for identifying untested code

### Code Quality Standards

- **ESLint MCP** for code quality verification
- **Prettier** for consistent formatting
- **TypeScript strict mode** enabled
- **No redundant comments** - prefer self-documenting code

## 📋 Available Scripts

| Script          | Command              | Purpose                  |
| --------------- | -------------------- | ------------------------ |
| **Development** | `pnpm dev`           | Start development server |
| **Build**       | `pnpm build`         | Build for production     |
| **Production**  | `pnpm start`         | Start production server  |
| **Testing**     | `pnpm test`          | Run tests in watch mode  |
| **Test Once**   | `pnpm test:run`      | Run tests once           |
| **Coverage**    | `pnpm test:coverage` | Generate coverage report |
| **Linting**     | `pnpm lint`          | Run ESLint               |
| **Fix Lint**    | `pnpm lint:fix`      | Fix ESLint issues        |
| **Type Check**  | `pnpm type-check`    | Run TypeScript compiler  |

## 🎯 Key Implementation Areas

### Team Management

- Team display with nicknames, levels, HP, status
- Team editor for adding/removing Pokémon
- Death box for fainted Pokémon
- Team statistics and weaknesses

### Progress Tracking

- Visual progress map through regions
- Encounter tracker per route/area
- Badge tracker for gym progress
- Route list with encounter status

### Fusion Interface

- Fusion calculator for combinations
- Fusion history tracking
- DNA Splicer availability
- Fusion gallery display

## 🚫 Common Anti-Patterns to Avoid

- **Unnecessary state**: Don't store values that can be computed
- **UTF-8 symbols**: Always use Lucide React icons
- **Deep nesting**: Keep conditional logic ≤ 2 levels
- **God components**: Split large components into focused ones
- **Complex useEffect chains**: Prefer event handlers and derived state

## ✅ Code Review Checklist

Before committing, ensure:

- [ ] Follows Single Responsibility Principle
- [ ] Uses composition over inheritance
- [ ] Implements proper error handling
- [ ] Includes accessibility features
- [ ] Uses Lucide React icons (not UTF-8)
- [ ] Handles state management efficiently
- [ ] Includes appropriate tests
- [ ] Follows TypeScript best practices

## 🔍 Troubleshooting

### Common Issues

| Problem               | Solution                                       |
| --------------------- | ---------------------------------------------- |
| **Tests failing**     | Use `pnpm test:run` with `showLogs: true`      |
| **Linting errors**    | Run `pnpm lint:fix` to auto-fix issues         |
| **Build errors**      | Check TypeScript with `pnpm type-check`        |
| **MCP tools failing** | Use terminal fallbacks (e.g., `pnpm test:run`) |

### Fallback Commands

When MCP tools fail, use these terminal commands:

```bash
pnpm test:run     # Instead of Vitest MCP
pnpm lint         # Instead of ESLint MCP
pnpm build        # Check for build errors
```

## 📚 Additional Resources

- **Cursor Rules**: `.cursor/rules/` directory for detailed guidelines
- **Project Guide**: `.cursor/rules/project-guide.mdc`
- **Testing Guide**: `.cursor/rules/testing-guide.mdc`
- **Accessibility Guide**: `.cursor/rules/accessibility.mdc`

## 🎯 Before You Start

1. **Set project root** for Vitest MCP: `mcp_vitest_set_project_root()`
2. **Check available tools** in `.cursor/mcp.json`
3. **Understand the domain** - this is a Pokémon game tracker
4. **Focus on user experience** - trainers need intuitive tracking

---

**Remember**: This is a Nuzlocke tracker for Pokémon Infinite Fusion. The game mechanics and Nuzlocke rules are as important as the technical implementation. Always consider the user experience for Pokémon trainers tracking their challenge runs.
