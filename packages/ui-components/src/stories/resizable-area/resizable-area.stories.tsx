/* eslint-disable react-hooks/rules-of-hooks */
import { useArgs, useCallback, useState } from '@storybook/preview-api';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { BoxSize, ResizableArea } from '../../components';

const INITIAL_VALUES = {
  width: 200,
  height: 200,
};

const meta = {
  title: 'Components/ResizableBlock',
  component: ResizableArea,
  tags: ['autodocs'],
  args: {
    dimensions: INITIAL_VALUES,
    setDimensions: fn(),
    minWidth: 150,
    minHeight: 150,
    maxWidth: 500,
    maxHeight: 500,
    resizeFrom: 'bottom-right',
    children: (
      <p className="text-primary">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque
        accumsan ante magna, sit amet bibendum magna pellentesque a. Integer
        rhoncus maximus mauris, sit amet lobortis turpis elementum scelerisque.
        Pellentesque consectetur risus laoreet feugiat laoreet. Nunc non
        vulputate dui, a fermentum elit. Orci varius natoque penatibus et magnis
        dis parturient montes, nascetur ridiculus mus. Vivamus ac massa
        venenatis, faucibus lectus a, viverra leo. Proin quis pellentesque
        lorem, et accumsan massa. Nunc ut porta magna.
      </p>
    ),
  },
  argTypes: {
    children: {
      table: {
        disable: true,
      },
    },
  },
  render: (args) => {
    const [, updateArgs] = useArgs();

    const [dimensions, setDimensions] = useState<BoxSize>(INITIAL_VALUES);

    const updateDimensionsState = useCallback(
      (newDimensions: BoxSize) => {
        setDimensions(newDimensions);
        updateArgs({
          dimensions: newDimensions,
        });
      },
      [updateArgs],
    );

    return (
      <div className="w-[600px] h-[600px] p-[50px] border bg-background relative">
        <ResizableArea
          {...args}
          setDimensions={updateDimensionsState}
          dimensions={dimensions}
          className="border mb-[50px]"
        ></ResizableArea>
      </div>
    );
  },
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof ResizableArea>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
