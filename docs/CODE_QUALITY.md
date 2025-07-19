# Code Quality Guidelines

This document outlines the code quality standards and validation rules for the Infinite Fusion Nuzlocke Tracker project.

## Validation Rules

### Automated Validation

The project enforces code quality through automated validation using Prettier and ESLint:

```bash
# Check both formatting and linting
pnpm validate

# Fix formatting and auto-fix linting issues
pnpm validate:fix
```

### Individual Tools

You can also run the tools individually:

```bash
# Prettier (Code Formatting)
pnpm format:check  # Check if files are properly formatted
pnpm format        # Format all files with Prettier

# ESLint (Code Linting)
pnpm lint          # Check for code issues
pnpm lint:fix      # Auto-fix linting issues where possible
```

## Pre-commit Hooks

To ensure code quality before commits, you can set up pre-commit hooks:

1. Install Husky (if not already installed):

   ```bash
   pnpm add -D husky
   pnpm husky install
   ```

2. The pre-commit hook will automatically run `pnpm validate` before each commit.

3. If validation fails, the commit will be aborted with helpful error messages.

## Configuration Files

- `.prettierrc` - Prettier formatting rules
- `.prettierignore` - Files to exclude from Prettier formatting
- `eslint.config.mjs` - ESLint configuration with Prettier integration

## Code Style Standards

### Prettier Configuration

- **Quotes**: Single quotes for strings
- **Semicolons**: Always use semicolons
- **Line Width**: 80 characters maximum
- **Indentation**: 2 spaces
- **Trailing Commas**: Use in objects and arrays
- **JSX Quotes**: Single quotes for JSX attributes

### ESLint Rules

- **TypeScript**: Strict type checking
- **React**: Best practices for React components
- **Next.js**: Next.js specific rules
- **Prettier Integration**: No conflicts with Prettier formatting

## Best Practices

### Before Committing

1. Run `pnpm validate` to check code quality
2. Fix any issues found by the validation
3. Use `pnpm validate:fix` to automatically fix many issues
4. Manually fix any remaining issues that can't be auto-fixed

### During Development

- Use your editor's Prettier and ESLint extensions for real-time feedback
- Configure your editor to format on save
- Run validation before pushing code

### CI/CD Integration

The validation rules are integrated into the CI/CD pipeline:

- All pull requests must pass `pnpm validate`
- Builds will fail if code quality standards are not met
- Automated fixes are applied where possible

## Troubleshooting

### Common Issues

1. **Formatting Conflicts**: Run `pnpm format` to resolve
2. **Linting Errors**: Use `pnpm lint:fix` for auto-fixable issues
3. **TypeScript Errors**: Fix type issues manually
4. **Unused Variables**: Remove or use the variables

### Getting Help

- Check the ESLint and Prettier documentation
- Review the configuration files in the project
- Ask for help in the project discussions

## IDE Setup

### VS Code

Recommended extensions:

- Prettier - Code formatter
- ESLint
- TypeScript and JavaScript Language Features

### Other Editors

Configure your editor to:

- Format on save using Prettier
- Show ESLint errors and warnings
- Use the project's configuration files
