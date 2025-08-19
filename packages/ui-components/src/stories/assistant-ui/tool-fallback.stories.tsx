import { expect } from '@storybook/jest';
import type { Meta, StoryObj } from '@storybook/react';
import { userEvent, waitFor } from '@storybook/testing-library';
import { FC } from 'react';

import { ToolFallback } from '../../components/assistant-ui/tool-fallback';
import { TOOL_STATUS_TYPES } from '../../components/assistant-ui/tool-status';
import { Theme } from '../../lib/theme';
import { selectLightOrDarkCanvas } from '../../test-utils/select-themed-canvas.util';
import { TooltipProvider } from '../../ui/tooltip';

const ToolFallbackWrapper: FC<{
  toolName: string;
  argsText: string;
  result?: any;
  status?: any;
  theme?: Theme;
}> = ({
  toolName,
  argsText,
  result,
  status = { type: TOOL_STATUS_TYPES.COMPLETE },
  theme = Theme.LIGHT,
}) => {
  const mockToolCall = {
    type: 'tool-call' as const,
    toolCallId: 'mock-tool-call-id',
    toolName,
    args: {},
    result,
    isError: false,
    argsText,
    artifact: undefined,
    status,
    addResult: () => {},
  };

  return <ToolFallback {...mockToolCall} theme={theme} />;
};

/**
 * A component that displays tool call information with collapsible details,
 * showing the tool name, arguments, and results in a structured format.
 */
const meta = {
  title: 'assistant-ui/ToolFallback',
  component: ToolFallbackWrapper,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <div className="max-w-2xl mx-auto">
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
} satisfies Meta<typeof ToolFallbackWrapper>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Basic tool call with simple string arguments and result.
 */
export const Basic: Story = {
  args: {
    toolName: 'get_weather',
    argsText: '{"location": "New York", "unit": "celsius"}',
    result: '{"temperature": 22, "condition": "sunny", "humidity": 65}',
  },
};

/**
 * Tool call in a running state, showing the loading indicator.
 */
export const ToolCallInProgress: Story = {
  args: {
    toolName: 'get_weather',
    argsText: '{"location": "New York", "unit": "celsius"}',
    result: undefined,
    status: { type: TOOL_STATUS_TYPES.RUNNING },
  },
  parameters: {
    chromatic: { disable: true },
  },
};

/**
 * Tool call with an incomplete status, indicating the tool execution was not completed.
 */
export const ToolCallIncomplete: Story = {
  args: {
    toolName: 'get_weather',
    argsText: '{"location": "New York", "unit": "celsius"}',
    result: 'The tool execution was not completed.',
    status: { type: TOOL_STATUS_TYPES.INCOMPLETE },
  },
};

/**
 * Tool call with complex JSON arguments and structured result.
 */
export const ComplexData: Story = {
  args: {
    toolName: 'analyze_data',
    argsText: `{
  "dataset": "sales_data_2024",
  "filters": {
    "date_range": {
      "start": "2024-01-01",
      "end": "2024-12-31"
    },
    "categories": ["electronics", "clothing", "books"]
  },
  "metrics": ["revenue", "units_sold", "profit_margin"],
  "group_by": ["category", "month"]
}`,
    result: {
      summary: {
        total_revenue: 1250000,
        total_units: 45000,
        avg_profit_margin: 0.23,
      },
      breakdown: {
        electronics: {
          revenue: 650000,
          units: 22000,
          profit_margin: 0.28,
        },
        clothing: {
          revenue: 420000,
          units: 15000,
          profit_margin: 0.18,
        },
        books: {
          revenue: 180000,
          units: 8000,
          profit_margin: 0.15,
        },
      },
      trends: [
        { month: 'Jan', revenue: 95000, trend: 'up' },
        { month: 'Feb', revenue: 102000, trend: 'up' },
        { month: 'Mar', revenue: 98000, trend: 'down' },
      ],
    },
  },
};

/**
 * Tool call with complex JSON arguments and structured result.
 */
export const Expanded: Story = {
  args: ComplexData.args,
  play: async ({ canvasElement }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);

    const expandButton = await canvas.findByRole('button');
    expect(expandButton).toBeInTheDocument();

    expect(canvas.queryByText('Input')).not.toBeInTheDocument();
    expect(canvas.queryByText('Output')).not.toBeInTheDocument();

    // Click the expand button
    await userEvent.click(expandButton);

    await waitFor(() => {
      expect(canvas.getByText('Input')).toBeInTheDocument();
      // eslint-disable-next-line testing-library/no-wait-for-multiple-assertions
      expect(canvas.getByText('Output')).toBeInTheDocument();
    });

    // Verify that we can click the Input toggle to see the arguments
    const inputToggle = canvas.getByText('Input');
    await userEvent.click(inputToggle);

    await waitFor(() => {
      expect(inputToggle).toHaveAttribute('aria-checked', 'true');
    });
  },
};

export const VerySmallWidthTextOverflow: Story = {
  args: {
    toolName: 'very_long_tool_name_that_should_overflow_in_small_container',
    argsText: '{"param": "value"}',
    result: 'Success',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '200px' }}>
        <Story />
      </div>
    ),
  ],
};
