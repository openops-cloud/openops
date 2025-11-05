import {
  DescribeDocumentCommand,
  DescribeDocumentRequest,
  DocumentParameter,
  SSMClient,
} from '@aws-sdk/client-ssm';
import { getCredentialsForAccount } from '../auth';
import { getAwsClient } from '../get-client';
import { SsmRunbookParams } from './types';

export const getSsmDescribeDocumentInfo = async ({
  auth,
  region,
  runbookName,
  version,
}: SsmRunbookParams & {
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
