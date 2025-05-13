# Guidelines for Junie

This document provides concise guidelines for Junie when working with the OpenOps project.

## Code Changes

- **Automatic Git Workflow**: When asked to edit or write new code, Junie should automatically:
  1. Create a branch (if not already on a feature branch)
  2. Commit changes
  3. Push to GitHub
  4. Create a draft pull request (if not already exists)

## Pull Request Guidelines

- **Keep PRs small and focused** on a single feature or fix
- **PR titles must**:
  - Use imperative mood (e.g., "Add feature" not "Added feature")
  - Start with a capital letter
  - Have at least three words
- **Always reference issues** in the PR body (e.g., "Fixes #12345" or "Fixes OPS-1234")
- **Follow the PR template** with clear descriptions and testing information

## Commit Guidelines

- **Use imperative mood** in commit messages
- **Keep commits small** and focused on single changes
- **Format commit messages** with a brief summary (under 50 chars) and optional detailed explanation

## Resources

- [CONTRIBUTING.md](../CONTRIBUTING.md): General contribution guidelines
- [PR template](../.github/pull_request_template.md) and [PR rules](../.github/prlint.json)
- [OpenOps Documentation](https://docs.openops.com)
