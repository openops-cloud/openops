import { createCustomApiCallAction } from '@openops/blocks-common';
import { OAuth2PropertyValue, createBlock } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import crypto from 'node:crypto';
import { requestActionMessageAction } from './lib/actions/request-action-message';
import { slackSendMessageAction } from './lib/actions/send-message-action';
import { updateMessageAction } from './lib/actions/update-message-action';
import { waitForAction } from './lib/actions/wait-for-action';
import { slackAuth } from './lib/common/authentication';

export const slack = createBlock({
  displayName: 'Slack',
  description: 'Channel-based messaging platform',
  minimumSupportedRelease: '0.5.0',
  logoUrl: 'https://static.openops.com/blocks/slack.png',
  categories: [BlockCategory.COLLABORATION],
  auth: slackAuth,
  events: {
    parseAndReply: ({ payload }) => {
      const payloadBody = payload.body as PayloadBody;
      if (payloadBody.challenge) {
        return {
          reply: {
            body: payloadBody['challenge'],
            headers: {},
          },
        };
      }
      return {
        event: payloadBody?.event?.type,
        identifierValue: payloadBody.team_id,
      };
    },
    verify: ({ webhookSecret, payload }) => {
      // Construct the signature base string
      const timestamp = payload.headers['x-slack-request-timestamp'];
      const signature = payload.headers['x-slack-signature'];
      const signatureBaseString = `v0:${timestamp}:${payload.rawBody}`;
      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(signatureBaseString);
      const computedSignature = `v0=${hmac.digest('hex')}`;
      return signature === computedSignature;
    },
  },
  authors: [
    'rita-gorokhod',
    'AdamSelene',
    'Abdallah-Alwarawreh',
    'kishanprmr',
    'MoShizzle',
    'AbdulTheActiveBlockr',
    'khaledmashaly',
    'abuaboud',
  ],
  actions: [
    slackSendMessageAction,
    updateMessageAction,
    requestActionMessageAction,
    createCustomApiCallAction({
      baseUrl: () => {
        return 'https://slack.com/api';
      },
      auth: slackAuth,
      authMapping: async (auth) => {
        return {
          Authorization: `Bearer ${(auth as OAuth2PropertyValue).access_token}`,
        };
      },
    }),
    waitForAction,
  ],
  triggers: [],
});

type PayloadBody = {
  challenge: string;
  event: {
    type: string;
  };
  team_id: string;
};
