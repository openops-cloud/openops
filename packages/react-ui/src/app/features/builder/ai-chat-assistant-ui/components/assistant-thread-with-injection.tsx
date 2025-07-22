import { Theme, Thread } from '@openops/components/ui';
import { SourceCode } from '@openops/shared';
import { memo } from 'react';

interface AssistantThreadWithInjectionProps {
  onInject: (code: string | SourceCode) => void;
  theme: Theme;
}

export const AssistantThreadWithInjection = memo(
  ({ onInject, theme }: AssistantThreadWithInjectionProps) => {
    return <Thread theme={theme} onInject={onInject} />;
  },
);

AssistantThreadWithInjection.displayName = 'AssistantThreadWithInjection';

export type { AssistantThreadWithInjectionProps };
