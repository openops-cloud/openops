import { BlockAuth, createBlock } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { httpReturnResponse } from './lib/actions/return-response';
import { httpSendRequestAction } from './lib/actions/send-http-request-action';

export const http = createBlock({
  displayName: 'HTTP',
  description: 'Sends HTTP requests and return responses',
  logoUrl: 'https://static.openops.com/blocks/http.png',
  categories: [BlockCategory.CORE, BlockCategory.NETWORK],
  auth: BlockAuth.None(),
  minimumSupportedRelease: '0.20.3',
  actions: [httpSendRequestAction, httpReturnResponse],
  authors: [
    'bibhuty-did-this',
    'landonmoir',
    'JanHolger',
    'Salem-Alaa',
    'kishanprmr',
    'AbdulTheActiveBlockr',
    'khaledmashaly',
    'abuaboud',
    'pfernandez98',
  ],
  triggers: [],
});
