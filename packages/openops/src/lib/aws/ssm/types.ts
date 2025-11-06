import { BlockPropValueSchema } from '@openops/blocks-framework';
import { amazonAuth } from '../auth';

export type SsmRunbookParams = AwsAuthRegionParams & {
  runbookName: string;
};

export type AwsAuthRegionParams = {
  auth: BlockPropValueSchema<typeof amazonAuth>;
  region: string;
};
