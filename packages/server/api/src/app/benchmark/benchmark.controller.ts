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

const SUPPORTED_PROVIDERS = ['aws'];

export const benchmarkController: FastifyPluginAsyncTypebox = async (app) => {
  app.post(
    '/:provider/wizard',
    WizardStepRequestOptions,
    async (request, reply) => {
      const { provider } = request.params;
      if (!SUPPORTED_PROVIDERS.includes(provider)) {
        return reply.status(StatusCodes.BAD_REQUEST).send({
          error: 'Bad Request',
          message: `Unsupported wizard provider: ${provider}`,
        });
      }
      try {
        const step = await getWizardStep(
          provider,
          {
            currentStep: request.body.currentStep,
            answers: request.body.answers,
          },
          request.principal.projectId,
        );
        return await reply.status(StatusCodes.OK).send(step);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Wizard step failed';
        return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
          error: 'Internal Server Error',
          message,
        });
      }
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
      'Get the next step of the benchmark wizard. Send currentStep and accumulated answers; returns that step or the next step with options. nextStep: null when wizard is complete.',
    params: Type.Object({
      provider: Type.String(),
    }),
    body: BenchmarkWizardConfiguration,
    response: {
      [StatusCodes.OK]: BenchmarkWizardStepResponse,
      [StatusCodes.BAD_REQUEST]: Type.Object({
        error: Type.String(),
        message: Type.String(),
      }),
      [StatusCodes.INTERNAL_SERVER_ERROR]: Type.Object({
        error: Type.String(),
        message: Type.String(),
      }),
    },
  },
};
