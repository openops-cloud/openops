import { Static, Type } from '@sinclair/typebox';

export const RunFlowRequestBody = Type.Optional(
  Type.Object({
    headers: Type.Optional(Type.Record(Type.String(), Type.String())),
    queryParams: Type.Optional(Type.Record(Type.String(), Type.String())),
    body: Type.Optional(Type.Unknown()),
  }),
);

export type RunFlowRequestBody = Static<typeof RunFlowRequestBody>;

export const RunFlowResponse = Type.Object({
  success: Type.Boolean(),
  flowRunId: Type.String(),
  status: Type.String(),
  message: Type.String(),
});

export type RunFlowResponse = Static<typeof RunFlowResponse>;

export const RunFlowErrorResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
});

export type RunFlowErrorResponse = Static<typeof RunFlowErrorResponse>;
