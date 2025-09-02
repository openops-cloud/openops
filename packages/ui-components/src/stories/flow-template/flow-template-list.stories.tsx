/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect } from '@storybook/jest';
import type { Meta, StoryObj } from '@storybook/react';
import { fn, screen, userEvent, waitFor } from '@storybook/test';
import { v4 as uuidv4 } from 'uuid';
import { ThemeAwareDecorator } from '../../../.storybook/decorators';
import {
  ExploreTemplates,
  FlowTemplateList,
  FlowTemplateMetadataWithIntegrations,
} from '../../components';
import { TooltipProvider } from '../../ui/tooltip';
import { mocks as storyMocks } from './mocks';

/**
 * Displays the FlowTemplateList (cards grid)
 */
const meta = {
  title: 'Components/FlowTemplateList',
  component: FlowTemplateList,
  tags: ['autodocs'],
  args: {
    showAuthor: true,
  },
  parameters: {
    layout: 'centered',
    docs: {
      disable: true,
    },
  },
  decorators: [ThemeAwareDecorator],
  render: (args) => {
    return (
      <TooltipProvider>
        <div className="w-[1137px] h-[80vh] p-6 bg-background rounded-2xl">
          <FlowTemplateList {...args} />
        </div>
      </TooltipProvider>
    );
  },
} satisfies Meta<typeof FlowTemplateList>;

export default meta;

type Story = StoryObj<typeof meta>;

const generateUniqueTemplates = (
  template: FlowTemplateMetadataWithIntegrations,
  count: number,
) => {
  return Array.from({ length: count }, () => ({
    ...template,
    id: uuidv4(),
  }));
};

const mockAllTemplates = generateUniqueTemplates(storyMocks.baseTemplate, 12);

/**
 * Grid with enough templates and company logo
 */
export const ConnectedToCloud: Story = {
  args: {
    templates: mockAllTemplates,
    isLoading: false,
    onTemplateSelect: fn(),
    ownerLogoUrl: 'https://static.openops.com/logos/logo.icon.positive.svg',
  },
} as Story;

ConnectedToCloud.play = async ({ args }: { args: Story['args'] }) => {
  const flowTemplateCards = await screen.findAllByTestId('template-card');
  await userEvent.click(flowTemplateCards.at(-1)!);
  await waitFor(() => expect(args.onTemplateSelect).toHaveBeenCalled());
};

const mockSampleTemplates = generateUniqueTemplates(storyMocks.baseTemplate, 6);

/**
 * Shows ExploreTemplates block below list by passing it as a child
 */
export const NotConnectedToCloud: Story = {
  args: {
    templates: mockSampleTemplates,
    isLoading: false,
    onTemplateSelect: fn(),
  },
  render: (args) => (
    <TooltipProvider>
      <div className="w-[1137px] h-[70vh] p-6 bg-background rounded-2xl">
        <FlowTemplateList {...args}>
          <div className="w-full mb-6 mr-8">
            <ExploreTemplates
              onExploreMoreClick={fn()}
              className="max-w-full"
            />
          </div>
        </FlowTemplateList>
      </div>
    </TooltipProvider>
  ),
};

/**
 * Grid without author section
 */
export const WithoutAuthor: Story = {
  args: {
    ...ConnectedToCloud.args,
    showAuthor: false,
  },
} as Story;
