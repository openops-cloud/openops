import { FC } from 'react';

export const ConnectionSlowWarning: FC = () => {
  return (
    <div className="w-full max-w-2xl mb-3">
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
        <div className="flex-shrink-0">
          <svg
            className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-pulse"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="flex-1 text-sm text-amber-800 dark:text-amber-200">
          {t('The AI is taking a bit longer than expected. Please wait...')}
        </div>
      </div>
    </div>
  );
};
