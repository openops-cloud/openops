import { createBlock } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { httpReturnResponse } from './lib/actions/return-response';
import { httpSendRequestAction } from './lib/actions/send-http-request-action';
import { httpAuth } from './lib/common/auth';

export const http = createBlock({
  displayName: 'HTTP',
  description: 'Sends HTTP requests and return responses',
  logoUrl: '/blocks/http-block.svg',
  categories: [BlockCategory.CORE],
  auth: httpAuth,
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
