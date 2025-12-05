import { cacheWrapper } from '@openops/server-shared';
import {
  ApplicationError,
  assertValidEmail,
  assertValidPassword,
  ErrorCode,
  isNil,
  openOpsId,
  OrganizationId,
  OrganizationRole,
  SeekPage,
  SignUpRequest,
  spreadIfDefined,
  User,
  UserId,
  UserMeta,
  UserStatus,
} from '@openops/shared';
import dayjs from 'dayjs';
import { passwordHasher } from '../authentication/basic/password-hasher';
import { repoFactory } from '../core/db/repo-factory';
import { sendUserCreatedEvent } from '../telemetry/event-models';
import { UserEntity } from './user-entity';

export const userRepo = repoFactory(UserEntity);

export const userService = {
  async create(params: CreateParams): Promise<User> {
    const hashedPassword = await passwordHasher.hash(params.password);

    const user: NewUser = {
      id: openOpsId(),
      ...params,
      organizationRole: params.organizationRole,
      status: UserStatus.ACTIVE,
      password: hashedPassword,
    };

    sendUserCreatedEvent(user.id, user.organizationId);

    return userRepo().save(user);
  },
  async update({
    id,
    status,
    organizationId,
    organizationRole,
  }: UpdateParams): Promise<User> {
    const updateResult = await userRepo().update(
      {
        id,
        organizationId,
      },
      {
        ...spreadIfDefined('status', status),
        ...spreadIfDefined('organizationRole', organizationRole),
      },
    );
    if (updateResult.affected !== 1) {
      throw new ApplicationError({
        code: ErrorCode.ENTITY_NOT_FOUND,
        params: {
          entityType: 'user',
          entityId: id,
        },
      });
    }
    return userRepo().findOneByOrFail({
      id,
      organizationId,
    });
  },
  async list({ organizationId }: ListParams): Promise<SeekPage<User>> {
    const users = await userRepo().findBy({
      organizationId,
    });

    return {
      data: users,
      next: null,
      previous: null,
    };
  },

  async verify({ id }: IdParams): Promise<User> {
    const user = await userRepo().findOneByOrFail({ id });
    if (user.verified) {
      throw new ApplicationError({
        code: ErrorCode.AUTHORIZATION,
        params: {
          message: 'User is already verified',
        },
      });
    }
    return userRepo().save({
      ...user,
      verified: true,
    });
  },

  async get({ id }: IdParams): Promise<User | null> {
    return userRepo().findOneBy({ id });
  },
  async getOneOrThrow({ id }: IdParams): Promise<User> {
    const user = await this.get({ id });
    if (isNil(user)) {
      throw new ApplicationError({
        code: ErrorCode.ENTITY_NOT_FOUND,
        params: {
          entityId: id,
          entityType: 'user',
        },
      });
    }
    return user;
  },

  async getDefaultAdmin(): Promise<User | null> {
    const adminUsers = await userRepo().findBy({
      organizationRole: OrganizationRole.ADMIN,
    });
    if (adminUsers.length === 0) {
      return null;
    }
    if (adminUsers.length > 1) {
      throw new Error(
        'More than one admin user found. Please delete admin users manually.',
      );
    }
    return adminUsers[0];
  },

  async getMetaInfo({ id }: IdParams): Promise<UserMeta | null> {
    const user = await this.get({ id });

    if (isNil(user)) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      firstName: user.firstName,
      organizationRole: user.organizationRole,
      lastName: user.lastName,
      trackEvents: user.trackEvents,
    };
  },

  async delete({ id, organizationId }: DeleteParams): Promise<void> {
    const organizationWhereQuery = organizationId ? { organizationId } : {};

    await userRepo()
      .createQueryBuilder()
      .delete()
      .where({ id })
      .andWhere(organizationWhereQuery)
      .execute();
  },

  async getUserByEmailOrFail({ email }: { email: string }): Promise<User> {
    return userRepo().findOneByOrFail({ email });
  },

  async getUsersByEmail({ email }: { email: string }): Promise<User[]> {
    return userRepo()
      .createQueryBuilder()
      .andWhere('LOWER(email) = LOWER(:email)', { email })
      .getMany();
  },

  async getUserByEmail(email: string): Promise<User | null> {
    const cleanedEmail = email.toLowerCase().trim();
    return userRepo().findOneBy({ email: cleanedEmail });
  },

  async getByOrganizationAndEmail({
    organizationId,
    email,
  }: GetByOrganizationAndEmailParams): Promise<User | null> {
    const organizationWhereQuery = organizationId ? { organizationId } : {};

    return userRepo()
      .createQueryBuilder()
      .where(organizationWhereQuery)
      .andWhere('LOWER(email) = LOWER(:email)', { email })
      .getOne();
  },

  async getByOrganizationAndExternalId({
    organizationId,
    externalId,
  }: GetByOrganizationAndExternalIdParams): Promise<User | null> {
    return userRepo().findOneBy({
      organizationId,
      externalId,
    });
  },

  async updatePassword({
    id,
    newPassword,
  }: UpdatePasswordParams): Promise<User> {
    assertValidPassword(newPassword);

    const hashedPassword = await passwordHasher.hash(newPassword);

    await userRepo().update(id, {
      updated: dayjs().toISOString(),
      password: hashedPassword,
    });

    return userService.getOneOrThrow({ id });
  },

  async updateEmail({ id, newEmail }: UpdateEmailParams): Promise<void> {
    assertValidEmail(newEmail);

    await userRepo().update(id, {
      updated: dayjs().toISOString(),
      email: newEmail,
    });
  },

  async updateExternalId({
    id,
    newExternalId,
  }: UpdateExternalIdParams): Promise<void> {
    await userRepo().update(id, {
      updated: dayjs().toISOString(),
      externalId: newExternalId,
    });
  },

  async updateTracking({
    id,
    trackEvents,
  }: UpdateTrackingParams): Promise<void> {
    const updateResult = await userRepo().update(id, {
      trackEvents,
    });

    if (updateResult.affected !== 1) {
      throw new ApplicationError({
        code: ErrorCode.ENTITY_NOT_FOUND,
        params: {
          entityType: 'user',
          entityId: id,
        },
      });
    }

    await cacheWrapper.setKey(`track-events-${id}`, trackEvents.toString());
  },

  async getTrackEventsConfig(userId: string): Promise<string> {
    const trackEventsKey = `track-events-${userId}`;

    let trackEvents = await cacheWrapper.getKey(trackEventsKey);
    if (trackEvents) {
      return trackEvents;
    }

    const user = await userService.get({ id: userId });
    if (!user) {
      return 'false';
    }

    trackEvents = user.trackEvents?.toString() ?? 'false';
    await cacheWrapper.setKey(trackEventsKey, trackEvents);
    return trackEvents;
  },

  async addOwnerToOrganization({
    id,
    organizationId,
  }: UpdateOrganizationIdParams): Promise<void> {
    await userRepo().update(id, {
      updated: dayjs().toISOString(),
      organizationRole: OrganizationRole.ADMIN,
      organizationId,
    });
  },

  async addUserToOrganization({
    id,
    organizationId,
  }: UpdateOrganizationIdParams): Promise<void> {
    await userRepo().update(id, {
      updated: dayjs().toISOString(),
      organizationRole: OrganizationRole.MEMBER,
      organizationId,
    });
  },
};

type DeleteParams = {
  id: UserId;
  organizationId: OrganizationId | null;
};

type ListParams = {
  organizationId: OrganizationId;
};

type UpdateParams = {
  id: UserId;
  status?: UserStatus;
  organizationId: OrganizationId;
  organizationRole?: OrganizationRole;
};

type CreateParams = SignUpRequest & {
  verified: boolean;
  organizationId: string | null;
  externalId?: string;
  organizationRole: OrganizationRole;
};

type NewUser = Omit<User, 'created' | 'updated'>;

type GetByOrganizationAndEmailParams = {
  organizationId: string | null;
  email: string;
};

type GetByOrganizationAndExternalIdParams = {
  organizationId: string;
  externalId: string;
};

type IdParams = {
  id: UserId;
};

type UpdatePasswordParams = {
  id: UserId;
  newPassword: string;
};

type UpdateEmailParams = {
  id: UserId;
  newEmail: string;
};

type UpdateExternalIdParams = {
  id: UserId;
  newExternalId?: string;
};

type UpdateTrackingParams = {
  id: UserId;
  trackEvents: boolean;
};

type UpdateOrganizationIdParams = {
  id: UserId;
  organizationId: string;
};
