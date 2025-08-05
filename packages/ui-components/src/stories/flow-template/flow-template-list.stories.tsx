/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect } from '@storybook/jest';
import type { Meta, StoryObj } from '@storybook/react';
import { fn, screen, userEvent, waitFor } from '@storybook/test';
import { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  FlowTemplateFilterSidebar,
  FlowTemplateList,
  FlowTemplateMetadataWithIntegrations,
} from '../../components';
import { cn } from '../../lib/cn';
import { Dialog, DialogContent } from '../../ui/dialog';
import { TooltipProvider } from '../../ui/tooltip';
import { VerticalDivider } from '../../ui/vertical-divider';
import { mocks as storyMocks } from './mocks';

/**
 * Displays FlowTemplateList dialog content
 */
const meta = {
  title: 'Components/FlowTemplateList',
  component: FlowTemplateList,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      disable: true,
    },
  },
  render: (args) => {
    const [selectedCategories, setSelectedCategories] = useState<string[]>([
      'Azure',
    ]);

    const [searchInput, setSearchInput] = useState('');

    const onSearchInputChange = useCallback(
      (value: string) => {
        args.onSearchInputChange(value);
        setSearchInput(value);
      },
      [args],
    );

    return (
      <TooltipProvider>
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent
            className={cn(
              'flex flex-col p-0 transition-none h-[90vh] max-w-[1380px]',
              {
                'max-w-[1137px]': !args.isFullCatalog,
              },
            )}
          >
            <div className="flex bg-background h-full rounded-2xl">
              {args.isFullCatalog && (
                <>
                  <div className="w-[255px]">
                    <FlowTemplateFilterSidebar
                      categories={storyMocks.categories}
                      domains={storyMocks.domains}
                      selectedDomains={[]}
                      selectedServices={[]}
                      selectedCategories={selectedCategories}
                      setSelectedDomains={args.setSelectedDomains}
                      setSelectedServices={args.setSelectedServices}
                      onCategoryFilterClick={setSelectedCategories}
                    />
                  </div>
                  <VerticalDivider className="h-full" />
                </>
              )}
              <FlowTemplateList
                {...args}
                searchText={searchInput}
                onSearchInputChange={onSearchInputChange}
              />
            </div>
          </DialogContent>
        </Dialog>
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
 * https://www.figma.com/design/pzGnQIejEYwaP5PZvu8tBj/Template-library?node-id=547-13741&m=dev
 */
export const ConnectedToCloud: Story = {};
ConnectedToCloud.args = {
  templates: mockAllTemplates,
  isLoading: false,
  onTemplateSelect: fn(),
  searchText: '',
  onSearchInputChange: fn(),
  isFullCatalog: true,
  ownerLogoUrl: 'https://static.openops.com/logos/logo.icon.positive.svg',
  selectedDomains: [],
  selectedCategories: [],
  selectedServices: [],
  setSelectedDomains: fn(),
  setSelectedServices: fn(),
  setSelectedCategories: fn(),
  onExploreMoreClick: fn(),
};

ConnectedToCloud.play = async ({ args }: { args: Story['args'] }) => {
  const searchInputEl = (
    await screen.findAllByPlaceholderText('Search for template')
  ).at(-1)!; // "Both" theme picker will mount both modals in the DOM
  await waitFor(() =>
    expect(getComputedStyle(searchInputEl).pointerEvents).toBe('auto'),
  );
  await userEvent.type(searchInputEl, 'Lorem ipsum');
  await waitFor(() =>
    expect(args.onSearchInputChange).toHaveBeenCalledTimes(
      'Lorem ipsum'.length,
    ),
  );
  const flowTemplateCards = await screen.findAllByTestId('template-card');
  await userEvent.click(flowTemplateCards.at(-1)!);
  await waitFor(() => expect(args.onTemplateSelect).toHaveBeenCalled());
};

const mockSampleTemplates = generateUniqueTemplates(storyMocks.baseTemplate, 6);

/**
 * https://www.figma.com/design/pzGnQIejEYwaP5PZvu8tBj/Template-library?node-id=792-14649&m=dev
 */
export const NotConnectedToCloud: Story = {};
NotConnectedToCloud.args = {
  ...ConnectedToCloud.args,
  isFullCatalog: false,
  templates: mockSampleTemplates,
};
NotConnectedToCloud.play = async ({ args }: { args: Story['args'] }) => {
  const exploreMoreBtnEl = (await screen.findAllByText('Explore more')).at(-1)!;
  await waitFor(() =>
    expect(getComputedStyle(exploreMoreBtnEl).pointerEvents).toBe('auto'),
  );
  await userEvent.click(exploreMoreBtnEl);
  await waitFor(() => expect(args.onExploreMoreClick).toHaveBeenCalled());
};
