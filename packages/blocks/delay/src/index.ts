import { BlockAuth, createBlock } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { delayForAction } from './lib/actions/delay-for-action';
import { delayUntilAction } from './lib/actions/delay-until-action';

export const delay = createBlock({
  displayName: 'Delay',
  description: 'Use it to delay the execution of the next action',
  minimumSupportedRelease: '0.5.0',
  logoUrl: 'https://static.openops.com/blocks/delay.png',
  authors: [
    'Nilesh',
    'kishanprmr',
    'MoShizzle',
    'AbdulTheActiveBlockr',
    'khaledmashaly',
    'abuaboud',
  ],
  categories: [BlockCategory.WORKFLOW],
  auth: BlockAuth.None(),
  actions: [
    delayForAction, // Delay for a fixed duration
    delayUntilAction, // Takes a timestamp parameter instead of duration
  ],
  triggers: [],
});
