import {
  DocumentIdentifier,
  DocumentKeyValuesFilter,
  ListDocumentsCommand,
  ListDocumentsCommandOutput,
  SSMClient,
} from '@aws-sdk/client-ssm';
import { getCredentialsForAccount } from '../auth';
import { makeAwsRequest } from '../aws-client-wrapper';
import { getAwsClient } from '../get-client';
import { DocumentOwner } from './document-owner';
import { AwsAuthRegionParams } from './types';

export const getSsmDocuments = async ({
  auth,
  region,
  owner,
  type = 'Automation',
}: AwsAuthRegionParams & {
  owner?: DocumentOwner;
  type?: string;
}): Promise<DocumentIdentifier[]> => {
  const credentials = await getCredentialsForAccount(auth);
  const client = getAwsClient(SSMClient, credentials, region);

  const filters: DocumentKeyValuesFilter[] = [
    { Key: 'DocumentType', Values: [type] },
  ];

  if (owner && owner !== DocumentOwner.All) {
    filters.push({ Key: 'Owner', Values: [owner] });
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
