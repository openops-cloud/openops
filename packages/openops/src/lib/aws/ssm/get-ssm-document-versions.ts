import {
  DocumentVersionInfo,
  ListDocumentVersionsCommand,
  ListDocumentVersionsResult,
  SSMClient,
} from '@aws-sdk/client-ssm';
import { BlockPropValueSchema } from '@openops/blocks-framework';
import { amazonAuth, getCredentialsForAccount } from '../auth';
import { makeAwsRequest } from '../aws-client-wrapper';
import { getAwsClient } from '../get-client';

export const getSsmDocumentVersions = async ({
  auth,
  region,
  runbookName,
}: {
  auth: BlockPropValueSchema<typeof amazonAuth>;
  region: string;
  runbookName: string;
}): Promise<DocumentVersionInfo[]> => {
  const credentials = await getCredentialsForAccount(auth);
  const client = getAwsClient(SSMClient, credentials, region);

  const command = new ListDocumentVersionsCommand({
    Name: runbookName,
  });

  const pages = (await makeAwsRequest(
    client,
    command,
  )) as ListDocumentVersionsResult[];

  return pages.flatMap((p) => p.DocumentVersions || []);
};
