import { expect } from '@storybook/jest';
import type { Meta, StoryObj } from '@storybook/react';
import { userEvent, waitFor } from '@storybook/testing-library';
import { FC } from 'react';

import { ToolFallback } from '../../components/assistant-ui/tool-fallback';
import { TOOL_STATUS_TYPES } from '../../components/assistant-ui/tool-status';
import { selectLightOrDarkCanvas } from '../../test-utils/select-themed-canvas.util';

const ToolFallbackWrapper: FC<{
  toolName: string;
  argsText: string;
  result?: any;
  status?: any;
}> = ({
  toolName,
  argsText,
  result,
  status = { type: TOOL_STATUS_TYPES.COMPLETE },
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

  return <ToolFallback {...mockToolCall} />;
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
      <div className="max-w-2xl mx-auto">
        <Story />
      </div>
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

    // Find the expand/collapse button (chevron)
    const expandButton = await canvas.findByRole('button');
    expect(expandButton).toBeInTheDocument();

    // Initially, the content should be collapsed (not visible)
    // Use a more specific selector to avoid multiple matches
    const argsContent = canvas.queryByText((content, element) => {
      return !!(
        element?.textContent?.includes('dataset') &&
        element?.textContent?.includes('sales_data_2024') &&
        element?.tagName === 'PRE'
      );
    });
    expect(argsContent).not.toBeInTheDocument();

    // Click the expand button
    await userEvent.click(expandButton);

    // Wait for the animation to complete and content to be visible
    await waitFor(
      () => {
        expect(
          canvas.getByText((content, element) => {
            return !!(
              element?.textContent?.includes('dataset') &&
              element?.textContent?.includes('sales_data_2024') &&
              element?.tagName === 'PRE'
            );
          }),
        ).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    // Verify that the arguments are displayed using flexible text matching
    // Target specific pre elements to avoid multiple matches
    const argsPre = canvas.getByText((content, element) => {
      return !!(
        element?.textContent?.includes('filters') &&
        element?.textContent?.includes('date_range') &&
        element?.tagName === 'PRE'
      );
    });
    expect(argsPre).toBeInTheDocument();

    // Verify specific content within the args pre element
    expect(argsPre).toHaveTextContent('categories');
    expect(argsPre).toHaveTextContent('electronics');
    expect(argsPre).toHaveTextContent('metrics');
    expect(argsPre).toHaveTextContent('revenue');

    // Verify that the result section is displayed
    expect(canvas.getByText('Result:')).toBeInTheDocument();

    // Find the result pre element
    const resultPre = canvas.getByText((content, element) => {
      return !!(
        element?.textContent?.includes('total_revenue') &&
        element?.textContent?.includes('1250000') &&
        element?.tagName === 'PRE'
      );
    });
    expect(resultPre).toBeInTheDocument();

    // Verify specific content within the result pre element
    expect(resultPre).toHaveTextContent('total_units');
    expect(resultPre).toHaveTextContent('45000');
    expect(resultPre).toHaveTextContent('avg_profit_margin');
    expect(resultPre).toHaveTextContent('0.23');
    expect(resultPre).toHaveTextContent('electronics');
    expect(resultPre).toHaveTextContent('clothing');
    expect(resultPre).toHaveTextContent('books');
    expect(resultPre).toHaveTextContent('trends');
    expect(resultPre).toHaveTextContent('Jan');
    expect(resultPre).toHaveTextContent('Feb');
    expect(resultPre).toHaveTextContent('Mar');
  },
};
