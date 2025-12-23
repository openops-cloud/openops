import { BlockAuth, createBlock } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { addition } from './lib/actions/addition';
import { avg } from './lib/actions/avg';
import { division } from './lib/actions/division';
import { generateRandom } from './lib/actions/generateRandom';
import { max } from './lib/actions/max';
import { min } from './lib/actions/min';
import { modulo } from './lib/actions/modulo';
import { multiplication } from './lib/actions/multiplication';
import { subtraction } from './lib/actions/subtraction';
import { sum } from './lib/actions/sum';
import { truncate } from './lib/actions/truncate';

const markdownDescription = `
Perform mathematical operations.
`;

export const math = createBlock({
  displayName: 'Math Operations',
  description: markdownDescription,
  auth: BlockAuth.None(),
  minimumSupportedRelease: '0.9.0',
  logoUrl: '/blocks/math-operations.svg',
  categories: [BlockCategory.CORE],
  authors: ['kishanprmr', 'MoShizzle', 'abuaboud'],
  actions: [
    addition,
    subtraction,
    multiplication,
    division,
    modulo,
    truncate,
    generateRandom,
    min,
    max,
    avg,
    sum,
  ],
  triggers: [],
});
