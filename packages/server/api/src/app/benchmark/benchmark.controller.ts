import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  BenchmarkWizardRequest,
  BenchmarkWizardStepResponse,
  PrincipalType,
} from '@openops/shared';
import { StatusCodes } from 'http-status-codes';

export const benchmarkController: FastifyPluginAsyncTypebox = async (app) => {
  app.post(
    '/:provider/wizard',
    WizardStepRequestOptions,
    async (_request, reply) => {
      return reply.status(StatusCodes.OK).send({
        currentStep: 'connection',
        title: 'Stub',
        nextStep: null,
        selectionType: 'single',
        options: [],
        stepIndex: 1,
        totalSteps: 1,
      });
    },
  );
};

const WizardStepRequestOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
  },
  schema: {
    tags: ['benchmarks'],
    description:
      'Get the benchmark wizard step to display. Omit currentStep for the first step; send currentStep and accumulated benchmarkConfiguration to advance. Response includes options; nextStep is null when the wizard is complete.',
    params: Type.Object({
      provider: Type.String(),
    }),
    body: BenchmarkWizardRequest,
    response: {
      [StatusCodes.OK]: BenchmarkWizardStepResponse,
      [StatusCodes.CONFLICT]: Type.Object({
        code: Type.String(),
        params: Type.Object({ message: Type.String() }),
      }),
      [StatusCodes.INTERNAL_SERVER_ERROR]: Type.Object({
        statusCode: Type.Number(),
        error: Type.String(),
        message: Type.String(),
      }),
    },
  },
};
