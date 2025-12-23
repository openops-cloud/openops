/**
 * Test examples for the block-style-guide ESLint rule
 * 
 * These examples demonstrate violations and correct usage
 */

// ❌ VIOLATIONS - These will trigger ESLint errors

// Violation: displayName not in Title Case
const badAction1 = {
  displayName: 'get recommendations',  // Should be "Get Recommendations"
  description: 'Get cost optimization recommendations',
};

// Violation: description with trailing period (single sentence)
const badAction2 = {
  displayName: 'Get Recommendations',
  description: 'Get cost optimization recommendations.',  // Remove period
};

// Violation: description not starting with capital
const badAction3 = {
  displayName: 'Send Email',
  description: 'send an email using SMTP',  // Should start with capital
};

// Violation: empty description
const badAction4 = {
  displayName: 'Create User',
  description: '',  // Must not be empty
};

// Violation: displayName and description too similar
const badAction5 = {
  displayName: 'Delete Record',
  description: 'Delete record',  // Too similar to displayName
};

// Violation: Action displayName not starting with verb
const badAction6 = {
  displayName: 'User Profile',  // Should be "Get User Profile" or similar
  description: 'Get the user profile information',
};

// Violation: Using third-person verb
const badAction7 = {
  displayName: 'Update Settings',
  description: 'Updates the application settings',  // Should be "Update" not "Updates"
};

// ✅ CORRECT USAGE - These pass the linter

const goodAction1 = {
  displayName: 'Get Recommendations',
  description: 'Get cost optimization recommendations from the provider',
};

const goodAction2 = {
  displayName: 'Send HTTP Request',
  description: 'Send an HTTP request to a specified URL',
};

const goodAction3 = {
  displayName: 'Execute SQL Statement',
  description: 'Run an SQL query in a Databricks workspace and retrieve results',
};

const goodAction4 = {
  displayName: 'Create Database Entry',
  description: 'Create a new entry in the database with the provided data',
};

const goodAction5 = {
  displayName: 'Update User Profile',
  description: 'Update the user profile with new information. Validates all fields before saving.',  // Multiple sentences OK with period
};

const goodTrigger1 = {
  displayName: 'New Email',
  description: 'Trigger when a new email arrives in the inbox',
};

const goodProperty1 = {
  displayName: 'API Token',
  description: 'Authentication token for API access',
};

const goodProperty2 = {
  displayName: 'Order By',
  description: 'Sort the results by the specified field',
};

// Edge cases that should pass

const edgeCaseAcronyms = {
  displayName: 'Send HTTP Request via API',  // Acronyms OK
  description: 'Send an HTTP request using the REST API endpoint',
};

const edgeCaseParentheses = {
  displayName: 'Get Volume IOPS (GB)',  // Parentheses OK
  description: 'Get the IOPS value for the volume in gigabytes',
};

const edgeCaseSpecialChars = {
  displayName: 'Execute SQL Query',
  description: 'Execute an SQL query (not a SQL) in the database',  // "an SQL" is correct
};
