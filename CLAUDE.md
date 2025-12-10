## General Principles

- Follow existing code style and patterns in the repository
- Write clear, self-documenting code with descriptive variable and function names
- Include comments for complex logic or non-obvious behavior
- Always write tests for new functionality and changes
- Update documentation for user-facing changes
- Do not introduce new dependencies without discussion

## Structure

The repository is using nx, with the source code under the "packages" directory.
Notable packages (nx projects) include:
- **packages/server/api** - Main Fastify-based API server (port 3000)
- **packages/server/shared** - Shared server utilities (logging, caching, encryption)
- **packages/engine** - Workflow execution engine (runs as separate service or AWS Lambda)
- **packages/react-ui** - React frontend application (Vite + TailwindCSS)
- **packages/shared** - Shared types and utilities across frontend/backend
- **packages/blocks/** - 50+ integration blocks (AWS, Azure, GCP, Slack, etc.)
- **packages/blocks/framework** - Base framework for creating blocks/actions/triggers
- **packages/ui-components** - Reusable UI component library (documented in Storybook)


## Code Style

Run "npx nx lint" to verify code style before committing.

### Formatting

- **Indentation:** 2 spaces (TypeScript/JavaScript, shell scripts)
- **Line length:** 100–120 characters preferred
- **Braces:** Required for all control blocks, even single-line
- **Spacing:**
  - One space between keywords and parentheses: `if (condition) {`
  - No trailing whitespace
  - Newline at end of file
- **Linting:** Use ESLint as configured in each package
- **Formatting:** Follow Prettier rules if configured
- Respect `.editorconfig`, `.eslintrc`, `.prettierrc`, and other config files

### Naming Conventions

- **Variables/Functions:** `camelCase`
- **Classes/Types:** `PascalCase`
- **Constants:** `UPPER_SNAKE_CASE`
- **Files:** Lowercase with hyphens (e.g., `user-profile.ts`)

### Comments

- Explain _why_ something is done, not _what_ (the code should be self-explanatory)
- Use `TODO:` for actionable technical debt
- Document public functions, classes, and modules

## TypeScript/JavaScript

### General Guidelines

- Use types and interfaces where appropriate
- Prefer `const` over `let` or `var`
- Prefer arrow functions for callbacks and functional components
- Use explicit return types for exported functions

### Example

```typescript
export function getUserProfile(userId: string): UserProfile {
  if (!userId) {
    throw new Error('User ID required');
  }
  // TODO: Replace with real data source
  return { id: userId, name: 'Sample User' };
}
```

## Frontend Guidelines

### Project Structure

- Use the `react-ui` package for main application logic
- Place pure, reusable components in the `ui-components` package, documented in Storybook
- Place and write tests in a separate `tests` folder

### Tech Stack

- **React 18**
- **Zustand** for state management
- **react-query v5** for data fetching
- **shadcn** for UI components
- **Axios** (use existing wrapper in `api.ts`), use `qs` package for query strings

### Best Practices

- Follow best practices for React hooks
- Prefer small, composable components
- Extract helper functions where possible
- Do not make breaking changes to existing code interfaces (component props, names) without discussion
- Ensure compliance with strict linter setups (including Sonar)
- Use `cn` utility to group Tailwind classnames:

```tsx
<div
  className={cn(
    'absolute bottom-[-20px] left-1/2 -translate-x-1/2',
    'w-[118px] h-[24px] flex items-center justify-center',
    'font-satoshi font-medium text-xs text-blueAccent-500',
    'border border-solid border-blueAccent-500 rounded-[4px]',
    'bg-background-800',
    {
      'pt-2': !someVar
    }
  )}
>
  {t('Sample output data')}
</div>
```

## Testing

- Use Jest for testing
- Place unit tests in a `tests` folder alongside the code
- Run tests using Nx commands:

```bash
npx nx test react-ui
npx nx test ui-components
npx nx test-unit server-api
npx nx test engine
npx nx lint react-ui
```

## Git and Pull Request Guidelines

### Commits

- Use imperative mood (e.g., "Fix bug" not "Fixed bug" or "Fixing bug")
- Keep commits small and focused on a single change
- Write descriptive commit messages that explain what and why, not how


### Pull Requests

#### Size and Scope

- Keep PRs focused on a single feature, bug fix, or improvement
- Break down work into logical, small commits
- Only include changes related to the issue, no unrelated modifications

#### Title Requirements

- Must start with a capital letter and a real word
- Must have at least three words
- Must use imperative mood (e.g., "Add GO support" not "Added GO support")

#### Reference an issue

All PRs must reference a linear issue in their body.

Examples: 
- Fixes OPS-100.
- Resolves OPS-101.
- Part of CI-102.

## Additional Resources

- [CONTRIBUTING.md](./CONTRIBUTING.md) - General contribution guidelines
- [.github/pull_request_template.md](./.github/pull_request_template.md) - PR template
- [.github/prlint.json](./.github/prlint.json) - PR linting rules
- [docs.openops.com](https://docs.openops.com) - Official OpenOps documentation
