import { AIChatMessage } from '@/components/ai-chat-messages/ai-chat-messages';

export const sampleAIChatMessages: AIChatMessage[] = [
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
--query 'Reservations[].Instances[].[InstanceId,InstanceType,State.Name,Tags[?Key=='Name'].Value|[0]]' \\
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
];
