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
import {
  COPY_KEYS,
  NODE_SELECTION_RECT_CLASS_NAME,
  SHIFT_KEY,
  SPACE_KEY,
} from './constants';
import { copyPasteToast } from './copy-paste-toast';

export type PanningMode = 'grab' | 'pan';

type CanvasContextState = {
  panningMode: PanningMode;
  setPanningMode: React.Dispatch<React.SetStateAction<PanningMode>>;
  onSelectionChange: (ev: OnSelectionChangeParams) => void;
  onSelectionEnd: () => void;
  copySelectedArea: () => void;
  copyAction: (action: Action) => void;
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

  const copySelectedArea = useDebounceCallback(() => {
    const selectionArea = document.querySelector(
      `.${NODE_SELECTION_RECT_CLASS_NAME}`,
    );
    if (!selectionArea) {
      selectedFlowActionRef.current = null;
      selectedNodeCounterRef.current = 0;
      return;
    }
    if (!selectedFlowActionRef.current || !selectedNodeCounterRef.current) {
      return;
    }

    handleCopy(selectedFlowActionRef.current, selectedNodeCounterRef.current);
  }, 300);

  const copyAction = (action: Action) => {
    const actionToBeCopied = cloneDeep(action);
    actionToBeCopied.nextAction = undefined;
    const actionCounter = flowHelper.getAllSteps(actionToBeCopied).length;
    handleCopy(actionToBeCopied, actionCounter);
  };

  const handleCopy = (action: Action, actionCounter: number) => {
    const flowString = JSON.stringify(action);

    navigator.clipboard
      .writeText(flowString)
      .then(() => {
        copyPasteToast({
          success: true,
          isCopy: true,
          itemsCounter: actionCounter,
        });
      })
      .catch(() => {
        copyPasteToast({
          success: false,
          isCopy: true,
          itemsCounter: actionCounter,
        });
      });
  };

  useEffect(() => {
    if (copyPressed) {
      copySelectedArea();
    }
  }, [copyPressed, copySelectedArea]);

  const contextValue = useMemo(
    () => ({
      panningMode: effectivePanningMode,
      setPanningMode,
      onSelectionChange,
      onSelectionEnd,
      copySelectedArea,
      copyAction,
    }),
    [effectivePanningMode, onSelectionChange, onSelectionEnd, copySelectedArea],
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
