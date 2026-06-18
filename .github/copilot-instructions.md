When you start a code review always start with a general comment on the Pull request saying "Starting"

# Pull Request Review Guidelines

Review the current pull request diff for security, code quality/readability, and performance.

Only comment when there is a concrete issue introduced or affected by the current diff. Do not manufacture findings just to satisfy these categories.

## General review rules

- Review only the changed code and code directly affected by the change.
- Prefer fewer, higher-signal comments over many low-value comments.
- Avoid nitpicks unless they affect correctness, security, readability, maintainability, or performance.
- Do not repeat the same feedback in multiple comments.
- Make each comment actionable and include a concrete suggestion when possible.
- Clearly distinguish required fixes from optional improvements.
- Do not comment on unchanged code unless the diff makes the existing code newly risky or incorrect.

## Security review

Prioritize security issues that could affect users, data, credentials, permissions, or production systems.

Comment on:

- Missing or insufficient authorization checks.
- User-controlled input reaching sensitive operations without validation or sanitization.
- SQL injection, shell injection, command injection, `eval`, unsafe deserialization, or XSS risks.
- Hardcoded, exposed, or logged secrets, tokens, credentials, API keys, or sensitive user data.
- Overly permissive CORS, CSP, permissions, roles, or access policies.
- Insecure defaults or unsafe dependency usage.

Mark security issues as required fixes when they could expose data, bypass authorization, corrupt data, or compromise the system.

## Code quality and readability review

Focus on maintainability, clarity, and correctness.

Comment on:

- Broken logic, fragile assumptions, missing edge-case handling, or likely regressions.
- Unclear names for variables, functions, classes, files, or modules.
- Duplicated logic that should be shared or simplified.
- Unnecessary complexity, overly clever code, or abstractions that make the change harder to understand.
- Functions or modules that are too large or mix unrelated responsibilities.
- Misleading comments, missing comments for non-obvious logic, or dead code.
- Non-idiomatic TypeScript or JavaScript patterns when they reduce safety or clarity.

Prefer suggestions that make the code easier to understand, test, and maintain.

## Performance and reliability review

Only comment on performance issues when the concern is meaningful and the suggested improvement is practical.

Comment on:

- N+1 database queries or repeated API calls inside loops.
- Avoidable large in-memory processing, especially for unbounded data sets.
- Blocking operations in async request paths.
- Expensive work repeated unnecessarily instead of cached, batched, or moved out of hot paths.
- Changes that could create scalability, timeout, retry, or resource-exhaustion risks.
- Missing cleanup for timers, streams, subscriptions, connections, or other resources.

Do not suggest premature optimizations when the current implementation is clear and the performance impact is unlikely to matter.

## Review summary

When possible, include a concise pull request-level summary covering:

### Blocking

List required fixes that must be addressed before merge. Use `None` if there are no blocking issues.

### Non-blocking

List optional improvements or follow-up recommendations. Use `None` if there are no non-blocking issues.

### Merge recommendation

Use exactly one:

- **Ready to merge**
- **Merge after addressing non-blocking comments**
- **Do not merge**

Use **Do not merge** only when blocking issues are present.
