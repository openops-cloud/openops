import { UmbrellaSession } from './auth';
import { getUm2Accounts, Um2Account } from './um2-accounts';
import { AnodotUserAccount, getAnodotUsers } from './users';

/**
 * Version-independent view of an Umbrella account.
 *
 * `divisionId` exists only for User Management 1.0 accounts. Its absence is what
 * tells the key builder to emit the blank cost-center segment that 2.0 expects,
 * so 2.0 accounts must not carry the key at all (not even as null).
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

export async function listUmbrellaAccounts(
  session: UmbrellaSession,
): Promise<UmbrellaAccount[]> {
  if (session.version === '2.0') {
    const accounts = await getUm2Accounts(session.apiUrl, session.tokens);
    return (Array.isArray(accounts) ? accounts : []).map(mapUm2Account);
  }

  const user = await getAnodotUsers(session.apiUrl, session.tokens);
  return (user?.accounts ?? []).map(mapUm1Account);
}

/**
 * Provider-shaped account list, used where the raw Umbrella payload is the
 * documented output (Get User Accounts action).
 */
export async function listRawUmbrellaAccounts(
  session: UmbrellaSession,
): Promise<AnodotUserAccount[] | Um2Account[]> {
  if (session.version === '2.0') {
    return getUm2Accounts(session.apiUrl, session.tokens);
  }

  const user = await getAnodotUsers(session.apiUrl, session.tokens);
  return user.accounts;
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
