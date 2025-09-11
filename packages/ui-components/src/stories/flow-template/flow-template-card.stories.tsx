import { FlowTemplateMetadata } from '@openops/shared';
import type { Meta, StoryObj } from '@storybook/react';
import { FlowTemplateCard } from '../../components/flow-template/flow-template-card';
import { TooltipProvider } from '../../ui/tooltip';

const templateMetadataDefault = {
  name: 'Custom Template',
  description: 'This is a custom description for the flow template.',
  integrations: [
    {
      displayName: 'Block 1',
      logoUrl: 'https://static.openops.com/logos/logo.icon.positive.svg',
    },
    {
      displayName: 'Block 2',
      logoUrl: 'https://static.openops.com/logos/logo.icon.positive.svg',
    },
    {
      displayName: 'Block 3',
      logoUrl: 'https://static.openops.com/logos/logo.icon.positive.svg',
    },
  ],
  owner: {
    name: 'OpenOps',
    logoUrl: 'https://static.openops.com/logos/logo.icon.positive.svg',
  },
} as FlowTemplateMetadata;
/**
 * Displays a card for flow template metadata.
 */
const meta = {
  title: 'Components/FlowTemplateCard',
  component: FlowTemplateCard,
  tags: ['autodocs'],
  args: {
    templateMetadata: templateMetadataDefault,
    showAuthor: true,
  },
  parameters: {
    layout: 'centered',
  },
  render: (args) => (
    <TooltipProvider>
      <FlowTemplateCard {...args} />
    </TooltipProvider>
  ),
} satisfies Meta<typeof FlowTemplateCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default card displaying sample metadata.
 */
export const Default: Story = {};

/**
 * A customized card with unique metadata.
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
          logoUrl: 'https://static.openops.com/logos/logo.icon.positive.svg',
        },
        {
          displayName: 'Block 2',
          logoUrl: 'https://static.openops.com/logos/logo.icon.positive.svg',
        },
        {
          displayName: 'Block 3',
          logoUrl: 'https://static.openops.com/logos/logo.icon.positive.svg',
        },
        {
          displayName: 'Block 4',
          logoUrl: 'https://static.openops.com/logos/logo.icon.positive.svg',
        },
        {
          displayName: 'Block 5',
          logoUrl: 'https://static.openops.com/logos/logo.icon.positive.svg',
        },
        {
          displayName: 'Block 6',
          logoUrl: 'https://static.openops.com/logos/logo.icon.positive.svg',
        },
        {
          displayName: 'Block 7',
          logoUrl: 'https://static.openops.com/logos/logo.icon.positive.svg',
        },
      ],
      owner: {
        name: 'OpenOps',
        logoUrl: 'https://static.openops.com/logos/logo.icon.positive.svg',
      },
    } as FlowTemplateMetadata,
  },
};

const templateWithMarkdown: FlowTemplateMetadata = {
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
      logoUrl: 'https://static.openops.com/logos/logo.icon.positive.svg',
    },
  ],
  owner: {
    name: 'OpenOps',
    logoUrl: 'https://static.openops.com/logos/logo.icon.positive.svg',
  },
};

/**
 * A customized card with unique metadata.
 */
export const withMarkdown: Story = {
  args: {
    templateMetadata: templateWithMarkdown,
  },
};

/**
 * Card without author section
 */
export const WithoutAuthor: Story = {
  args: {
    ...Default.args,
    showAuthor: false,
  },
};
