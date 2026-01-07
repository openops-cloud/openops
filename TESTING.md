# Testing Guide

This document describes how to run tests with timing information in the OpenOps repository.

## Running Tests with Timing

### Local Development

#### Option 1: Using npm scripts (Recommended)

```bash
# Run all tests with timing information
npm run test:timing

# Run all tests with verbose output
npm run test:verbose

# Run tests for a specific project with timing
npx nx test <project-name> -- --verbose
```

#### Option 2: Using nx directly

```bash
# Run tests with timing for a specific project
JEST_VERBOSE=true npx nx test <project-name> -- --verbose

# Run tests with timing for all projects
JEST_VERBOSE=true npx nx run-many --target=test -- --verbose

# Run tests with timing for affected projects only
JEST_VERBOSE=true npx nx affected --target=test -- --verbose
```

### Examples

```bash
# Run engine tests with timing
npx nx test engine -- --verbose

# Run server-api tests with timing
npx nx test server-api -- --verbose

# Run all UI tests with timing
npx nx run-many --target=test --projects="ui-*" -- --verbose
```

## Understanding Test Output

When running tests with `--verbose` flag, you'll see:

- **Individual test execution time**: Each test shows its duration in milliseconds
- **Test suite total time**: Total time taken for each test suite
- **Overall execution time**: Total time for all test suites

Example output:
```
 PASS   shared  packages/shared/test/common/utils/extract-string-property.test.ts
  extractStringProperty
    ✓ should extract string property (5 ms)
    ✓ should handle missing property (1 ms)
    ✓ should handle nested properties (2 ms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
Snapshots:   0 total
Time:        1.284 s
```

## CI/CD Integration

In GitHub Actions (CI environment), tests automatically:

1. Run with `--verbose` flag for detailed timing information
2. Generate JUnit XML reports in `test-results/` directory
3. Upload test results as artifacts with 7-day retention
4. Display timing for each test and test suite in the CI logs

### Viewing CI Test Results

1. Navigate to the GitHub Actions workflow run
2. Check the "Test" job logs to see timing information
3. Download test result artifacts for detailed analysis

## Test Result Artifacts

JUnit XML reports are generated in CI and include:

- Test execution times
- Test suite execution times
- Pass/fail status
- File paths and test names

These artifacts can be:
- Downloaded from GitHub Actions artifacts
- Integrated with test reporting tools
- Used for performance analysis and tracking

## Configuration

Test timing is configured in:

- **jest.preset.js**: Global Jest configuration with reporters
  - Uses `jest-junit` reporter in CI mode
  - Enables verbose mode via `JEST_VERBOSE` environment variable
- **.github/workflows/ci.yml**: CI workflow configuration
  - Sets `CI=true` and `JEST_VERBOSE=true` environment variables
  - Uploads test results as artifacts

## Performance Tips

- Individual tests taking >100ms may indicate performance issues
- Test suites taking >5s should be reviewed for optimization
- Use `--verbose` selectively in local development to avoid output clutter
- In CI, verbose output helps diagnose slow or flaky tests
