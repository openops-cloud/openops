import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import {
  FlowTemplateMetadataWithIntegrations,
  SampleTemplateCard,
} from '../../components';
import { TooltipProvider } from '../../ui/tooltip';

const templateMetadataDefault = {
  name: 'Custom Template',
  description: 'This is a custom description for the flow template.',
  integrations: [
    {
      displayName: 'Block 1',
      logoUrl: '/logos/logo.icon.positive.svg',
    },
    {
      displayName: 'Block 2',
      logoUrl: '/logos/logo.icon.positive.svg',
    },
    {
      displayName: 'Block 3',
      logoUrl: '/logos/logo.icon.positive.svg',
    },
  ],
  owner: {
    name: 'OpenOps',
    logoUrl: '/logos/logo.icon.positive.svg',
  },
} as unknown as FlowTemplateMetadataWithIntegrations;

/**
 * Displays a card for flow sample template.
 */
const meta = {
  title: 'Components/SampleTemplateCard',
  component: SampleTemplateCard,
  tags: ['autodocs'],
  args: {
    templateMetadata: templateMetadataDefault,
    onClick: action('SampleTemplateCard clicked'),
  },
  parameters: {
    layout: 'centered',
  },
  render: (args) => (
    <TooltipProvider>
      <SampleTemplateCard {...args} />
    </TooltipProvider>
  ),
} satisfies Meta<typeof SampleTemplateCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default card displaying sample template.
 */
export const Default: Story = {};

/**
 * The card displaying sample template with long texts.
 */
export const templateWithLongText: Story = {
  args: {
    templateMetadata: {
      name: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed quis mauris ultrices dolor faucibus iaculis.',
      description:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' +
        ' Sed quis mauris ultrices dolor faucibus iaculis.' +
        ' Etiam commodo tristique tellus suscipit viverra.',
      integrations: [
        {
          displayName: 'Block 1',
          logoUrl: '/logos/logo.icon.positive.svg',
        },
        {
          displayName: 'Block 2',
          logoUrl: '/logos/logo.icon.positive.svg',
        },
        {
          displayName: 'Block 3',
          logoUrl: '/logos/logo.icon.positive.svg',
        },
        {
          displayName: 'Block 4',
          logoUrl: '/logos/logo.icon.positive.svg',
        },
        {
          displayName: 'Block 5',
          logoUrl: '/logos/logo.icon.positive.svg',
        },
        {
          displayName: 'Block 6',
          logoUrl: '/logos/logo.icon.positive.svg',
        },
        {
          displayName: 'Block 7',
          logoUrl: '/logos/logo.icon.positive.svg',
        },
      ],
      owner: {
        name: 'OpenOps',
        logoUrl: '/logos/logo.icon.positive.svg',
      },
    } as unknown as FlowTemplateMetadataWithIntegrations,
  },
};

const templateWithMarkdown: FlowTemplateMetadataWithIntegrations = {
  id: 'template-with-markdown',
  name: 'Template with markdown',
  description: `## Prerequisites
- AWS CLI configured with appropriate permissions.
- AWS Lambda, AWS Step Functions, or a scheduled EC2 instance to execute the automation.
- Amazon CloudWatch for monitoring and alerting.
- AWS Identity and Access Management (IAM) roles with permissions to list, tag, snapshot, and delete EBS volumes.`,
  integrations: [
    {
      displayName: 'Block 1',
      logoUrl: '/logos/logo.icon.positive.svg',
    },
  ],
  owner: {
    name: 'OpenOps',
    logoUrl: '/logos/logo.icon.positive.svg',
  },
} as unknown as FlowTemplateMetadataWithIntegrations;

/**
 * The card displaying sample template with markdown description.
 */
export const withMarkdown: Story = {
  args: {
    templateMetadata: templateWithMarkdown,
  },
};

/**
 * The card displaying sample template with while template is not loaded.
 */
export const withoutMetadata: Story = {
  args: {
    templateMetadata: undefined,
  },
  render: (args) => (
    <div className="w-[327px]">
      <TooltipProvider>
        <SampleTemplateCard {...args} />
      </TooltipProvider>
    </div>
  ),
};
