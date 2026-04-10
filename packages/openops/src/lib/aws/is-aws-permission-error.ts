const AWS_PERMISSION_ERROR_CODES = new Set([
  'AccessDenied',
  'AccessDeniedException',
  'AccessDeniedFault',
  'Unauthorized',
  'UnauthorizedOperation',
  'AuthFailure',
  'ForbiddenException',
  'NotAuthorized',
  'NotAuthorizedException',
]);

const AWS_PERMISSION_ERROR_PATTERN =
  /access\s*denied|accessdenied|not\s+authorized|unauthorized|authfailure|forbidden/i;

export function isAwsPermissionError(error: unknown): boolean {
  if (typeof error === 'string') {
    return AWS_PERMISSION_ERROR_PATTERN.test(error);
  }

  if (!error || typeof error !== 'object') {
    return false;
  }

  const awsError = error as {
    name?: string;
    code?: string;
    Code?: string;
    message?: string;
    Message?: string;
    $metadata?: { httpStatusCode?: number };
    statusCode?: number;
  };

  const errorCode = awsError.name ?? awsError.code ?? awsError.Code ?? '';
  const message = awsError.message ?? awsError.Message ?? '';
  const errorText = `${errorCode} ${message}`.trim();
  const httpStatusCode =
    awsError.$metadata?.httpStatusCode ?? awsError.statusCode;

  if (AWS_PERMISSION_ERROR_CODES.has(errorCode)) {
    return true;
  }

  return (
    AWS_PERMISSION_ERROR_PATTERN.test(errorText) &&
    (httpStatusCode === undefined ||
      httpStatusCode === 401 ||
      httpStatusCode === 403)
  );
}
