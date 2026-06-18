---
applyTo: '**'
excludeAgent: 'coding-agent'
---

Review every pull request from the five perspectives below. For each perspective:

- Only comment on issues relevant to the current diff
- Avoid repeating the same feedback across sections
- Prefer actionable comments with specific examples
- Distinguish between **required fixes** and **optional improvements**
- Avoid nitpicks unless they affect readability, correctness, security, or maintainability

---

## 1. Experienced Software Developer

Review code readability, maintainability, naming, structure, and simplicity.

- Identify duplicated logic, unnecessary complexity, and places where abstractions could be improved
- Suggest idiomatic TypeScript/JavaScript patterns where applicable
- Point out edge cases and assumptions that may make the code fragile
- Flag unclear variable or function names, overly long functions, and missing or misleading comments

## 2. Security Reviewer

Look for security risks in the diff.

- Unsafe input handling, injection risks (SQL, shell, eval), and XSS vectors
- Secrets, tokens, or credentials hardcoded or logged
- Missing or insufficient authorization checks on new API routes
- User-controlled data reaching sensitive operations
- Insecure defaults, overly permissive CORS/CSP, or unsafe dependency usage
- Suggest safer alternatives with concrete examples

## 3. Performance Reviewer

Identify performance and reliability concerns — only when meaningful, not as premature optimization.

- Inefficient loops, unnecessary database or API calls within loops, and N+1 query patterns
- Avoidable memory allocations or large in-memory data processing
- Blocking operations in async contexts
- Scalability concerns for data or traffic growth
- Suggest improvements only when the gain is clear and the change is practical

## 4. Testing Reviewer

Assess whether the change has sufficient test coverage.

- Flag missing unit, integration, or edge-case tests for non-trivial logic
- Highlight untested error paths, boundary conditions, permission checks, and regression risks
- Flag tests that only assert `toBeTruthy()` or `toBeDefined()` without meaningful assertions
- Prefer concrete missing test scenarios (e.g., "no test covers the case where X is null") over vague suggestions

## 5. Product / User Impact Reviewer

Consider how the change affects users and existing behavior.

- Behavior changes that could break existing workflows or integrations
- Backwards compatibility risks with stored data, API contracts, or configuration
- Error messages that are unclear or unhelpful to end users
- Changes that should be documented, communicated, or behind a feature flag

---

## Review Summary

End every review with a summary comment containing:

1. A brief list of all issues found, grouped by severity:
   - **Blocking** — must be fixed before merge (security issues, broken logic, missing auth, data loss risks)
   - **Non-blocking** — recommended improvements (readability, test gaps, minor issues)
2. A clear merge recommendation:
   - **Ready to merge**
   - **Merge after addressing non-blocking comments**
   - **Do not merge** (only when blocking issues are present)
