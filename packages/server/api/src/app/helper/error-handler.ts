import { logger } from '@openops/server-shared';
import { ApplicationError, ErrorCode } from '@openops/shared';
import type { ErrorObject } from 'ajv';
import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';

export const errorHandler = async (
  error: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  if (isApplicationError(error)) {
    logger.debug('Error handler caught an exception' + error);

    const statusCode =
      statusCodeMap[error.error.code] ?? StatusCodes.BAD_REQUEST;

    await reply.status(statusCode).send({
      code: error.error.code,
      params: error.error.params,
    });
  } else {
    const { method, url, body, params, query } = _request;
    const requestSummary = {
      method,
      url,
      body,
      params,
      query,
    };

    if (isValidationError(error)) {
      logger.debug('Request validation failed.', {
        message: error.message,
        validation: error.validation,
        request: requestSummary,
      });
    } else {
      logger.error('Error handler caught an exception.', {
        message: error.message,
        stack: error.stack,
        request: requestSummary,
      });
    }

    await reply
      .status(error.statusCode ?? StatusCodes.INTERNAL_SERVER_ERROR)
      .send(error);
  }
};

const isApplicationError = (error: unknown): error is ApplicationError => {
  try {
    return (
      typeof error === 'object' &&
      error !== null &&
      'error' in error &&
      typeof (error as ApplicationError).error === 'object' &&
      'code' in (error as ApplicationError).error
    );
  } catch (e) {
    return false;
  }
};

type FastifyValidationError = FastifyError & { validation?: ErrorObject[] };

const isValidationError = (error: unknown): error is FastifyValidationError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'validation' in error &&
    Array.isArray((error as FastifyValidationError).validation)
  );
};

const statusCodeMap: Partial<Record<ErrorCode, StatusCodes>> = {
  [ErrorCode.INVALID_BEARER_TOKEN]: StatusCodes.UNAUTHORIZED,
  [ErrorCode.FEATURE_DISABLED]: StatusCodes.PAYMENT_REQUIRED,
  [ErrorCode.PERMISSION_DENIED]: StatusCodes.FORBIDDEN,
  [ErrorCode.ENTITY_NOT_FOUND]: StatusCodes.NOT_FOUND,
  [ErrorCode.EXISTING_USER]: StatusCodes.CONFLICT,
  [ErrorCode.EXISTING_ALERT_CHANNEL]: StatusCodes.CONFLICT,
  [ErrorCode.FLOW_IN_USE]: StatusCodes.CONFLICT,
  [ErrorCode.FLOW_INTERNAL_FORBIDDEN]: StatusCodes.FORBIDDEN,
  [ErrorCode.FLOW_OPERATION_INVALID]: StatusCodes.BAD_REQUEST,
  [ErrorCode.AUTHORIZATION]: StatusCodes.FORBIDDEN,
  [ErrorCode.SIGN_UP_DISABLED]: StatusCodes.FORBIDDEN,
  [ErrorCode.INVALID_CREDENTIALS]: StatusCodes.UNAUTHORIZED,
  [ErrorCode.EMAIL_IS_NOT_VERIFIED]: StatusCodes.FORBIDDEN,
  [ErrorCode.USER_IS_INACTIVE]: StatusCodes.FORBIDDEN,
  [ErrorCode.DOMAIN_NOT_ALLOWED]: StatusCodes.FORBIDDEN,
  [ErrorCode.EMAIL_AUTH_DISABLED]: StatusCodes.FORBIDDEN,
  [ErrorCode.INVALID_OTP]: StatusCodes.GONE,
  [ErrorCode.VALIDATION]: StatusCodes.CONFLICT,
  [ErrorCode.INVITATION_ONLY_SIGN_UP]: StatusCodes.FORBIDDEN,
  [ErrorCode.AUTHENTICATION]: StatusCodes.UNAUTHORIZED,
  [ErrorCode.ACTIVATION_KEY_NOT_FOUND]: StatusCodes.NOT_FOUND,
  [ErrorCode.ACTIVATION_KEY_ALREADY_ACTIVATED]: StatusCodes.CONFLICT,
  [ErrorCode.EMAIL_ALREADY_HAS_ACTIVATION_KEY]: StatusCodes.CONFLICT,
  [ErrorCode.FOLDER_ALREADY_EXISTS]: StatusCodes.CONFLICT,
};
