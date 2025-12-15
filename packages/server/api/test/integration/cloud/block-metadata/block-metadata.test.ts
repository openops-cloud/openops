import { BlockType, openOpsId, PrincipalType } from '@openops/shared';
import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { databaseConnection } from '../../../../src/app/database/database-connection';
import { setupServer } from '../../../../src/app/server';
import { generateMockToken } from '../../../helpers/auth';
import {
  createMockBlockMetadata,
  createMockOrganization,
  createMockUser,
} from '../../../helpers/mocks';

let app: FastifyInstance | null = null;

beforeAll(async () => {
  await databaseConnection().initialize();
  app = await setupServer();
});

beforeEach(async () => {
  await databaseConnection().getRepository('block_metadata').delete({});
});

afterAll(async () => {
  await databaseConnection().destroy();
  await app?.close();
});

describe('Block Metadata API', () => {
  describe('List Block Versions endpoint', () => {
    it('Should return versions in sorted order for a block', async () => {
      // arrange
      const mockBlockMetadata1 = createMockBlockMetadata({
        name: '@ap/a',
        version: '0.0.1',
        blockType: BlockType.OFFICIAL,
      });
      await databaseConnection()
        .getRepository('block_metadata')
        .save(mockBlockMetadata1);

      const mockBlockMetadata2 = createMockBlockMetadata({
        name: '@ap/a',
        version: '0.0.2',
        blockType: BlockType.OFFICIAL,
      });
      await databaseConnection()
        .getRepository('block_metadata')
        .save(mockBlockMetadata2);

      const testToken = await generateMockToken({
        type: PrincipalType.UNKNOWN,
        id: openOpsId(),
        projectId: openOpsId(),
      });

      // act
      const response = await app?.inject({
        method: 'GET',
        url: '/v1/blocks/versions?release=1.1.1&name=@ap/a',
        headers: {
          authorization: `Bearer ${testToken}`,
        },
      });

      // assert
      const responseBody = response?.json();

      expect(response?.statusCode).toBe(StatusCodes.OK);
      const keys = Object.keys(responseBody);
      expect(keys).toHaveLength(2);
      expect(keys[0]).toBe('0.0.1');
      expect(keys[1]).toBe('0.0.2');
    });
  });

  describe('Get Block metadata', () => {
    it('Should return metadata when authenticated', async () => {
      // arrange
      const mockBlockMetadata = createMockBlockMetadata({
        name: '@openops/a',
        blockType: BlockType.OFFICIAL,
      });
      await databaseConnection()
        .getRepository('block_metadata')
        .save(mockBlockMetadata);

      const mockUser = createMockUser();
      await databaseConnection().getRepository('user').save([mockUser]);

      const mockOrganization = createMockOrganization({
        ownerId: mockUser.id,
      });
      await databaseConnection()
        .getRepository('organization')
        .save([mockOrganization]);

      const response = await app?.inject({
        method: 'GET',
        url: '/v1/blocks/@openops/a',
        headers: {},
      });

      // assert
      const responseBody = response?.json();

      expect(response?.statusCode).toBe(StatusCodes.OK);
      expect(responseBody.id).toBe(mockBlockMetadata.id);
    });

    it('Should return metadata when not authenticated', async () => {
      // arrange
      const mockBlockMetadata = createMockBlockMetadata({
        name: '@openops/a',
        blockType: BlockType.OFFICIAL,
        displayName: 'a',
      });
      await databaseConnection()
        .getRepository('block_metadata')
        .save(mockBlockMetadata);

      const testToken = await generateMockToken({
        projectId: openOpsId(),
        type: PrincipalType.UNKNOWN,
        id: openOpsId(),
      });

      const response = await app?.inject({
        method: 'GET',
        url: '/v1/blocks/@openops/a',
        headers: {
          authorization: `Bearer ${testToken}`,
        },
      });

      // assert
      const responseBody = response?.json();

      expect(response?.statusCode).toBe(StatusCodes.OK);
      // Expectations for each attribute
      expect(responseBody.actions).toEqual(mockBlockMetadata.actions);
      expect(responseBody.triggers).toEqual(mockBlockMetadata.triggers);
      expect(responseBody.archiveId).toBe(mockBlockMetadata.archiveId);
      expect(responseBody.auth).toEqual(mockBlockMetadata.auth);
      expect(responseBody.description).toBe(mockBlockMetadata.description);
      expect(responseBody.directoryPath).toBe(mockBlockMetadata.directoryPath);
      expect(responseBody.displayName).toBe(mockBlockMetadata.displayName);
      expect(responseBody.id).toBe(mockBlockMetadata.id);
      expect(responseBody.logoUrl).toBe(mockBlockMetadata.logoUrl);
      expect(responseBody.maximumSupportedRelease).toBe(
        mockBlockMetadata.maximumSupportedRelease,
      );
      expect(responseBody.minimumSupportedRelease).toBe(
        mockBlockMetadata.minimumSupportedRelease,
      );
      expect(responseBody.packageType).toBe(mockBlockMetadata.packageType);
      expect(responseBody.blockType).toBe(mockBlockMetadata.blockType);
      expect(responseBody.organizationId).toBe(
        mockBlockMetadata.organizationId,
      );
      expect(responseBody.projectId).toBe(mockBlockMetadata.projectId);
      expect(responseBody.version).toBe(mockBlockMetadata.version);
    });
  });
});
