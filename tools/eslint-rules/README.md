# OpenOps Block Style Guide ESLint Plugin

Custom ESLint plugin to enforce style guide rules for `displayName` and `description` fields in OpenOps blocks.

## Rules

### `block-style-guide`

Enforces the following style guide rules for block definitions:

#### 1. displayName - Title Case
- Must be in Title Case (first letter of each word capitalized)
- Exception: small words like "a", "and", "the", "of" can be lowercase (unless first word)
- Acronyms (API, SQL, UUID, HTTP, etc.) should remain uppercase

**Examples:**
```typescript
// ✓ Good
displayName: 'Get Recommendations'
displayName: 'Execute SQL Statement'
displayName: 'Send HTTP Request'
displayName: 'Order By'

// ✗ Bad
displayName: 'get recommendations'
displayName: 'Execute sql statement'
displayName: 'send Http request'
```

#### 2. description - Sentence Case
- Must start with a capital letter
- Should NOT end with a period (unless multiple sentences)
- Use imperative form for actions (Get, Create, Send) not third-person (Gets, Creates, Sends)

**Examples:**
```typescript
// ✓ Good
description: 'Get cost recommendations from the provider'
description: 'Send an email using SMTP. Supports attachments and HTML content.'

// ✗ Bad
description: 'get cost recommendations'
description: 'Get cost recommendations from the provider.'  // No period for single sentence
description: 'Gets cost recommendations'  // Use imperative, not third-person
```

#### 3. displayName and description Must Be Distinct
- displayName and description should not be the same or too similar (>80% similarity)

**Examples:**
```typescript
// ✓ Good
displayName: 'Get Recommendations'
description: 'Fetch cost optimization suggestions from the provider'

// ✗ Bad
displayName: 'Get Recommendations'
description: 'Get recommendations'  // Too similar
```

#### 4. description Must Not Be Empty
- Every description field must have meaningful content

**Examples:**
```typescript
// ✓ Good
description: 'Create a new item in the database'

// ✗ Bad
description: ''
description: '  '
```

#### 5. Action displayNames Should Use Verbs
- For actions, displayName should start with an action verb
- Common verbs: Get, Create, Update, Delete, Send, Execute, Run, Add, Remove, etc.

**Examples:**
```typescript
// ✓ Good (in createAction context)
displayName: 'Get User Profile'
displayName: 'Create Database Entry'
displayName: 'Send Notification'

// ✗ Bad (in createAction context)
displayName: 'User Profile'  // Missing verb
displayName: 'Database Entry Creation'  // Not verb-first
```

## Installation

The plugin is already integrated into the OpenOps monorepo. To enable it:

1. The plugin is located in `tools/eslint-rules/`
2. It's configured in `.eslintrc.json` for the blocks package

## Usage

The rule runs automatically when you run ESLint:

```bash
# Lint all files
npm run lint

# Lint blocks specifically
npx nx lint blocks

# Auto-fix issues where possible
npx nx lint blocks --fix
```

## Configuration

The rule is enabled by default for the blocks package. You can configure it in `.eslintrc.json`:

```json
{
  "rules": {
    "@openops/block-style/block-style-guide": "error"
  }
}
```

## Development

To test the rule:

```bash
# From the tools/eslint-rules directory
npm test

# Or test against actual block files
npx eslint packages/blocks/*/src/**/*.ts
```

## Error Messages

The rule provides specific error messages for each violation:

- `displayNameNotTitleCase`: displayName should be in Title Case
- `descriptionNotSentenceCase`: description should start with a capital letter
- `descriptionTrailingPeriod`: description should not end with a period (unless multiple sentences)
- `descriptionEmpty`: description must not be empty
- `displayNameDescriptionSimilar`: displayName and description are too similar
- `actionDisplayNameNotVerb`: Action displayName should start with a verb

## Examples

### Before (Violations)
```typescript
createAction({
  displayName: 'get recommendations',  // Not Title Case
  description: 'Gets recommendations.',  // Third-person verb + trailing period
  // ...
});
```

### After (Compliant)
```typescript
createAction({
  displayName: 'Get Recommendations',  // Title Case
  description: 'Get cost optimization recommendations from the provider',  // Imperative, no period
  // ...
});
```
