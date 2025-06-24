import { TooltipProvider } from '@radix-ui/react-tooltip';
import { action } from '@storybook/addon-actions';
import { expect } from '@storybook/jest';
import type { Meta, StoryObj } from '@storybook/react';
import { userEvent, waitFor } from '@storybook/testing-library';
import { TestStepDataViewer } from '../../components/test-step-data-viewer/test-step-data-viewer';
import { selectLightOrDarkCanvas } from '../../test-utils/select-themed-canvas.util';

/**
 * TestStepDataViewer displays input and output JSON data with a toggle to switch between them.
 * It's used in test steps to show the data flowing in and out of a step.
 */
const meta = {
  title: 'Components/TestStepDataViewer',
  component: TestStepDataViewer,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
  args: {
    inputJson: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      request: {
        method: 'GET',
        url: 'https://api.example.com/users',
      },
    },
    outputJson: {
      status: 'success',
      data: {
        id: 123,
        name: 'John Doe',
        email: 'john.doe@example.com',
        role: 'admin',
      },
      timestamp: '2023-06-15T10:30:00Z',
    },
    readonly: true,
  },
} satisfies Meta<typeof TestStepDataViewer>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default view of the TestStepDataViewer, displaying output JSON data initially.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);
    // Verify that Output is selected by default
    expect(canvas.getByText('Output')).toHaveAttribute('data-state', 'on');

    // Switch to Input view
    await userEvent.click(canvas.getByText('Input'));
    await waitFor(() => {
      expect(canvas.getByText('Input')).toHaveAttribute('data-state', 'on');
    });

    // Switch back to Output view
    await userEvent.click(canvas.getByText('Output'));
    await waitFor(() => {
      expect(canvas.getByText('Output')).toHaveAttribute('data-state', 'on');
    });
  },
};

/**
 * The TestStepDataViewer in editable mode, allowing users to modify the JSON content.
 */
export const Editable: Story = {
  args: {
    readonly: false,
    onChange: action('Changed JSON'),
  },
};

/**
 * The TestStepDataViewer with complex nested JSON structures for both input and output.
 */
export const ComplexJson: Story = {
  args: {
    inputJson: {
      request: {
        method: 'POST',
        url: 'https://api.example.com/orders',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token123',
        },
        body: {
          customer: {
            id: 'cust_123',
            name: 'Jane Smith',
            email: 'jane.smith@example.com',
          },
          items: [
            { id: 'item_1', name: 'Product A', price: 19.99, quantity: 2 },
            { id: 'item_2', name: 'Product B', price: 29.99, quantity: 1 },
          ],
          shipping: {
            address: {
              street: '123 Main St',
              city: 'Anytown',
              state: 'CA',
              zip: '12345',
            },
            method: 'express',
          },
        },
      },
    },
    outputJson: {
      status: 'success',
      statusCode: 201,
      data: {
        orderId: 'ord_456',
        customer: {
          id: 'cust_123',
          name: 'Jane Smith',
        },
        items: [
          {
            id: 'item_1',
            name: 'Product A',
            price: 19.99,
            quantity: 2,
            subtotal: 39.98,
          },
          {
            id: 'item_2',
            name: 'Product B',
            price: 29.99,
            quantity: 1,
            subtotal: 29.99,
          },
        ],
        totals: {
          subtotal: 69.97,
          tax: 5.6,
          shipping: 15.0,
          total: 90.57,
        },
        shipping: {
          method: 'express',
          estimatedDelivery: '2023-06-18',
          trackingNumber: 'TRK123456',
        },
        payment: {
          method: 'credit_card',
          status: 'processed',
          transactionId: 'txn_789',
        },
        timestamps: {
          created: '2023-06-15T10:30:00Z',
          updated: '2023-06-15T10:30:00Z',
        },
      },
    },
  },
};

/**
 * The TestStepDataViewer with only output JSON data (input is empty).
 */
export const OutputOnlyJson: Story = {
  args: {
    inputJson: undefined,
    outputJson: {
      rows: [{ id: 123, name: 'John Doe', email: 'john.doe@example.com' }],
      rowCount: 1,
      executionTime: '10ms',
    },
  },
};
