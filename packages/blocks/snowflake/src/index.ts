import { BlockAuth, createBlock } from '@openops/blocks-framework';
export const snowflake = createBlock({
  displayName: 'Snowflake',
  auth: BlockAuth.None(),
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/snowflake.png',
  authors: [],
  actions: [],
  triggers: [],
});
