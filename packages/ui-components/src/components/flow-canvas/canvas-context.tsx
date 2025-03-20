import { Action, flowHelper } from '@openops/shared';
import {
  OnSelectionChangeParams,
  useKeyPress,
  useStoreApi,
} from '@xyflow/react';
import { cloneDeep } from 'lodash-es';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDebounceCallback } from 'usehooks-ts';
import { COPY_KEYS, SHIFT_KEY, SPACE_KEY } from './constants';
import { copyPasteToast } from './copy-paste-toast';

export type PanningMode = 'grab' | 'pan';

type CanvasContextState = {
  panningMode: PanningMode;
  setPanningMode: React.Dispatch<React.SetStateAction<PanningMode>>;
  onSelectionChange: (ev: OnSelectionChangeParams) => void;
  onSelectionEnd: () => void;
  copy: () => void;
};

const CanvasContext = createContext<CanvasContextState | undefined>(undefined);

export const CanvasContextProvider = ({
  flowCanvasContainerId,
  children,
}: {
  flowCanvasContainerId?: string;
  children: ReactNode;
}) => {
  const [panningMode, setPanningMode] = useState<PanningMode>('grab');
  const [selectedActions, setSelectedActions] = useState<Action[]>([]);
  const selectedFlowActionRef = useRef<Action | null>(null);
  const selectedNodeCounterRef = useRef<number>(0);
  const state = useStoreApi().getState();

  const spacePressed = useKeyPress(SPACE_KEY);
  const shiftPressed = useKeyPress(SHIFT_KEY);

  const canvas = useMemo(() => {
    return flowCanvasContainerId
      ? document.getElementById(flowCanvasContainerId)
      : null;
  }, [flowCanvasContainerId]);
  const copyPressed = useKeyPress(COPY_KEYS, { target: canvas });

  const effectivePanningMode: PanningMode = useMemo(() => {
    if ((spacePressed || panningMode === 'grab') && !shiftPressed) {
      return 'grab';
    } else if ((shiftPressed || panningMode === 'pan') && !spacePressed) {
      return 'pan';
    }
    return 'grab';
  }, [panningMode, shiftPressed, spacePressed]);

  const onSelectionChange = useCallback((ev: OnSelectionChangeParams) => {
    if (ev.nodes.length) {
      setSelectedActions(
        ev.nodes.map((node) => node.data.step).filter(Boolean) as Action[],
      );
    }
  }, []);

  const onSelectionEnd = useCallback(() => {
    const firstStep = selectedActions[0];
    if (!firstStep) return;

    const topLevelSteps = flowHelper.getAllStepsAtFirstLevel(firstStep);
    if (!topLevelSteps.length) return;

    const lastSelectedIndex = selectedActions.reduceRight(
      (foundIndex, action, i) =>
        foundIndex === -1 && topLevelSteps.some((s) => s.name === action.name)
          ? i
          : foundIndex,
      -1,
    );

    const selectedSteps =
      lastSelectedIndex !== -1
        ? topLevelSteps.slice(0, lastSelectedIndex + 1)
        : topLevelSteps;

    if (!selectedSteps.length) return;

    selectedFlowActionRef.current = flowHelper.truncateFlow(
      cloneDeep(selectedSteps[0]),
      selectedSteps[selectedSteps.length - 1].name,
    ) as Action;

    const selectedStepNames = flowHelper
      .getAllSteps(selectedFlowActionRef.current)
      .map((step) => step.name);

    selectedNodeCounterRef.current = selectedStepNames.length;

    state.setNodes(
      state.nodes.map((node) => ({
        ...node,
        selected: selectedStepNames.includes(node.id),
      })),
    );

    setSelectedActions([]);
  }, [selectedActions, state]);

  const copy = useDebounceCallback(() => {
    if (!selectedFlowActionRef.current || !selectedNodeCounterRef.current) {
      return;
    }
    const flowString = JSON.stringify(selectedFlowActionRef.current);

    navigator.clipboard
      .writeText(flowString)
      .then(() => {
        copyPasteToast({
          success: true,
          isCopy: true,
          itemsCounter: selectedNodeCounterRef.current,
        });
      })
      .catch(() => {
        copyPasteToast({
          success: true,
          isCopy: true,
          itemsCounter: selectedNodeCounterRef.current,
        });
      });
  }, 300);

  useEffect(() => {
    if (copyPressed) {
      copy();
    }
  }, [copyPressed, copy]);

  const contextValue = useMemo(
    () => ({
      panningMode: effectivePanningMode,
      setPanningMode,
      onSelectionChange,
      onSelectionEnd,
      copy,
    }),
    [effectivePanningMode, onSelectionChange, onSelectionEnd, copy],
  );
  return (
    <CanvasContext.Provider value={contextValue}>
      {children}
    </CanvasContext.Provider>
  );
};

export const useCanvasContext = () => {
  const context = useContext(CanvasContext);
  if (context === undefined) {
    throw new Error(
      'useCanvasContext must be used within a CanvasContextProvider',
    );
  }
  return context;
};
