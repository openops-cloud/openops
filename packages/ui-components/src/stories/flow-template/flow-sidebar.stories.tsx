import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent } from '@storybook/test';
import { FlowTemplateFilterSidebar } from '../../components/flow-template/flow-template-filter-sidebar';
import { selectLightOrDarkCanvas } from '../../test-utils/select-themed-canvas.util';
import { TooltipProvider } from '../../ui/tooltip';
import { mocks as storyMocks } from './mocks';

/**
 * Displays a sidebar for flow template filters.
 */
const meta = {
  title: 'Components/FlowTemplateFilterSidebar',
  component: FlowTemplateFilterSidebar,
  tags: ['autodocs'],
  args: {
    domains: storyMocks.domains,
    categories: [
      {
        name: 'AWS',
        services: storyMocks.services.slice(0, 4),
      },
      {
        name: 'Azure',
        services: storyMocks.services.slice(4),
      },
    ],
    selectedDomains: ['Allocation'],
    selectedServices: [],
    selectedCategories: [],
    onDomainFilterClick: fn(),
    onServiceFilterClick: fn(),
    onCategoryFilterClick: fn(),
    clearFilters: fn(),
  },
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <div className="w-[255px]">
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
} satisfies Meta<typeof FlowTemplateFilterSidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default sidebar displaying sample filters.
 */
export const Default: Story = {
  play: async ({ canvasElement, args: { clearFilters } }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);
    expect(
      canvas.getByRole('option', {
        selected: true,
      }),
    ).toBeInTheDocument();

    const allTemplatesFilter = canvas.getByText('All Templates');
    await userEvent.click(allTemplatesFilter);
    expect(clearFilters).toHaveBeenCalled();
  },
};

export const WithSelectedCategory: Story = {
  args: {
    selectedCategories: ['AWS'],
  },
  play: async ({ canvasElement, args: { onCategoryFilterClick } }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);
    const awsCategory = canvas.getByText('AWS');
    await userEvent.click(awsCategory);
    expect(onCategoryFilterClick).toHaveBeenCalledWith('AWS');
  },
};
