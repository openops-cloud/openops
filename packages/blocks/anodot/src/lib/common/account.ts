import { buildAccountApiKeyForAccount } from './anodot-requests-helpers';
import { UmbrellaSession } from './auth';
import { getUmbrellaAccountById, UmbrellaAccount } from './umbrella-accounts';

/**
 * Value shape of the account dropdown options persisted in workflow steps.
 */
export type SelectedAccount = UmbrellaAccount;

export async function getAccountApiKey(
  accountId: string,
  session: UmbrellaSession,
): Promise<string> {
  const account = await getUmbrellaAccountById(session, accountId);

  return buildAccountApiKeyForAccount(session.tokens.apikey, account);
}
