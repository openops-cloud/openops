import { BenchmarkWizardOption } from '@openops/shared';
import { getWizardStep } from '../../../src/app/benchmark/wizard.service';

const mockList = jest.fn();
jest.mock(
  '../../../src/app/app-connection/app-connection-service/app-connection-service',
  () => ({
    appConnectionService: {
      list: (...args: unknown[]): ReturnType<typeof mockList> =>
        mockList(...args),
    },
  }),
);

jest.mock('../../../src/app/app-connection/app-connection-utils', () => ({
  removeSensitiveData: (conn: {
    id: string;
    name: string;
    authProviderKey: string;
  }): { id: string; name: string; authProviderKey: string } => ({
    id: conn.id,
    name: conn.name,
    authProviderKey: conn.authProviderKey,
  }),
}));

describe('wizard.service', () => {
  const projectId = 'project-1';

  beforeEach(() => {
    jest.clearAllMocks();
    mockList.mockResolvedValue({
      data: [
        { id: 'conn-1', name: 'AWS Prod', authProviderKey: 'aws' },
        { id: 'conn-2', name: 'AWS Staging', authProviderKey: 'aws' },
      ],
      cursor: null,
    });
  });

  describe('config load for aws', () => {
    it('loads aws config and returns first step (connection) with options', async () => {
      const result = await getWizardStep('aws', {}, projectId);

      expect(result.currentStep).toBe('connection');
      expect(result.title).toContain('AWS connection');
      expect(result.selectionType).toBe('single');
      expect(result.nextStep).toBe('regions'); // accounts skipped
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId,
          authProviders: ['aws'],
          status: expect.any(Array),
          limit: 100,
        }),
      );
      expect(result.options).toHaveLength(2);
      expect(result.options[0]).toMatchObject({
        id: 'conn-1',
        name: 'AWS Prod',
        metadata: { authProviderKey: 'aws' },
      });
    });
  });

  describe('option resolution', () => {
    it('returns static options for regions step', async () => {
      const result = await getWizardStep(
        'aws',
        { currentStep: 'connection', answers: { connection: ['conn-1'] } },
        projectId,
      );

      expect(result.currentStep).toBe('regions');
      expect(result.selectionType).toBe('multi-select');
      expect(result.options.length).toBeGreaterThanOrEqual(1);
      expect(
        result.options.some((o: BenchmarkWizardOption) => o.id === 'us-east-1'),
      ).toBe(true);
      expect(
        result.options.find((o: BenchmarkWizardOption) => o.id === 'us-east-1')
          ?.name,
      ).toBe('US East (N. Virginia)');
    });

    it('returns static options for services step', async () => {
      const result = await getWizardStep(
        'aws',
        {
          currentStep: 'regions',
          answers: {
            connection: ['conn-1'],
            regions: ['us-east-1'],
          },
        },
        projectId,
      );

      expect(result.currentStep).toBe('services');
      expect(result.selectionType).toBe('multi-select');
      expect(
        result.options.some(
          (o: BenchmarkWizardOption) => o.id === 'unattached-ebs',
        ),
      ).toBe(true);
      expect(
        result.options.find(
          (o: BenchmarkWizardOption) => o.id === 'unattached-ebs',
        )?.name,
      ).toBe('Unattached EBS Volumes');
    });
  });

  describe('conditional skip (accounts)', () => {
    it('skips accounts step: after connection, next step is regions', async () => {
      const result = await getWizardStep(
        'aws',
        { currentStep: 'connection', answers: { connection: ['conn-1'] } },
        projectId,
      );

      expect(result.currentStep).toBe('regions');
      expect(result.nextStep).toBe('services');
    });
  });

  describe('nextStep: null when wizard complete', () => {
    it('returns nextStep null when user has completed services step', async () => {
      const result = await getWizardStep(
        'aws',
        {
          currentStep: 'services',
          answers: {
            connection: ['conn-1'],
            regions: ['us-east-1'],
            services: ['unattached-ebs'],
          },
        },
        projectId,
      );

      expect(result.currentStep).toBe('services');
      expect(result.nextStep).toBeNull();
      expect(
        result.options.some(
          (o: BenchmarkWizardOption) => o.id === 'unattached-ebs',
        ),
      ).toBe(true);
    });
  });

  describe('unsupported provider', () => {
    it('throws for unsupported provider', async () => {
      await expect(getWizardStep('azure', {}, projectId)).rejects.toThrow(
        'Unsupported wizard provider: azure',
      );
      expect(mockList).not.toHaveBeenCalled();
    });
  });

  describe('unknown step', () => {
    it('throws for unknown currentStep', async () => {
      await expect(
        getWizardStep(
          'aws',
          { currentStep: 'unknown_step', answers: {} },
          projectId,
        ),
      ).rejects.toThrow('Unknown step: unknown_step');
    });
  });
});
