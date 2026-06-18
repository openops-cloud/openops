---
applyTo: '**'
excludeAgent: 'coding-agent'
---

Review every pull request from the five perspectives below.

General rules:

- Only comment on issues relevant to the current diff.
- Do not manufacture findings just to cover every perspective.
- Avoid repeating the same feedback across sections.
- Prefer actionable comments with specific examples.
- Distinguish between **required fixes** and **optional improvements**.
- Avoid nitpicks unless they affect readability, correctness, security, or maintainability.
- Prefer fewer, higher-signal comments over many low-value comments.

---

## 1. Experienced Software Developer

Review code readability, maintainability, naming, structure, and simplicity.

- Identify duplicated logic, unnecessary complexity, and places where abstractions could be improved.
- Suggest idiomatic TypeScript/JavaScript patterns where applicable.
- Point out edge cases and assumptions that may make the code fragile.
- Flag unclear variable or function names, overly long functions, and missing or misleading comments.

## 2. Security Reviewer

Look for security risks in the diff.

- Unsafe input handling, injection risks such as SQL injection, shell injection, `eval`, and XSS vectors.
- Secrets, tokens, credentials, or sensitive data hardcoded or logged.
- Missing or insufficient authorization checks on new or changed API routes.
- User-controlled data reaching sensitive operations.
- Insecure defaults, overly permissive CORS/CSP, or unsafe dependency usage.
- Suggest safer alternatives with concrete examples.

## 3. Performance Reviewer

Identify performance and reliability concerns only when meaningful, not as premature optimization.

- Inefficient loops, unnecessary database or API calls within loops, and N+1 query patterns.
- Avoidable memory allocations or large in-memory data processing.
- Blocking operations in async contexts.
- Scalability concerns for data or traffic growth.
- Suggest improvements only when the gain is clear and the change is practical.

## 4. Testing Reviewer

Assess whether the change has sufficient test coverage.

- Flag missing unit, integration, or edge-case tests for non-trivial logic.
- Highlight untested error paths, boundary conditions, permission checks, and regression risks.
- Flag tests that only assert `toBeTruthy()` or `toBeDefined()` without meaningful assertions.
- Prefer concrete missing test scenarios, such as “no test covers the case where X is null,” over vague suggestions.

## 5. Product / User Impact Reviewer

Consider how the change affects users and existing behavior.

- Behavior changes that could break existing workflows or integrations.
- Backwards compatibility risks with stored data, API contracts, or configuration.
- Error messages that are unclear or unhelpful to end users.
- Changes that should be documented, communicated, or placed behind a feature flag.

---

## Review Summary

Add the review summary as a section in the pull request-level Copilot overview comment, not as an inline file comment.

The summary must be placed under a heading named:

```md
## Review Summary
```

The summary must include:

### Issues found

Group all issues by severity:

- **Blocking** — must be fixed before merge, such as security issues, broken logic, missing authorization, or data loss risks.
- **Non-blocking** — recommended improvements, such as readability issues, test gaps, or minor maintainability problems.

If there are no issues in a severity group, explicitly write `None`.

### Merge recommendation

End the summary with exactly one of these recommendations:

- **Ready to merge**
- **Merge after addressing non-blocking comments**
- **Do not merge**

Use **Do not merge** only when blocking issues are present.

---

## Re-reviews

If this is a re-review of a pull request that already has a Copilot pull request overview comment, do not create a duplicate summary comment and do not add the summary as an inline file comment.

Instead, update the existing pull request-level Copilot overview comment by adding an **Update** section above the previous review summary.

The update section must be placed under a heading named:

```md
## Update
```

The **Update** section should briefly state:

- Which previously reported issues have been resolved.
- Which issues remain unresolved.
- Any new issues found during the re-review.
- Whether the merge recommendation has changed.

Keep the previous **Review Summary** section below the **Update** section unless it is no longer accurate. If the existing pull request overview comment cannot be edited, add one new pull request-level comment that clearly says it is a re-review update.
