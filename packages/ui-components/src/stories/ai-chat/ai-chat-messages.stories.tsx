import type { Meta, StoryObj } from '@storybook/react';
import { AIChatMessages } from '../../components/ai-chat-messages/ai-chat-messages';

const meta: Meta<typeof AIChatMessages> = {
  title: 'Components/AIChatMessages',
  component: AIChatMessages,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AIChatMessages>;

export const AWSCliExample: Story = {
  args: {
    messages: [
      {
        id: '1',
        role: 'user',
        content:
          'How do I list all EC2 instances in us-east-1 region that are tagged with Environment=Production?',
      },
      {
        id: '2',
        role: 'assistant',
        content: `Here's the AWS CLI command to list those EC2 instances:

\`\`\`bash
aws ec2 describe-instances \\
  --region us-east-1 \\
  --filters "Name=tag:Environment,Values=Production" \\
  --query 'Reservations[].Instances[].[InstanceId,InstanceType,State.Name,Tags[?Key==\'Name\'].Value|[0]]' \\
  --output table
\`\`\`

This will show you:
- Instance ID
- Instance Type
- Current State
- Name tag value (if exists)`,
      },
      {
        id: '3',
        role: 'user',
        content:
          'Can you also show me how to get the cost for these instances for the last month?',
      },
      {
        id: '4',
        role: 'assistant',
        content: `Here's the AWS CLI command to get the cost data:

\`\`\`text
aws ce get-cost-and-usage \\
  --time-period Start=$(date -d "last month" '+%Y-%m-01'),End=$(date '+%Y-%m-01') \\
  --granularity MONTHLY \\
  --metrics "UnblendedCost" \\
  --filter '{"Tags": {"Key": "Environment", "Values": ["Production"]}}' \\
  --group-by Type=DIMENSION,Key=SERVICE
\`\`\`

**Note:** This will return:
- Costs grouped by AWS service
- Only for resources tagged with \`Environment=Production\`
- Data for the previous month`,
      },
    ],
  },
};

export const CostOptimizationAdvice: Story = {
  args: {
    messages: [
      {
        id: '1',
        role: 'user',
        content: 'What are some quick ways to reduce our cloud costs?',
      },
      {
        id: '2',
        role: 'assistant',
        content: `# Cost Optimization Strategies

### 1. Right-size your instances
\`\`\`bash
aws compute-optimizer get-ec2-instance-recommendations
\`\`\`

### 2. Find and remove idle resources
- **Unattached EBS volumes:**
\`\`\`bash
aws ec2 describe-volumes --filters Name=status,Values=available
\`\`\`
- **Unused Elastic IPs:**
\`\`\`bash
aws ec2 describe-addresses --filters Name=instance-id,Values=
\`\`\`

### 3. Enable cost allocation tags
\`\`\`bash
aws resourcegroupstaggingapi get-resources \\
  --query 'ResourceTagMappingList[?Tags[?Key==\`CostCenter\`]]'
\`\`\`

Would you like specific implementation details for any of these strategies?`,
      },
    ],
  },
};

export const EmptyChat: Story = {
  args: {
    messages: [],
  },
};
