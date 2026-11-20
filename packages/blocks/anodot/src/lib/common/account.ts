import { buildAccountApiKey } from './anodot-requests-helpers';
import { UmbrellaSession } from './auth';
import { getUmbrellaAccountById, UmbrellaAccount } from './umbrella-accounts';

/**
 * Value shape of the account dropdown options persisted in workflow steps.
 */
export type SelectedAccount = UmbrellaAccount;

/**
 * Builds the per-account key for an account id typed by the user.
 *
 * On 2.0 the key is derived from the account id alone, so no lookup is needed.
 * On 1.0 the account must be resolved first to obtain its numeric key and
 * division id.
 */
export async function getAccountApiKey(
  accountId: string,
  session: UmbrellaSession,
): Promise<string> {
  if (session.version === '2.0') {
    return buildAccountApiKey(session, { accountId, accountKey: accountId });
  }

  const account = await getUmbrellaAccountById(session, accountId);

  return buildAccountApiKey(session, account);
}
