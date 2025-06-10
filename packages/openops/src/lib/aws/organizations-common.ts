import {
  Account,
  DescribeAccountCommand,
  OrganizationsClient,
} from '@aws-sdk/client-organizations';
import { getAwsClient } from './get-client';

export async function getAccountName(
  credentials: any,
  defaultRegion: string,
  accountId: string,
): Promise<string | undefined> {
  try {
    const account = await getAccountInformation(
      credentials,
      defaultRegion,
      accountId,
    );
    return account?.Name;
  } catch (error) {
    return undefined;
  }
}

export async function getAccountInformation(
  credentials: any,
  defaultRegion: string,
  accountId: string,
): Promise<Account | undefined> {
  const client = getAwsClient(OrganizationsClient, credentials, defaultRegion);
  const command = new DescribeAccountCommand({ AccountId: accountId });

  const response = await client.send(command);
  return response.Account;
}
