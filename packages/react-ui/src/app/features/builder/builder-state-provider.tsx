import { useEffect, useRef, useState } from 'react';

import { useAuthorization } from '@/app/common/components/authorization';
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
const storeChangeListeners = new Set<() => void>();

function notifyStoreChange() {
  for (const listener of storeChangeListeners) {
    listener();
  }
}

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

      currentBuilderStore = storeRef.current;
    }
  }, [props.flow, props.flowVersion]);

  if (!storeRef.current) {
    storeRef.current = createBuilderStore({
      ...props,
      readonly: !checkAccess(Permission.WRITE_FLOW) || props.readonly,
    });
  }

  useEffect(() => {
    currentBuilderStore = storeRef.current || null;
    notifyStoreChange();

    return () => {
      currentBuilderStore = null;
      notifyStoreChange();
    };
  });

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

export function useBuilderStoreOutsideProviderWithSubscription<T>(
  selector: (state: BuilderState) => T,
): T | undefined {
  const [state, setState] = useState<T | undefined>(undefined);
  const selectorRef = useRef(selector);
  const storeRef = useRef<BuilderStore | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  selectorRef.current = selector;

  useEffect(() => {
    const subscribeToCurrentStore = () => {
      const currentStore = getBuilderStore();

      if (currentStore !== storeRef.current) {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }

        storeRef.current = currentStore;

        if (!currentStore) {
          setState(undefined);
          return;
        }

        const initialValue = currentStore.getState
          ? selectorRef.current(currentStore.getState())
          : undefined;
        setState(initialValue);

        unsubscribeRef.current = currentStore.subscribe((newState) => {
          const newValue = selectorRef.current(newState);
          setState(newValue);
        });
      }
    };

    subscribeToCurrentStore();

    storeChangeListeners.add(subscribeToCurrentStore);

    return () => {
      storeChangeListeners.delete(subscribeToCurrentStore);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return state;
}
