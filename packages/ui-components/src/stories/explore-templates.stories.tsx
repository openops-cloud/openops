import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { ExploreTemplates } from '../components/explore-templates';

const meta: Meta<typeof ExploreTemplates> = {
  title: 'Components/ExploreTemplates',
  component: ExploreTemplates,
  parameters: {
    layout: 'centered',
    viewport: {
      defaultViewport: 'desktop',
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[1024px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ExploreTemplates>;

export const Default: Story = {
  args: {
    onExploreMoreClick: action('onExploreMoreClick'),
  },
};

export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div className="w-[768px]">
        <Story />
      </div>
    ),
  ],
  args: {
    onExploreMoreClick: action('onExploreMoreClick'),
  },
};
