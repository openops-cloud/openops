import type { Meta, StoryObj } from '@storybook/react';
import { FC } from 'react';

import { ToolFallback } from '../../components/assistant-ui/tool-fallback';

const ToolFallbackWrapper: FC<{
  toolName: string;
  argsText: string;
  result?: any;
}> = ({ toolName, argsText, result }) => {
  const mockToolCall = {
    type: 'tool-call' as const,
    toolCallId: 'mock-tool-call-id',
    toolName,
    args: {},
    result,
    isError: false,
    argsText,
    artifact: undefined,
    status: { type: 'complete' as const },
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
