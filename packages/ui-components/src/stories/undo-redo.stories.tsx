import { expect } from '@storybook/jest';
import type { Meta, StoryObj } from '@storybook/react';
import { fn, userEvent, waitFor } from '@storybook/test';
import { fireEvent } from '@storybook/testing-library';
import { Redo, Undo, UndoRedoContainer, UndoRedoDevider } from '../components';
import { isMacUserAgent } from '../lib/user-agent-utils';
import { selectLightOrDarkCanvas } from '../test-utils/select-themed-canvas.util';
const isMac = isMacUserAgent();

/**
 * Showcase how to use build a redo undo navigation layout
 */
const meta: Meta<typeof UndoRedoContainer> = {
  title: 'components/UndoRedo',
  component: UndoRedoContainer,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    onClickUndo: fn(),
    onClickRedo: fn(),
    isUndoDisabled: false,
    isRedoDisabled: false,
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '20px' }}>
        <Story />
      </div>
    ),
  ],
  render: ({ onClickUndo, onClickRedo, isUndoDisabled, isRedoDisabled }) => (
    <UndoRedoContainer>
      <Undo onClick={onClickUndo} disabled={isUndoDisabled} />
      <UndoRedoDevider />
      <Redo onClick={onClickRedo} disabled={isRedoDisabled} />
    </UndoRedoContainer>
  ),
} satisfies Meta<typeof UndoRedoContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Both undo and redo are possible
 */
export const Enabled: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);
    const undoButton = await canvas.findByLabelText('Undo');
    const redoButton = await canvas.findByLabelText('Redo');

    fireEvent.click(undoButton);
    await waitFor(() => expect(args.onClickUndo).toHaveBeenCalled());

    // we don't want want to focus the element, use fireEvent instead of userEvent
    fireEvent.click(redoButton);
    await waitFor(() => expect(args.onClickRedo).toHaveBeenCalled());
  },
};

/**
 * Only redo is possible
 */
export const DisabledUndo: Story = {
  args: {
    ...Enabled.args,
    isUndoDisabled: true,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);
    const undoButton = await canvas.findByLabelText('Undo');
    const redoButton = await canvas.findByLabelText('Redo');

    await userEvent.click(undoButton, { skipHover: true });
    expect(args.onClickUndo).not.toHaveBeenCalled();

    // we don't want want to focus the element, use fireEvent instead of userEvent
    fireEvent.click(redoButton);
    await waitFor(() => expect(args.onClickRedo).toHaveBeenCalled());
  },
};

/**
 * Hovered state reaveals the tooltip
 */
export const Tooltip: Story = {
  args: {
    ...Enabled.args,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);
    const undoButton = await canvas.findByLabelText('Undo');
    await userEvent.hover(undoButton);
    const undoShortcutLabel = isMac ? '⌘ + Z' : 'CTRL + Z';
    await canvas.findAllByText(`Undo (${undoShortcutLabel})`);
    const redoButton = await canvas.findByLabelText('Redo');
    await userEvent.hover(redoButton);
    const redoShortcutLabel = isMac ? '⌘ + ⇧ + Z' : 'CTRL + ⇧ + Z';
    await canvas.findAllByText(`Redo (${redoShortcutLabel})`);
  },
};
