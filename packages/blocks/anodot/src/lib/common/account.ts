import { buildUserAccountApiKey } from './anodot-requests-helpers';
import { AnodotTokens } from './auth';
import { getAnodotUsers } from './users';

export type SelectedAccount = {
  accountKey: number;
  divisionId: number;
  accountName: string;
};

export async function getAccountApiKey(
  accountId: string,
  apiUrl: string,
  anodotTokens: AnodotTokens,
): Promise<string> {
  const account = await getAccountById(accountId, apiUrl, anodotTokens);
  const accountApiKey = buildUserAccountApiKey(
    anodotTokens.apikey,
    account.accountKey.toString(),
    account.divisionId.toString(),
  );

  return accountApiKey;
}

async function getAccountById(
  accountId: string,
  apiUrl: string,
  anodotTokens: AnodotTokens,
): Promise<{ accountKey: number; divisionId: number }> {
  const user = await getAnodotUsers(apiUrl, anodotTokens);

  const account = user?.accounts?.find((user) => user.accountId === accountId);

  if (!account) {
    throw new Error(`No account matching account id: ${accountId} was found.`);
  }

  return {
    accountKey: account.accountKey,
    divisionId: account.divisionId,
  };
}
