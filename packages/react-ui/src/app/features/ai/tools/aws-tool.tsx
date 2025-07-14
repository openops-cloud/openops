import { makeAssistantToolUI } from '@assistant-ui/react';
import { AlertTriangle, Cloud } from 'lucide-react';
import React from 'react';

function parseResult(result: any) {
  if (!result || !result.content || !Array.isArray(result.content)) return null;
  try {
    const text = result.content[0]?.text;
    if (!text) return null;
    const parsed = JSON.parse(text);
    return parsed.GroupedCosts || null;
  } catch {
    return null;
  }
}

function isErrorResult(result: any): boolean {
  return !!result && typeof result === 'object' && result.isError === true;
}

const Skeleton = () => (
  <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-background-800 shadow-md w-full max-w-md mx-auto mt-4 animate-pulse">
    <Cloud className="w-8 h-8 text-blue-400 mb-2" />
    <div className="text-blue-700 font-semibold">
      Fetching AWS Cost & Usage...
    </div>
  </div>
);

const ErrorState = () => (
  <div className="flex flex-col items-center justify-center p-6 border border-destructive-300 rounded-lg bg-destructive-50 shadow-md w-full max-w-md mx-auto mt-4">
    <AlertTriangle className="w-8 h-8 text-destructive mb-2" />
    <div className="text-destructive font-semibold">
      Error fetching AWS Cost & Usage
    </div>
  </div>
);

const NoDataState = () => (
  <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-background-800 shadow-md w-full max-w-md mx-auto mt-4">
    <AlertTriangle className="w-8 h-8 text-yellow-500 mb-2" />
    <div className="text-yellow-700 font-semibold">No cost data found</div>
  </div>
);

const ResultDisplay: React.FC<{ result: any }> = ({ result }) => {
  const groupedCosts = parseResult(result);
  if (!groupedCosts || typeof groupedCosts !== 'object') {
    return <NoDataState />;
  }
  const groupKeys = Object.keys(groupedCosts);
  const firstGroup =
    groupKeys.length > 0 ? groupedCosts[groupKeys[0]] : undefined;
  const serviceKeys =
    firstGroup && typeof firstGroup === 'object' ? Object.keys(firstGroup) : [];

  return (
    <div className="flex flex-col items-center p-6 border rounded-lg bg-background-800 shadow-md w-full max-w-xl mx-auto mt-4">
      <div className="flex items-center gap-2 mb-4">
        <Cloud className="w-7 h-7 text-blue-500" />
        <span className="text-lg font-bold text-foreground">
          AWS Cost & Usage
        </span>
      </div>
      <div className="overflow-x-auto w-full">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="bg-background-700">
              <th className="px-3 py-2 text-left font-semibold">Date/Group</th>
              {serviceKeys.map((service) => (
                <th key={service} className="px-3 py-2 text-left font-semibold">
                  {service}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupKeys.map((group) => {
              const services = groupedCosts[group];
              return (
                <tr key={group} className="border-t border-background-600">
                  <td className="px-3 py-2 font-medium text-foreground">
                    {group}
                  </td>
                  {serviceKeys.map((service, idx) => {
                    const cost = services?.[service];
                    return (
                      <td key={idx} className="px-3 py-2 text-foreground">
                        ${typeof cost === 'number' ? cost.toFixed(2) : cost}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const AWSGetCostAndUsageToolUI = makeAssistantToolUI({
  toolName: 'get_cost_and_usage',
  render: ({ status, result, args }) => {
    if (status.type === 'running') return <Skeleton />;
    if (status.type === 'incomplete' || isErrorResult(result))
      return <ErrorState />;
    if (!result) return null;
    return <ResultDisplay result={result} />;
  },
});
