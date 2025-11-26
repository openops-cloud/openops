import {
  authenticateUserInOpenOpsTables,
  resetUserPassword,
} from '@openops/common';
import { AppSystemProp, system } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateTablesUserPassword1763755045436
  implements MigrationInterface
{
  name = 'MigrateTablesUserPassword1763755045436';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const users = await queryRunner.query(
      'SELECT "email", "password" FROM "user"',
    );

    if (users.length === 0) {
      return;
    }

    const adminEmail = system.getOrThrow(AppSystemProp.OPENOPS_ADMIN_EMAIL);
    const password = system.getOrThrow(AppSystemProp.OPENOPS_ADMIN_PASSWORD);
    const { token } = await authenticateUserInOpenOpsTables(
      adminEmail,
      password,
    );

    for (const record of users) {
      if (record.email === adminEmail) {
        continue;
      }

      await resetUserPassword(record.email, record.password, token);
    }
  }

  public async down(_: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}
