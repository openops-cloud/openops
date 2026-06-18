<!-- ---
applyTo: '**'
excludeAgent: 'cloud-agent'
---

Review every pull request from the five perspectives below, then post a mandatory PR-level summary comment.

## General review rules

- Only comment on issues introduced or affected by the current diff.
- Do not manufacture findings to satisfy a checklist.
- Prefer fewer, higher-signal comments over many low-value comments.
- Avoid repeating the same feedback across perspectives.
- Prefer actionable comments with concrete examples.
- Clearly distinguish **required fixes** from **optional improvements**.
- Avoid nitpicks unless they affect readability, correctness, security, or maintainability.
- Do not comment on unchanged code unless the current diff makes the existing code problematic.

---

## Review perspectives

### 1. Correctness and maintainability

Look for broken logic, fragile assumptions, edge cases, duplicated logic, unnecessary complexity, unclear naming, overly long functions, misleading comments, and non-idiomatic TypeScript/JavaScript patterns.

### 2. Security

Look for unsafe input handling, injection risks, XSS vectors, hardcoded or logged secrets, missing authorization checks, user-controlled data reaching sensitive operations, insecure defaults, overly permissive CORS/CSP, and unsafe dependency usage.

### 3. Performance and reliability

Look for N+1 queries, unnecessary database or API calls in loops, avoidable large in-memory processing, blocking operations in async contexts, and scalability risks. Do not suggest premature optimizations when the benefit is unclear.

### 4. Testing

Look for missing tests around non-trivial logic, error paths, boundary conditions, permission checks, regressions, and product-critical behavior. Flag weak tests that only assert `toBeTruthy()` or `toBeDefined()`. Prefer concrete missing test scenarios over vague requests for "more tests."

### 5. Product and user impact

Look for behavior changes that could break existing workflows, integrations, API contracts, stored data, or backwards compatibility. Flag unclear user-facing errors and changes that should be documented or placed behind a feature flag.

---

## Pull request overview

When writing the pull request overview, you MUST include a `Review Summary` section.

The `Review Summary` section should use this structure:

### Review Summary

#### Blocking

List required fixes that must be addressed before merge.

Use `None` if there are no blocking issues.

#### Non-blocking

List recommended improvements.

Use `None` if there are no non-blocking issues.

#### Merge recommendation

Use exactly one:

- **Ready to merge**
- **Merge after addressing non-blocking comments**
- **Do not merge**

Use **Do not merge** only when blocking issues are present. -->
