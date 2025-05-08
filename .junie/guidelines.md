# Guidelines for Junie

This document provides guidelines for contributing to the OpenOps project, focusing on pull requests and commit practices.

## Pull Request Guidelines

### Size and Scope

- **Prefer small PRs**: Keep pull requests focused on a single feature, bug fix, or improvement.
- **Small commits**: Break down your work into logical, small commits that each represent a complete change.
- **One change per PR**: The PR should only contain changes related to the issue, with no unrelated modifications.

### Naming and Formatting

- **Use imperative mood** for PR titles and commit messages (e.g., "Add feature" not "Added feature" or "Adding feature").
- **PR title requirements** (as defined in `.github/prlint.json`):
  - Must start with a capital letter and a real word (e.g., "Add GO support")
  - Must have at least three words
  - Must use imperative mood (e.g., "Fix bug" not "Fixed bug" or "Fixing bug")

### Creating Pull Requests

1. **Use GitHub CLI to create a draft PR**:
   ```bash
   # Create a draft PR
   gh pr create --draft --title "Add feature name" --body "Fixes #12345"
   ```

2. **Reference issues**:
   - Reference a GitHub issue in the PR body (e.g., "Fixes #12345")
   - Reference a Linear issue if one was mentioned (e.g., "Fixes OPS-1234")
   - If no relevant issue exists, create a GitHub issue first:
     ```bash
     # Create a GitHub issue
     gh issue create --title "Issue title" --body "Issue description"
     ```

3. **Follow the PR template**:
   - Provide a clear description of the changes
   - Complete the testing checklist
   - Include visual changes if applicable

## Commit Guidelines

- **Use imperative mood** in commit messages (e.g., "Fix bug" not "Fixed bug")
- **Keep commits small and focused** on a single change
- **Write descriptive commit messages** that explain what the change does and why
- **Follow this format** for commit messages:
  ```
  Short summary in imperative mood (under 50 chars)

  More detailed explanation if necessary. Wrap at around 72 
  characters. Explain what and why, not how (the code shows that).

  Fixes #issue_number
  ```

## Additional Resources

- [CONTRIBUTING.md](../CONTRIBUTING.md): General contribution guidelines
- [.github/pull_request_template.md](../.github/pull_request_template.md): PR template
- [.github/prlint.json](../.github/prlint.json): PR linting rules
- [docs.openops.com](https://docs.openops.com): Official OpenOps documentation
