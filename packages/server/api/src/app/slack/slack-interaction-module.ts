/* eslint-disable @typescript-eslint/return-await */
import {
  FastifyPluginAsyncTypebox,
  FastifyPluginCallbackTypebox,
} from '@fastify/type-provider-typebox';
import { logger } from '@openops/server-shared';
import { PrincipalType } from '@openops/shared';
import { Static, Type } from '@sinclair/typebox';
import axios from 'axios';
import { FastifyReply, FastifyRequest } from 'fastify';
import { sendEphemeralMessage } from './ephemeral-message';
import { verifySignature } from './slack-token-verifier';

export const CreateSlackInteractionRequest = Type.Object({
  payload: Type.String(),
});

export type CreateSlackInteractionRequest = Static<
  typeof CreateSlackInteractionRequest
>;

export const slackInteractionModule: FastifyPluginAsyncTypebox = async (
  app,
) => {
  await app.register(slackInteractionController, { prefix: '/v1/slack' });
};

const slackInteractionController: FastifyPluginCallbackTypebox = (
  fastify,
  _opts,
  done,
) => {
  fastify.post(
    '/interactions',
    {
      config: { allowedPrincipals: [PrincipalType.UNKNOWN], rawBody: true },
      schema: { body: CreateSlackInteractionRequest },
    },
    async (
      request: FastifyRequest<{ Body: CreateSlackInteractionRequest }>,
      reply: FastifyReply,
    ) => {
      try {
        logger.debug('Received a Slack interaction');

        const signatureVerified = await verifySignature(request);
        if (!signatureVerified) {
          return reply.code(401).send({ text: 'Unauthorized' });
        }

        let payload;

        try {
          payload = JSON.parse(request.body.payload);
        } catch {
          logger.error(
            'Failed to handle a Slack interaction: payload is not a valid JSON',
            { payload: request.body.payload },
          );

          return reply
            .code(400)
            .send({ text: 'Invalid slack interaction payload' });
        }

        if (!payload?.actions) {
          logger.error(
            'Failed to handle a Slack interaction: payload does not contain actions',
            { payload },
          );

          return reply.code(400).send({ text: 'No slack interaction actions' });
        }

        return evaluateUserInteraction(payload, reply);
      } catch (error) {
        logger.error(
          `Failed to handle a Slack interaction: ${(error as Error).message}`,
          { error, payload: request.body.payload },
        );
        return reply
          .code(500)
          .send({ text: 'Error processing slack interaction' });
      }
    },
  );

  done();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-function-return-type
async function evaluateUserInteraction(payload: any, reply: FastifyReply) {
  const messageDisabled: string =
    payload.message.metadata.event_payload.messageDisabled;

  if (messageDisabled) {
    logger.debug('Ignoring a Slack interaction: message is disabled', {
      payload,
    });

    return reply.code(200).send({ text: 'Message interactions are disabled' });
  }

  const buttonClicked = isInteractionWithAButton(payload.actions);

  if (!buttonClicked) {
    logger.debug('Ignoring a Slack interaction: not a button', { payload });

    return reply.code(200).send({ text: 'Received interaction' });
  }

  if (payload.message.metadata.event_payload.isTest) {
    logger.debug('Ignoring a Slack interaction: test message', { payload });

    const userId = payload.user.id;
    const responseUrl = payload.response_url;
    const ephemeralText =
      'Slack interactions are only available when running the entire workflow.';
    await sendEphemeralMessage({ responseUrl, ephemeralText, userId });

    return reply.code(200).send({ text: 'Finished sending ephemeral' });
  }

  const resumeUrl: string = payload.message.metadata.event_payload.resumeUrl;

  if (resumeUrl) {
    const url = new URL(resumeUrl);
    url.searchParams.set('actionClicked', buttonClicked.text.text);
    url.searchParams.set('userName', payload.user.name);
    logger.debug(`Before calling webhook to resume the workflow: ${url}`, {
      url,
    });

    await axios.get(url.toString());

    logger.debug(`After calling webhook to resume the workflow: ${url}`, {
      url,
    });
  }

  return reply
    .code(200)
    .send({ text: 'Interaction with the message has ended.' });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-function-return-type
function isInteractionWithAButton(actions: any[]) {
  return actions.find((action: { type: string }) => action.type === 'button');
}
