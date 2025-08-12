import { makeGetRequest } from './call-rest-api';

export async function getAwsAccounts(apiKey: string): Promise<unknown[]> {
  return (
    ((await makeGetRequest(apiKey, '/v1/aws_accounts')) as any).aws_accounts ||
    []
  );
}
