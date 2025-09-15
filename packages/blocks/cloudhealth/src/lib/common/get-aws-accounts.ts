import { makeGetRequest } from './call-rest-api';

export async function getAwsAccounts(apiKey: string): Promise<unknown[]> {
  let page = 1;
  let allAccounts: unknown[] = [];
  let paginate = true;

  const perPage = 100;

  while (paginate) {
    const response = await makeGetRequest(apiKey, `/api/aws_account`, {
      page: page.toString(),
      per_page: perPage.toString(),
    });

    const accounts = response.body.aws_accounts || [];
    allAccounts = allAccounts.concat(accounts);

    const total = Number(response.headers?.['x-total'] ?? 0);

    if (allAccounts.length < total) {
      page++;
    } else {
      paginate = false;
    }
  }

  return allAccounts;
}
