import { makeAssistantToolUI } from '@assistant-ui/react';
import { AlertTriangle, Workflow } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

function parseResult(result: any) {
  if (!result || !result.content || !Array.isArray(result.content)) return null;
  try {
    const text = result.content[0]?.text;
    if (!text) return null;
    const parsed = JSON.parse(text);
    return parsed.data || null;
  } catch {
    return null;
  }
}

function isErrorResult(result: any): boolean {
  return !!result && typeof result === 'object' && result.isError === true;
}

const Skeleton = () => (
  <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-background-800 shadow-md w-full max-w-md mx-auto mt-4 animate-pulse">
    <Workflow className="w-8 h-8 text-blue-400 mb-2" />
    <div className="text-blue-700 font-semibold">Fetching Flows...</div>
  </div>
);

const ErrorState = () => (
  <div className="flex flex-col items-center justify-center p-6 border border-destructive-300 rounded-lg bg-destructive-50 shadow-md w-full max-w-md mx-auto mt-4">
    <AlertTriangle className="w-8 h-8 text-destructive mb-2" />
    <div className="text-destructive font-semibold">Error fetching flows</div>
  </div>
);

const NoDataState = () => (
  <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-background-800 shadow-md w-full max-w-md mx-auto mt-4">
    <AlertTriangle className="w-8 h-8 text-yellow-500 mb-2" />
    <div className="text-yellow-700 font-semibold">No flows found</div>
  </div>
);

const ResultDisplay: React.FC<{ result: any }> = ({ result }) => {
  const data = parseResult(result);
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <NoDataState />;
  }
  const flow = data[0];
  const displayName = flow?.version?.displayName || flow?.id;
  const workflowId = flow?.id;
  return (
    <div className="flex flex-col items-center p-6 border rounded-lg bg-background-800 shadow-md w-full max-w-xl mx-auto mt-4">
      <div className="flex items-center gap-2 mb-4">
        <Workflow className="w-7 h-7 text-blue-500" />
        <span className="text-lg font-bold text-foreground">Flow Found</span>
      </div>
      <div className="mb-2 text-foreground text-base font-semibold">
        {displayName}
      </div>
      <Link
        to={`/flows/${workflowId}`}
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        View Workflow
      </Link>
    </div>
  );
};

export const GETv1FlowsToolUI = makeAssistantToolUI({
  toolName: 'GET_v1flows',
  render: ({ status, result, args }) => {
    if (status.type === 'running') return <Skeleton />;
    if (status.type === 'incomplete' || isErrorResult(result))
      return <ErrorState />;
    if (!result) return null;
    return <ResultDisplay result={result} />;
  },
});
