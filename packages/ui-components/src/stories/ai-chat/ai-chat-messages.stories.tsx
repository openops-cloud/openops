import { action } from '@storybook/addon-actions';
import { expect } from '@storybook/jest';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { fireEvent } from '@storybook/testing-library';
import { AIChatMessages } from '../../components/ai-chat-messages/ai-chat-messages';
import { selectLightOrDarkCanvas } from '../../test-utils/select-themed-canvas.util';
import { sampleAIChatMessages } from './sample-messages';

const meta: Meta<typeof AIChatMessages> = {
  title: 'Components/AIChatMessages',
  component: AIChatMessages,
  args: {
    onInject: action('Inject command'),
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AIChatMessages>;

export const CLIExample: Story = {
  args: {
    onInject: fn(),
    messages: sampleAIChatMessages,
  },
  play: async ({ canvasElement, args }) => {
    const firstInjectButton = selectLightOrDarkCanvas(
      canvasElement,
    ).getAllByRole('button', { name: 'Inject command' })[0];

    fireEvent.click(firstInjectButton);

    expect(args.onInject).toHaveBeenCalledWith(
      "aws ec2 describe-instances \\\n  --region us-east-1 \\\n  --filters \"Name=tag:Environment,Values=Production\" \\\n  --query 'Reservations[].Instances[].[InstanceId,InstanceType,State.Name,Tags[?Key=='Name'].Value|[0]]' \\\n  --output table",
    );

    const secondInjectButton = selectLightOrDarkCanvas(
      canvasElement,
    ).getAllByRole('button', { name: 'Inject command' })[1];

    fireEvent.click(secondInjectButton);

    expect(args.onInject).toHaveBeenCalledWith(
      'aws ce get-cost-and-usage \\\n  --time-period Start=$(date -d "last month" \'+%Y-%m-01\'),End=$(date \'+%Y-%m-01\') \\\n  --granularity MONTHLY \\\n  --metrics "UnblendedCost" \\\n  --filter \'{"Tags": {"Key": "Environment", "Values": ["Production"]}}\' \\\n  --group-by Type=DIMENSION,Key=SERVICE',
    );
  },
};

export const EmptyChat: Story = {
  args: {
    messages: [],
  },
};
