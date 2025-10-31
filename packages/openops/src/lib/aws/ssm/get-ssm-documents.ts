import {
  DocumentIdentifier,
  DocumentKeyValuesFilter,
  ListDocumentsCommand,
  ListDocumentsCommandOutput,
  SSMClient,
} from '@aws-sdk/client-ssm';
import { BlockPropValueSchema } from '@openops/blocks-framework';
import { amazonAuth, getCredentialsForAccount } from '../auth';
import { makeAwsRequest } from '../aws-client-wrapper';
import { getAwsClient } from '../get-client';

export const getSsmDocuments = async ({
  auth,
  region,
  owner,
  type = 'Automation',
}: {
  auth: BlockPropValueSchema<typeof amazonAuth>;
  region: string;
  owner?: string;
  type?: string;
}): Promise<DocumentIdentifier[]> => {
  const credentials = await getCredentialsForAccount(auth);
  const client = getAwsClient(SSMClient, credentials, region);

  const filters: DocumentKeyValuesFilter[] = [
    { Key: 'DocumentType', Values: [type] },
  ];

  if (owner && owner !== 'All') {
    filters.push({ Key: 'Owner', Values: [owner as string] });
  }

  const command = new ListDocumentsCommand({
    Filters: filters,
  });

  const pages = (await makeAwsRequest(
    client,
    command,
  )) as ListDocumentsCommandOutput[];

  return pages.flatMap((p) => p.DocumentIdentifiers || []);
};
