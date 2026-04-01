/**
 * AWS Error Sanitization
 *
 * Redacts IAM principal names (users, roles, policies) from AWS error messages
 * to prevent disclosure of internal infrastructure naming conventions.
 *
 * Covers:
 * - IAM users: arn:aws:iam::123:user/UserName
 * - IAM roles: arn:aws:iam::123:role/RoleName
 * - Service roles: arn:aws:iam::123:role/service-role/LambdaRole
 * - Assumed roles: arn:aws:sts::123:assumed-role/RoleName/session
 * - Policies: arn:aws:iam::123:policy/PolicyName
 */

const REDACTED_ARN_PATH = '****';
const REDACTED_ACCOUNT_ID = '*****';

/**
 * Redacts IAM/STS principal ARNs that appear after "User:" or "Role:" prefixes
 * Example: "User: arn:aws:iam::123:user/OpenOpsApp" -> "User: arn:aws:iam::*****:user/****"
 */
function sanitizeUserRolePrefixedArns(message: string): string {
  return message.replace(
    /(User|Role): arn:aws:(iam|sts)::\d{12}:(user|role|assumed-role|policy)\/[^\s,]+/g,
    `$1: arn:aws:$2::${REDACTED_ACCOUNT_ID}:$3/${REDACTED_ARN_PATH}`,
  );
}

/**
 * Redacts IAM/STS ARNs that appear after "on resource:" prefix
 * Example: "on resource: arn:aws:iam::111:role/ProductionRole" -> "on resource: arn:aws:iam::*****:role/****"
 */
function sanitizeResourcePrefixedArns(message: string): string {
  return message.replace(
    /on resource: arn:aws:(iam|sts)::\d{12}:(user|role|assumed-role|policy)\/[^\s,]+/g,
    `on resource: arn:aws:$1::${REDACTED_ACCOUNT_ID}:$2/${REDACTED_ARN_PATH}`,
  );
}

/**
 * Catch-all pattern to redact any remaining IAM/STS ARNs with paths
 * Handles service-role paths and other edge cases
 */
function sanitizeRemainingArns(message: string): string {
  return message.replace(
    /arn:aws:(iam|sts)::\d{12}:(user|role|assumed-role|policy)\/[^\s,)]+/g,
    `arn:aws:$1::${REDACTED_ACCOUNT_ID}:$2/${REDACTED_ARN_PATH}`,
  );
}

/**
 * Sanitizes AWS error messages by redacting IAM principal names and account IDs
 * Uses three-layer protection to ensure all ARN patterns are covered
 */
export function sanitizeAwsError(errorMessage: string): string {
  let sanitized = errorMessage;

  sanitized = sanitizeUserRolePrefixedArns(sanitized);
  sanitized = sanitizeResourcePrefixedArns(sanitized);
  sanitized = sanitizeRemainingArns(sanitized);

  return sanitized;
}
