import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  BenchmarkWizardConfiguration,
  BenchmarkWizardStepResponse,
  PrincipalType,
} from '@openops/shared';
import { StatusCodes } from 'http-status-codes';
import { getWizardStep } from './wizard.service';

export const benchmarkController: FastifyPluginAsyncTypebox = async (app) => {
  app.post(
    '/:provider/wizard',
    WizardStepRequestOptions,
    async (request, reply) => {
      const step = await getWizardStep(
        request.params.provider,
        {
          currentStep: request.body.currentStep,
          answers: request.body.answers,
        },
        request.principal.projectId,
      );
      return reply.status(StatusCodes.OK).send(step);
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
      'Get the benchmark wizard step to display. Omit currentStep for the first step; send currentStep and accumulated answers to advance. Response includes options; nextStep is null when the wizard is complete.',
    params: Type.Object({
      provider: Type.String(),
    }),
    body: BenchmarkWizardConfiguration,
    response: {
      [StatusCodes.OK]: BenchmarkWizardStepResponse,
      [StatusCodes.CONFLICT]: Type.Object({
        code: Type.String(),
        params: Type.Object({ message: Type.Optional(Type.String()) }),
      }),
      [StatusCodes.INTERNAL_SERVER_ERROR]: Type.Object({
        statusCode: Type.Number(),
        error: Type.String(),
        message: Type.String(),
      }),
    },
  },
};
