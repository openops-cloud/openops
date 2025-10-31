import { AlertTriangle } from 'lucide-react';
import { FC } from 'react';

export const ConnectionError: FC<{ error: string }> = ({ error }) => {
  return (
    <div className="w-full max-w-2xl mb-3">
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
        <div className="flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
        </div>
        <div className="flex-1 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      </div>
    </div>
  );
};
