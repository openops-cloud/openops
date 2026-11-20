import { UmbrellaSession } from './auth';
import { getUm2Accounts, Um2Account } from './um2-accounts';
import { AnodotUserAccount, getAnodotUsers } from './users';

/**
 * Version-independent view of an Umbrella account.
 *
 * `divisionId` exists only for User Management 1.0 accounts; 2.0 accounts do
 * not carry the key at all (not even as null).
 *
 * The 1.0 shape must stay identical to what the account dropdown has always
 * produced, because selections persisted in workflow steps are matched to the
 * dropdown options by deep equality.
 */
export interface UmbrellaAccount {
  accountId: string;
  accountKey: string | number;
  accountName: string;
  divisionId?: number;
}

/**
 * Provider-shaped account list for the session's version. This is the single
 * place that fetches accounts; the normalised view below maps its result.
 *
 * 1.0 returns a user object whose `accounts` may be missing, which has always
 * meant "no accounts". 2.0 must return an array; anything else is an
 * unexpected response and is surfaced as an error so that connection
 * validation fails instead of silently reporting an empty tenant.
 */
export async function listRawUmbrellaAccounts(
  session: UmbrellaSession,
): Promise<AnodotUserAccount[] | Um2Account[]> {
  if (session.version === '2.0') {
    const accounts = await getUm2Accounts(session.apiUrl, session.tokens);

    if (!Array.isArray(accounts)) {
      throw new Error(
        'Unexpected response from the Umbrella accounts endpoint: expected a list of accounts.',
      );
    }

    return accounts;
  }

  const user = await getAnodotUsers(session.apiUrl, session.tokens);

  return user?.accounts ?? [];
}

export async function listUmbrellaAccounts(
  session: UmbrellaSession,
): Promise<UmbrellaAccount[]> {
  const accounts = await listRawUmbrellaAccounts(session);

  return session.version === '2.0'
    ? (accounts as Um2Account[]).map(mapUm2Account)
    : (accounts as AnodotUserAccount[]).map(mapUm1Account);
}

export async function getUmbrellaAccountById(
  session: UmbrellaSession,
  accountId: string,
): Promise<UmbrellaAccount> {
  const accounts = await listUmbrellaAccounts(session);

  const account = accounts.find((item) => item.accountId === accountId);

  if (!account) {
    throw new Error(`No account matching account id: ${accountId} was found.`);
  }

  return account;
}

function mapUm1Account(account: AnodotUserAccount): UmbrellaAccount {
  return {
    accountId: account.accountId,
    accountKey: account.accountKey,
    divisionId: account.divisionId,
    accountName: account.accountName,
  };
}

function mapUm2Account(account: Um2Account): UmbrellaAccount {
  return {
    accountId: account.accountId,
    accountKey: account.accountKey,
    accountName: account.accountName,
  };
}
