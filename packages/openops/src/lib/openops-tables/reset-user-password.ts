import { createAxiosHeaders } from './create-axios-headers';
import { makeOpenOpsTablesPatch } from './requests-helpers';

export async function resetUserPassword(
  email: string,
  password: string,
  token: string,
): Promise<void> {
  const payload = {
    username: email,
    password,
  };

  const headers = createAxiosHeaders(token);

  await makeOpenOpsTablesPatch<void>('api/admin/users/', payload, headers);
}
