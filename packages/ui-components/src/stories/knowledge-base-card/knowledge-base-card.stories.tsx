import type { Meta, StoryObj } from '@storybook/react-vite';
import { BookOpenIcon } from 'lucide-react';
import { KnowledgeBaseCard } from '../../components/knowledge-base-card/knowledge-base-card';

/**
 * Displays a card for knowledge base.
 */
const meta = {
  title: 'Components/KnowledgeBaseCard',
  component: KnowledgeBaseCard,
  tags: ['autodocs'],
  args: {
    link: '#',
    text: 'What kinds of workflows can I automate?',
    icon: <BookOpenIcon size={20} />,
    iconWrapperClassName: '',
    className: '',
  },
  render: (args) => <KnowledgeBaseCard {...args} />,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof KnowledgeBaseCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default card displaying one item.
 */
export const Default: Story = {};

/**
 * Showing 4 items in one row
 */
export const FourInARow: Story = {
  render: (args) => (
    <div className="w-[776px] h-[169px] flex gap-4">
      <KnowledgeBaseCard {...args} />
      <KnowledgeBaseCard {...args} />
      <KnowledgeBaseCard {...args} />
      <KnowledgeBaseCard {...args} />
    </div>
  ),
};
