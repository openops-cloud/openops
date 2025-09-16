import { useEffect, useRef } from 'react';

import { useAuthorization } from '@/app/common/hooks/authorization-hooks';
import {
  BuilderStateContext,
  BuilderStore,
  createBuilderStore,
} from '@/app/features/builder/builder-hooks';
import {
  BuilderInitialState,
  BuilderState,
} from '@/app/features/builder/builder-types';
import { Permission } from '@openops/shared';

type BuilderStateProviderProps = React.PropsWithChildren<BuilderInitialState>;

let currentBuilderStore: BuilderStore | null = null;

export function BuilderStateProvider({
  children,
  ...props
}: BuilderStateProviderProps) {
  const storeRef = useRef<BuilderStore>();
  const { checkAccess } = useAuthorization();

  useEffect(() => {
    if (storeRef.current && props.flow && props.flowVersion) {
      storeRef.current.setState({
        flow: props.flow,
        flowVersion: props.flowVersion,
      });
    }
  }, [props.flow, props.flowVersion]);

  if (!storeRef.current) {
    storeRef.current = createBuilderStore({
      ...props,
      readonly: !checkAccess(Permission.WRITE_FLOW) || props.readonly,
    });

    currentBuilderStore = storeRef.current;
  }

  return (
    <BuilderStateContext.Provider value={storeRef.current}>
      {children}
    </BuilderStateContext.Provider>
  );
}

export function getBuilderStore(): BuilderStore | null {
  return currentBuilderStore;
}

export function useBuilderStoreOutsideProvider<T>(
  selector: (state: BuilderState) => T,
): T | undefined {
  const store = getBuilderStore();
  if (!store) return undefined;

  return store.getState ? selector(store.getState()) : undefined;
}
