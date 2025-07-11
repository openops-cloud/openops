import { EngineOperationType, EngineResponseStatus, PackageType, BlockType } from '@openops/shared';
import { execute } from '../src/lib/operations';
import { blockHelper } from '../src/lib/helper/block-helper';

jest.mock('../src/lib/helper/block-helper');

const mockBlockHelper = blockHelper as jest.Mocked<typeof blockHelper>;

describe('Engine Operations - Simple Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('EXTRACT_BLOCK_METADATA operation', () => {
    it('should extract block metadata successfully', async () => {
      const mockMetadata = { 
        version: '1.0.0', 
        actions: {},
        triggers: {},
        name: 'test-block',
        displayName: 'Test Block',
        logoUrl: 'https://example.com/logo.png',
        description: 'Test block description',
        authors: ['Test Author']
      };
      mockBlockHelper.extractBlockMetadata.mockResolvedValue(mockMetadata);

      const operation = {
        projectId: 'project-1',
        publicUrl: 'http://public.test',
        blockName: 'test-block',
        blockType: BlockType.CUSTOM,
        blockVersion: '1.0.0',
        packageType: PackageType.REGISTRY as PackageType.REGISTRY,
      };

      const result = await execute(EngineOperationType.EXTRACT_BLOCK_METADATA, operation);

      expect(result.status).toBe(EngineResponseStatus.OK);
      expect(result.response).toBe(mockMetadata);
      expect(mockBlockHelper.extractBlockMetadata).toHaveBeenCalledWith({
        params: operation,
        blocksSource: "FILE",
      });
    });

    it('should handle extraction errors gracefully', async () => {
      const errorMessage = 'Block not found';
      mockBlockHelper.extractBlockMetadata.mockRejectedValue(new Error(errorMessage));

      const operation = {
        projectId: 'project-1',
        publicUrl: 'http://public.test',
        blockName: 'non-existent-block',
        blockType: BlockType.CUSTOM,
        blockVersion: '1.0.0',
        packageType: PackageType.REGISTRY as PackageType.REGISTRY,
      };

      const result = await execute(EngineOperationType.EXTRACT_BLOCK_METADATA, operation);

      expect(result.status).toBe(EngineResponseStatus.ERROR);
      expect(result.response).toBe(errorMessage);
    });
  });

  describe('Unsupported operation type', () => {
    it('should handle unsupported operation type', async () => {
      const result = await execute('UNSUPPORTED_TYPE' as any, {
        blockName: 'test-block',
        blockType: BlockType.CUSTOM,
        blockVersion: '1.0.0',
        packageType: PackageType.REGISTRY as PackageType.REGISTRY,
      });

      expect(result.status).toBe(EngineResponseStatus.ERROR);
      expect(result.response).toBe('Unsupported operation type: UNSUPPORTED_TYPE');
    });
  });
});