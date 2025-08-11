import { useRef } from 'react';

import { useAuthorization } from '@/app/common/hooks/authorization-hooks';
import {
  BuilderInitialState,
  BuilderStateContext,
  BuilderStore,
  createBuilderStore,
} from '@/app/features/builder/builder-hooks';
import { Permission } from '@openops/shared';

type BuilderStateProviderProps = React.PropsWithChildren<BuilderInitialState>;

export function BuilderStateProvider({
  children,
  ...props
}: BuilderStateProviderProps) {
  const storeRef = useRef<BuilderStore>();
  const { checkAccess } = useAuthorization();

  if (!storeRef.current) {
    storeRef.current = createBuilderStore({
      ...props,
      readonly: !checkAccess(Permission.WRITE_FLOW) || props.readonly,
    });
  }
  return (
    <BuilderStateContext.Provider value={storeRef.current}>
      {children}
    </BuilderStateContext.Provider>
  );
}
