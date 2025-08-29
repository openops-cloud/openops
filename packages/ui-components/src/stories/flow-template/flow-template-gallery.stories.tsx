/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect } from '@storybook/jest';
import type { Meta, StoryObj } from '@storybook/react';
import { fn, screen, userEvent, waitFor } from '@storybook/test';
import { useState } from 'react';
import { ThemeAwareDecorator } from '../../../.storybook/decorators';
import {
  FlowTemplateGallery,
  FlowTemplateMetadataWithIntegrations,
  TemplatesTabs,
} from '../../components';
import { TooltipProvider } from '../../ui/tooltip';
import { mocks as storyMocks } from './mocks';

const generateUniqueTemplates = (
  template: FlowTemplateMetadataWithIntegrations,
  count: number,
) => {
  return Array.from({ length: count }, (_, idx) => ({
    ...template,
    id: `${template.id}-${idx}`,
  }));
};

const publicTemplates = generateUniqueTemplates(storyMocks.baseTemplate, 12);
const privateTemplates = generateUniqueTemplates(storyMocks.baseTemplate, 4);

const meta = {
  title: 'Components/FlowTemplateGallery',
  component: FlowTemplateGallery,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      disable: true,
    },
  },
  args: {
    isConnectedToCloud: true,
    showPrivateTemplates: true,
    publicTemplates,
    privateTemplates,
    isPublicTemplatesLoading: false,
    isPrivateTemplatesLoading: false,
    onTemplateSelect: fn(),
    selectionHeading: 'All templates',
    searchText: '',
    onSearchInputChange: fn(),
    onExploreMoreClick: fn(),
    activeTab: TemplatesTabs.Public,
    onTabChange: fn(),
  },
  decorators: [ThemeAwareDecorator],
  render: (args) => {
    const [searchText, setSearchText] = useState(args.searchText ?? '');
    const [activeTab, setActiveTab] = useState(args.activeTab);

    return (
      <TooltipProvider>
        <div className="w-[1137px] h-[80vh] p-6 bg-background rounded-2xl">
          <FlowTemplateGallery
            {...args}
            searchText={searchText}
            onSearchInputChange={(val) => {
              args.onSearchInputChange(val);
              setSearchText(val);
            }}
            activeTab={activeTab}
            onTabChange={(tab) => {
              args.onTabChange(tab);
              setActiveTab(tab);
            }}
          />
        </div>
      </TooltipProvider>
    );
  },
} satisfies Meta<typeof FlowTemplateGallery>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
Default.play = async ({ args }: { args: Story['args'] }) => {
  const searchInputEl = (
    await screen.findAllByPlaceholderText('Search for template')
  ).at(-1)!;
  await waitFor(() =>
    expect(getComputedStyle(searchInputEl).pointerEvents).toBe('auto'),
  );
  await userEvent.type(searchInputEl, 'Lorem');
  await waitFor(() =>
    expect(args?.onSearchInputChange).toHaveBeenCalledTimes('Lorem'.length),
  );
  const flowTemplateCards = await screen.findAllByTestId('template-card');
  await userEvent.click(flowTemplateCards.at(-1)!);
  await waitFor(() => expect(args?.onTemplateSelect).toHaveBeenCalled());
};

export const NoPrivateTemplates: Story = {
  args: {
    ...Default.args,
    publicTemplates,
    activeTab: TemplatesTabs.Public,
    showPrivateTemplates: false,
  },
} as Story;
