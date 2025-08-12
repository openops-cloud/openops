import { Static, Type } from '@sinclair/typebox';
import { StatusCodes } from 'http-status-codes';

export const RunFlowSuccessResponse = Type.Object({
  success: Type.Boolean(),
  flowRunId: Type.String(),
  status: Type.String(),
  message: Type.String(),
});

export type RunFlowSuccessResponse = Static<typeof RunFlowSuccessResponse>;

export const RunFlowErrorResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
});

export type RunFlowErrorResponse = Static<typeof RunFlowErrorResponse>;

export const RunFlowResponses = {
  [StatusCodes.OK]: RunFlowSuccessResponse,
  [StatusCodes.BAD_REQUEST]: RunFlowErrorResponse,
} as const;

export type RunFlowResponses = typeof RunFlowResponses;
