import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import { ExploreTemplatesCarousel } from '../../components/flow-template/explore-templates-carousel/explore-templates-carousel';
import { FlowTemplateMetadataWithIntegrations } from '../../components/flow-template/types';
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
 * Displays explore our templates block
 */
const meta = {
  title: 'Components/ExploreTemplatesCarousel',
  component: ExploreTemplatesCarousel,
  tags: ['autodocs'],
  args: {
    showFilters: false,
    filters: [
      'Rate optimization',
      'Workload optimization',
      'Anomaly namagement',
      'Allocation',
    ],
    onFilterClick: action('onFilterClick'),
    templates: Array.from({ length: 10 }).fill(
      templateMetadataDefault,
    ) as FlowTemplateMetadataWithIntegrations[],
    onTemplateClick: action('onTemplateClick'),
    onSeeAllClick: action('onSeeAllClick'),
  },
  parameters: {
    layout: 'centered',
  },
  render: (args) => (
    <TooltipProvider>
      <div className="w-[900px] p-5 bg-background">
        <ExploreTemplatesCarousel {...args} />
      </div>
    </TooltipProvider>
  ),
} satisfies Meta<typeof ExploreTemplatesCarousel>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Displays explore our templates block without filters
 */
export const Default: Story = {};

/**
 * Displays explore our templates block with filters
 */
export const WithFilters: Story = {
  args: {
    showFilters: true,
  },
};

/**
 * Displays explore our templates block with empty state
 */
export const EmptyState: Story = {
  args: {
    showFilters: true,
    templates: [],
  },
};
