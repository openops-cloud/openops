import { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect } from 'storybook/test';
import { ThemeAwareDecorator } from '../../../.storybook/decorators';
import { SkeletonField } from '../../components/skeleton/skeleton-field';
import { SkeletonFieldProvider } from '../../components/skeleton/skeleton-field-context';
import { selectLightOrDarkCanvas } from '../../test-utils/select-themed-canvas.util';

/**
 * `SkeletonField` renders a skeleton placeholder when loading, or its children when content is ready.
 * It can be controlled via a `show` prop directly, or via a `SkeletonFieldProvider` context.
 */
const meta: Meta<typeof SkeletonField> = {
  title: 'Components/SkeletonField',
  component: SkeletonField,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    chromatic: { pauseAnimationAtEnd: true },
  },
  decorators: [ThemeAwareDecorator],
};

export default meta;

type Story = StoryObj<typeof SkeletonField>;

/**
 * When `show` is `true`, the skeleton placeholder is rendered instead of children.
 */
export const ShowingSkeleton: Story = {
  render: () => (
    <div className="w-64 h-10">
      <SkeletonField show={true}>
        <p className="text-sm text-foreground">This content is hidden.</p>
      </SkeletonField>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);
    expect(
      canvas.queryByText('This content is hidden.'),
    ).not.toBeInTheDocument();
    expect(canvas.getByTestId('skeleton-field')).toBeInTheDocument();
  },
};

/**
 * When `show` is `false`, the children are rendered normally.
 */
export const ShowingContent: Story = {
  render: () => (
    <div className="w-64 h-10">
      <SkeletonField show={false}>
        <p className="text-sm text-foreground">Actual content is visible.</p>
      </SkeletonField>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);
    expect(canvas.getByText('Actual content is visible.')).toBeInTheDocument();
  },
};

/**
 * When wrapped in `SkeletonFieldProvider` with `initialShow={true}`, the skeleton is shown
 * for all child `SkeletonField` components that don't override the `show` prop.
 */
export const WithContextShowingSkeleton: Story = {
  render: () => (
    <SkeletonFieldProvider initialShow={true}>
      <div className="flex flex-col gap-4 w-64">
        <div className="h-10">
          <SkeletonField>
            <p className="text-sm text-foreground">Field one content.</p>
          </SkeletonField>
        </div>
        <div className="h-10">
          <SkeletonField>
            <p className="text-sm text-foreground">Field two content.</p>
          </SkeletonField>
        </div>
      </div>
    </SkeletonFieldProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);
    expect(canvas.queryByText('Field one content.')).not.toBeInTheDocument();
    expect(canvas.queryByText('Field two content.')).not.toBeInTheDocument();
    expect(
      canvas.getAllByTestId('skeleton-field').length,
    ).toBeGreaterThanOrEqual(2);
  },
};

/**
 * When wrapped in `SkeletonFieldProvider` with `initialShow={false}`, children are rendered normally.
 */
export const WithContextShowingContent: Story = {
  render: () => (
    <SkeletonFieldProvider initialShow={false}>
      <div className="flex flex-col gap-4 w-64">
        <div className="h-10">
          <SkeletonField>
            <p className="text-sm text-foreground">Field one content.</p>
          </SkeletonField>
        </div>
        <div className="h-10">
          <SkeletonField>
            <p className="text-sm text-foreground">Field two content.</p>
          </SkeletonField>
        </div>
      </div>
    </SkeletonFieldProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);
    expect(canvas.getByText('Field one content.')).toBeInTheDocument();
    expect(canvas.getByText('Field two content.')).toBeInTheDocument();
  },
};

/**
 * A `show` prop on `SkeletonField` takes precedence over the context value.
 * Here the context says `show=true`, but one field overrides it with `show=false`.
 */
export const PropOverridesContext: Story = {
  render: () => (
    <SkeletonFieldProvider initialShow={true}>
      <div className="flex flex-col gap-4 w-64">
        <div className="h-10">
          <SkeletonField>
            <p className="text-sm text-foreground">Hidden by context.</p>
          </SkeletonField>
        </div>
        <div className="h-10">
          <SkeletonField show={false}>
            <p className="text-sm text-foreground">
              Visible via prop override.
            </p>
          </SkeletonField>
        </div>
      </div>
    </SkeletonFieldProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);
    expect(canvas.queryByText('Hidden by context.')).not.toBeInTheDocument();
    expect(canvas.getByText('Visible via prop override.')).toBeInTheDocument();
  },
};
