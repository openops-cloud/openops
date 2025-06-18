import { cn } from '@openops/components/ui';
import React from 'react';

const LABEL_WIDTH = 116;
const LABEL_HEIGHT = 20;
const LABEL_PADDING = 6;

export function BranchLabelNode({
  data,
}: {
  data: {
    label: string;
    isDefaultBranch: boolean;
  };
}) {
  const { label, isDefaultBranch } = data;
  const style: React.CSSProperties = {
    width: LABEL_WIDTH + LABEL_PADDING * 2,
    height: LABEL_HEIGHT + LABEL_PADDING * 2,
    gap: isDefaultBranch ? 6 : 0,
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center bg-gray-500 border-2 border-white rounded-lg text-white text-sm font-normal pointer-events-none box-border',
        {
          'gap-1.5': isDefaultBranch,
        },
      )}
      style={style}
    >
      {isDefaultBranch && (
        <svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="white"
          stroke="white"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
          className="ml-2"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      )}
      <span
        className={cn(
          'font-normal text-sm truncate overflow-hidden whitespace-nowrap pr-2',
          {
            'px-2': !isDefaultBranch,
          },
        )}
      >
        {label}
      </span>
    </div>
  );
}
