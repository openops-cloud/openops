const REDACTED_ARN_PATH = '****';
const REDACTED_ACCOUNT_ID = '*****';

function sanitizeUserRolePrefixedArns(message: string): string {
  return message.replace(
    /(User|Role): arn:aws:(iam|sts)::\d{12}:(user|role|assumed-role|policy)\/[^\s,]+/g,
    `$1: arn:aws:$2::${REDACTED_ACCOUNT_ID}:$3/${REDACTED_ARN_PATH}`,
  );
}

function sanitizeResourcePrefixedArns(message: string): string {
  return message.replace(
    /on resource: arn:aws:(iam|sts)::\d{12}:(user|role|assumed-role|policy)\/[^\s,]+/g,
    `on resource: arn:aws:$1::${REDACTED_ACCOUNT_ID}:$2/${REDACTED_ARN_PATH}`,
  );
}

function sanitizeRemainingArns(message: string): string {
  return message.replace(
    /arn:aws:(iam|sts)::\d{12}:(user|role|assumed-role|policy)\/[^\s,)]+/g,
    `arn:aws:$1::${REDACTED_ACCOUNT_ID}:$2/${REDACTED_ARN_PATH}`,
  );
}

export function sanitizeAwsError(errorMessage: string): string {
  let sanitized = errorMessage;

  sanitized = sanitizeUserRolePrefixedArns(sanitized);
  sanitized = sanitizeResourcePrefixedArns(sanitized);
  sanitized = sanitizeRemainingArns(sanitized);

  return sanitized;
}
