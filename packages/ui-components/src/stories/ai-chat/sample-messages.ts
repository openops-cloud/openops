import { AIChatMessage } from '@/components/ai-chat-messages/types';
import { SourceCode } from '@openops/shared';

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
  {
    id: '5',
    role: 'user',
    content: 'Can you create a TypeScript function to process the cost data?',
  },
  {
    id: '6',
    role: 'assistant',
    content: {
      type: 'structured',
      parts: [
        {
          type: 'text',
          content: "Here's a TypeScript function that processes AWS cost data:",
        },
        {
          type: 'sourcecode',
          content: {
            code: `export interface CostDataEntry {
  service: string;
  cost: number;
  currency: string;
}

export interface ProcessedCostData {
  totalCost: number;
  currency: string;
  serviceBreakdown: CostDataEntry[];
  highestCostService: CostDataEntry | null;
}

export function processCostData(rawCostData: any): ProcessedCostData {
  const serviceBreakdown: CostDataEntry[] = [];
  let totalCost = 0;
  let currency = 'USD';
  
  // Process the AWS Cost Explorer response
  if (rawCostData.ResultsByTime && rawCostData.ResultsByTime.length > 0) {
    const timeResult = rawCostData.ResultsByTime[0];
    
    if (timeResult.Groups) {
      timeResult.Groups.forEach((group: any) => {
        const service = group.Keys[0];
        const cost = parseFloat(group.Metrics.UnblendedCost.Amount);
        currency = group.Metrics.UnblendedCost.Unit;
        
        serviceBreakdown.push({
          service,
          cost,
          currency,
        });
        
        totalCost += cost;
      });
    }
  }
  
  // Find the service with highest cost
  const highestCostService = serviceBreakdown.reduce((prev, current) => 
    (prev.cost > current.cost) ? prev : current, 
    serviceBreakdown[0] || null
  );
  
  return {
    totalCost: Math.round(totalCost * 100) / 100, // Round to 2 decimal places
    currency,
    serviceBreakdown: serviceBreakdown.sort((a, b) => b.cost - a.cost),
    highestCostService,
  };
}

// Usage example
export function formatCostReport(processedData: ProcessedCostData): string {
  const { totalCost, currency, serviceBreakdown, highestCostService } = processedData;
  
  let report = \`Total Cost: \${totalCost} \${currency}\\n\`;
  report += \`Highest Cost Service: \${highestCostService?.service} (\${highestCostService?.cost} \${currency})\\n\\n\`;
  report += 'Service Breakdown:\\n';
  
  serviceBreakdown.forEach(service => {
    report += \`- \${service.service}: \${service.cost} \${service.currency}\\n\`;
  });
  
  return report;
}`,
            packageJson: `{
  "name": "aws-cost-processor",
  "version": "1.0.0",
  "description": "TypeScript utilities for processing AWS cost data",
  "main": "index.ts",
  "dependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  },
  "devDependencies": {
    "@types/jest": "^29.0.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0"
  },
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "start": "node dist/index.js"
  }
}`,
          } as SourceCode,
        },
        {
          type: 'text',
          content:
            'This function provides:\n\n- **Type-safe interfaces** for cost data\n- **Data processing** from AWS Cost Explorer format\n- **Sorting** by cost (highest first)\n- **Formatting utilities** for reports\n- **Error handling** for missing data\n\nYou can use it by calling `processCostData()` with the raw response from the AWS CLI command.',
        },
      ],
    },
  },
];
