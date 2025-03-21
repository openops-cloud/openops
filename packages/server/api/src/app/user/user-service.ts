import { cacheWrapper } from '@openops/server-shared';
import {
  ApplicationError,
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
import { passwordHasher } from '../authentication/lib/password-hasher';
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
  async getOneOrFail({ id }: IdParams): Promise<User> {
    return userRepo().findOneByOrFail({ id });
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
    await userRepo().delete({
      id,
      organizationId,
    });
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
  }: UpdatePasswordParams): Promise<void> {
    const hashedPassword = await passwordHasher.hash(newPassword);

    await userRepo().update(id, {
      updated: dayjs().toISOString(),
      password: hashedPassword,
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
  organizationId: OrganizationId;
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

type UpdateTrackingParams = {
  id: UserId;
  trackEvents: boolean;
};

type UpdateOrganizationIdParams = {
  id: UserId;
  organizationId: string;
};
