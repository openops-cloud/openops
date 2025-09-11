import { cn, ScrollArea } from '@openops/components/ui';
import React from 'react';

type RouteWrapperProps = {
  children: React.ReactNode;
  pageHeader?: React.ReactNode;
  useEntireInnerViewport?: boolean;
};

export function RouteWrapper({
  children,
  pageHeader,
  useEntireInnerViewport,
}: RouteWrapperProps) {
  return (
    <div className={cn('flex flex-col flex-1 p-0 h-screen')}>
      {pageHeader}
      <ScrollArea className="h-full flex flex-1">
        <div
          className={cn('container flex w-full max-w-full h-full px-0 py-4', {
            'p-0': useEntireInnerViewport,
          })}
        >
          {children}
        </div>
      </ScrollArea>
    </div>
  );
}
