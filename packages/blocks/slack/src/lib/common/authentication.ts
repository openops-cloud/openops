import { BlockAuth } from '@openops/blocks-framework';

export const slackAuth = BlockAuth.OAuth2({
  authProviderKey: 'Slack',
  authProviderDisplayName: 'Slack',
  authProviderLogoUrl: `https://static.openops.com/blocks/slack.png`,
  description: 'OAuth2 authentication for Slack workspace integration',
  authUrl: 'https://slack.com/oauth/v2/authorize',
  tokenUrl: 'https://slack.com/api/oauth.v2.access',
  required: true,
  scope: [
    // List public channels, doesn't grant access to messages
    'channels:read',
    // Write direct messages and messages in public channels
    'chat:write',
    'chat:write.customize',
    'chat:write.public',
    // List private channels that the App was explicitly added to
    'groups:read',
    // List private chats that the App was explicitly added to
    'mpim:read',
    'im:read',
    // List users and their emails for resource owners correlation
    'users:read',
    'users:read.email',
  ],
});
