import { authenticateUserInOpenOpsTables } from '@openops/common';
import { AppSystemProp, system } from '@openops/server-shared';
import bcrypt from 'bcrypt';

export async function authAdminUserOnTables(): Promise<string> {
  const adminEmail = system.getOrThrow(AppSystemProp.OPENOPS_ADMIN_EMAIL);
  const password = system.getOrThrow(AppSystemProp.OPENOPS_ADMIN_PASSWORD);
  const staticSalt = system.getOrThrow<string>(
    AppSystemProp.OPENOPS_ADMIN_PASSWORD_SALT,
  );
  const hashedPassword = await bcrypt.hash(password, staticSalt);

  const { token } = await authenticateUserInOpenOpsTables(
    adminEmail,
    hashedPassword,
  );

  return token;
}
