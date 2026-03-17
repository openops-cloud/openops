import type { Meta, StoryObj } from '@storybook/react';
import { ThemeAwareDecorator } from '../../../.storybook/decorators';
import { BenchmarkReadyStep } from '../../components/benchmark/benchmark-ready-step';

const mockWorkflows = [
  {
    flowId: 'flow-001',
    displayName: 'AWS Benchmark Orchestrator',
    isOrchestrator: true,
  },
  {
    flowId: 'flow-002',
    displayName: 'EC2 Reserved Instances Analysis',
    isOrchestrator: false,
  },
  {
    flowId: 'flow-003',
    displayName: 'S3 Storage Optimization',
    isOrchestrator: false,
  },
  {
    flowId: 'flow-004',
    displayName: 'RDS Right-Sizing Report',
    isOrchestrator: false,
  },
];

const mockResult = {
  benchmarkId: 'benchmark-123',
  folderId: 'folder-456',
  provider: 'aws',
  workflows: mockWorkflows,
  webhookPayload: {
    workflows: ['flow-001'],
    webhookBaseUrl: 'https://example.com/webhook',
    cleanupWorkflows: [],
    accounts: ['123456789'],
    regions: ['us-east-1'],
  },
};

const readyStepMeta = {
  title: 'Components/Benchmark/BenchmarkReadyStep',
  component: BenchmarkReadyStep,
  tags: ['autodocs'],
  args: {
    providerName: 'AWS',
    result: mockResult,
  },
  decorators: [ThemeAwareDecorator],
  parameters: { layout: 'centered' },
  render: (args: React.ComponentProps<typeof BenchmarkReadyStep>) => (
    <div className="w-[460px]">
      <BenchmarkReadyStep {...args} />
    </div>
  ),
} satisfies Meta<typeof BenchmarkReadyStep>;

export default readyStepMeta;

type ReadyStepStory = StoryObj<typeof readyStepMeta>;

export const Idle: ReadyStepStory = { args: { runPhase: 'idle' } };
export const Running: ReadyStepStory = { args: { runPhase: 'running' } };
export const RunningWithProgress: ReadyStepStory = {
  args: { runPhase: 'running', runningProgress: { completed: 2, total: 5 } },
};
export const Failed: ReadyStepStory = { args: { runPhase: 'failed' } };
export const SucceededWithFailures: ReadyStepStory = {
  args: {
    runPhase: 'succeeded_with_failures',
    failedWorkflowNames: [
      'EC2 Reserved Instances Analysis',
      'S3 Storage Optimization',
    ],
  },
};
export const Succeeded: ReadyStepStory = { args: { runPhase: 'succeeded' } };
