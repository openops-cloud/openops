import {
  DescribeDocumentCommand,
  DescribeDocumentRequest,
  DocumentParameter,
  SSMClient,
} from '@aws-sdk/client-ssm';
import { BlockPropValueSchema } from '@openops/blocks-framework';
import { amazonAuth, getCredentialsForAccount } from '../auth';
import { getAwsClient } from '../get-client';

export const getSsmDescribeDocumentInfo = async ({
  auth,
  region,
  runbookName,
  version,
}: {
  auth: BlockPropValueSchema<typeof amazonAuth>;
  region: string;
  runbookName: string;
  version?: string;
}): Promise<DocumentParameter[]> => {
  const credentials = await getCredentialsForAccount(auth);
  const client = getAwsClient(SSMClient, credentials, region);

  const filters: DescribeDocumentRequest = { Name: runbookName };

  if (version) {
    filters.DocumentVersion = version;
  }

  const doc = await client.send(new DescribeDocumentCommand(filters));

  return doc.Document?.Parameters ?? [];
};
