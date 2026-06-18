---
applyTo: '**'
excludeAgent: 'coding-agent'
---

Review every pull request for correctness, security, performance, test coverage, maintainability, and user impact.

## General review rules

- Only comment on issues introduced or affected by the current diff.
- Do not manufacture findings to satisfy a checklist.
- Prefer fewer, higher-signal comments over many low-value comments.
- Avoid repeating the same feedback in multiple comments.
- Prefer actionable comments with concrete examples.
- Clearly distinguish **required fixes** from **optional improvements**.
- Avoid nitpicks unless they affect readability, correctness, security, or maintainability.
- Do not comment on unchanged code unless the current diff makes the existing code problematic.

## Review focus areas

### Correctness and maintainability

Look for broken logic, fragile assumptions, edge cases, duplicated logic, unnecessary complexity, unclear naming, overly long functions, misleading comments, and non-idiomatic TypeScript/JavaScript patterns.

### Security

Look for unsafe input handling, injection risks, XSS vectors, hardcoded or logged secrets, missing authorization checks, user-controlled data reaching sensitive operations, insecure defaults, overly permissive CORS/CSP, and unsafe dependency usage.

### Performance and reliability

Look for meaningful performance or reliability concerns, such as N+1 queries, unnecessary database or API calls in loops, avoidable large in-memory processing, blocking operations in async contexts, and scalability risks.

Do not suggest premature optimizations when the benefit is unclear.

### Testing

Look for missing tests around non-trivial logic, error paths, boundary conditions, permission checks, regressions, and product-critical behavior.

Flag weak tests that only assert `toBeTruthy()` or `toBeDefined()` without meaningful behavior assertions.

Prefer concrete missing test scenarios over vague requests for “more tests.”

### Product and user impact

Look for behavior changes that could break existing workflows, integrations, API contracts, stored data, configuration, or backwards compatibility.

Flag unclear user-facing errors and changes that should be documented, communicated, or placed behind a feature flag.

---

## Pull request overview

When creating the pull request-level Copilot overview comment, include these sections:

```md
## Review Summary

### Blocking

- List required fixes that must be addressed before merge.
- Use `None` if there are no blocking issues.

### Non-blocking

- List recommended improvements.
- Use `None` if there are no non-blocking issues.

### Merge recommendation

Use exactly one:

- **Ready to merge**
- **Merge after addressing non-blocking comments**
- **Do not merge**
```

Use **Do not merge** only when blocking issues are present.

The review summary belongs in the pull request-level overview comment, not in an inline file comment.

---

## Re-reviews

If this is a re-review, include a re-review update in the pull request-level overview when possible.

Use this format:

```md
## Re-review Update

### Resolved

- List previously reported issues that are now resolved.
- Use `None` if no previous issues were resolved.

### Still unresolved

- List previously reported issues that still need attention.
- Use `None` if no previous issues remain unresolved.

### New issues

- List any new issues found in this re-review.
- Use `None` if no new issues were found.

### Updated merge recommendation

Use exactly one:

- **Ready to merge**
- **Merge after addressing non-blocking comments**
- **Do not merge**
```

Do not create duplicate summary content if the existing pull request overview can be updated. If the previous overview cannot be edited, add the re-review update to the new pull request-level overview comment.
