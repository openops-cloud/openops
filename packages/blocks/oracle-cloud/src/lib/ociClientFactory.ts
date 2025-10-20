import * as common from 'oci-common';
import * as identity from 'oci-identity';

export async function getIdentityClient(
  configFilePath: string,
): Promise<identity.IdentityClient> {
  const provider = new common.ConfigFileAuthenticationDetailsProvider(
    configFilePath,
  );
  return new identity.IdentityClient({
    authenticationDetailsProvider: provider,
  });
}
