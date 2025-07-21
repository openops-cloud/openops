import type { Meta, StoryObj } from '@storybook/react';
import { EditIcon, PlusIcon, SettingsIcon, TrashIcon } from 'lucide-react';

import { TooltipIconButton } from '../../components/assistant-ui/tooltip-icon-button';

const MinusIcon = (props: any) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ArrowLeftIcon = (props: any) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12,19 5,12 12,5" />
  </svg>
);

const ArrowRightIcon = (props: any) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12,5 19,12 12,19" />
  </svg>
);

const SaveIcon = (props: any) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17,21 17,13 7,13 7,21" />
    <polyline points="7,3 7,8 15,8" />
  </svg>
);

const LockIcon = (props: any) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <circle cx="12" cy="16" r="1" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const DownloadIcon = (props: any) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7,10 12,15 17,10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

/**
 * A button component with an icon and tooltip functionality.
 * Provides a compact, accessible way to display icon buttons with helpful tooltips.
 */
const meta = {
  title: 'assistant-ui/TooltipIconButton',
  component: TooltipIconButton,
  tags: ['autodocs'],
  argTypes: {
    tooltip: {
      control: 'text',
      description: 'The tooltip text to display on hover',
    },
    side: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right'],
      description: 'The side where the tooltip should appear',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled',
    },
    onClick: {
      action: 'clicked',
      description: 'Function called when the button is clicked',
    },
  },
  parameters: {
    layout: 'centered',
    chromatic: { disable: true },
  },
  args: {
    tooltip: 'Click me',
    children: <PlusIcon className="h-4 w-4" />,
  },
} satisfies Meta<typeof TooltipIconButton>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Basic tooltip icon button with default settings.
 */
export const Default: Story = {};

/**
 * Tooltip icon button with different tooltip positions.
 */
export const TooltipPositions: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <TooltipIconButton tooltip="Top tooltip" side="top">
        <PlusIcon className="h-4 w-4" />
      </TooltipIconButton>
      <TooltipIconButton tooltip="Bottom tooltip" side="bottom">
        <MinusIcon className="h-4 w-4" />
      </TooltipIconButton>
      <TooltipIconButton tooltip="Left tooltip" side="left">
        <ArrowLeftIcon className="h-4 w-4" />
      </TooltipIconButton>
      <TooltipIconButton tooltip="Right tooltip" side="right">
        <ArrowRightIcon className="h-4 w-4" />
      </TooltipIconButton>
    </div>
  ),
};

/**
 * Disabled state example.
 */
export const Disabled: Story = {
  args: {
    disabled: true,
    tooltip: 'This action is not available',
    children: <LockIcon className="h-4 w-4" />,
  },
};

/**
 * Different button variants.
 */
export const ButtonVariants: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <TooltipIconButton tooltip="Default variant" variant="default">
        <PlusIcon className="h-4 w-4" />
      </TooltipIconButton>
      <TooltipIconButton tooltip="Destructive variant" variant="destructive">
        <TrashIcon className="h-4 w-4" />
      </TooltipIconButton>
      <TooltipIconButton tooltip="Outline variant" variant="outline">
        <EditIcon className="h-4 w-4" />
      </TooltipIconButton>
      <TooltipIconButton tooltip="Secondary variant" variant="secondary">
        <SettingsIcon className="h-4 w-4" />
      </TooltipIconButton>
    </div>
  ),
};

/**
 * Accessibility example with screen reader support.
 */
export const Accessibility: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <TooltipIconButton
        tooltip="Add new workflow (Ctrl+N)"
        aria-label="Add new workflow"
      >
        <PlusIcon className="h-4 w-4" />
      </TooltipIconButton>
      <TooltipIconButton
        tooltip="Save workflow (Ctrl+S)"
        aria-label="Save workflow"
      >
        <SaveIcon className="h-4 w-4" />
      </TooltipIconButton>
      <TooltipIconButton
        tooltip="Export workflow (Ctrl+E)"
        aria-label="Export workflow"
      >
        <DownloadIcon className="h-4 w-4" />
      </TooltipIconButton>
    </div>
  ),
};
