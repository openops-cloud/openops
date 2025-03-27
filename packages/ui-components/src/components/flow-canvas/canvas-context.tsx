import {
  Action,
  flowHelper,
  FlowVersion,
  StepLocationRelativeToParent,
} from '@openops/shared';
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
import { usePrevious } from 'react-use';
import { useDebounceCallback } from 'usehooks-ts';
import { useClipboardContext } from './clipboard-context';
import {
  COPY_DEBOUNCE_DELAY_MS,
  COPY_KEYS,
  NODE_SELECTION_RECT_CLASS_NAME,
  SHIFT_KEY,
  SPACE_KEY,
} from './constants';
import { copyPasteToast } from './copy-paste-toast';

export type PanningMode = 'grab' | 'pan';
export type PlusButtonPostion = {
  parentStep: string;
  plusStepLocation: StepLocationRelativeToParent;
  branchNodeId?: string;
};

type CanvasContextState = {
  panningMode: PanningMode;
  setPanningMode: React.Dispatch<React.SetStateAction<PanningMode>>;
  onSelectionChange: (ev: OnSelectionChangeParams) => void;
  onSelectionEnd: () => void;
  copySelectedArea: () => void;
  copyAction: (action: Action) => void;
  readonly: boolean;
  pastePlusButton: PlusButtonPostion | null;
  setPastePlusButton: React.Dispatch<
    React.SetStateAction<PlusButtonPostion | null>
  >;
};

const CanvasContext = createContext<CanvasContextState | undefined>(undefined);

export const ReadonlyCanvasProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const contextValue = useMemo(
    () => ({
      panningMode: 'grab' as const,
      setPanningMode: () => {},
      onSelectionChange: () => {},
      onSelectionEnd: () => {},
      copySelectedArea: () => {},
      copyAction: () => {},
      readonly: true,
      pastePlusButton: null,
      setPastePlusButton: () => {},
    }),
    [],
  );

  return (
    <CanvasContext.Provider value={contextValue}>
      {children}
    </CanvasContext.Provider>
  );
};

export const InteractiveContextProvider = ({
  flowCanvasContainerId,
  selectedStep,
  clearSelectedStep,
  flowVersion,
  children,
}: {
  flowCanvasContainerId?: string;
  selectedStep: string | null;
  clearSelectedStep: () => void;
  flowVersion: FlowVersion;
  children: ReactNode;
}) => {
  const [panningMode, setPanningMode] = useState<PanningMode>('grab');
  const previousSelectedStep = usePrevious(selectedStep);
  const [selectedActions, setSelectedActions] = useState<Action[]>([]);
  const [pastePlusButton, setPastePlusButton] =
    useState<PlusButtonPostion | null>(null);
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
  const { fetchClipboardOperations } = useClipboardContext();

  // clear multi-selection if we have a new selected step
  useEffect(() => {
    if (selectedStep && previousSelectedStep !== selectedStep) {
      state.setNodes(
        state.nodes.map((node) => ({
          ...node,
          selected: undefined,
        })),
      );
      state.setEdges(state.edges);
    }
  }, [selectedStep, previousSelectedStep, state]);

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

    const selectedFlowAction = flowHelper.truncateFlow(
      cloneDeep(selectedSteps[0]),
      selectedSteps[selectedSteps.length - 1].name,
    ) as Action;

    const selectedStepNames: string[] = [];

    flowHelper.getAllSteps(selectedFlowAction).forEach((step) => {
      flowHelper.clearStepTestData(step);
      selectedStepNames.push(step.name);
    });

    selectedFlowActionRef.current = selectedFlowAction;
    selectedNodeCounterRef.current = selectedStepNames.length;

    state.setNodes(
      state.nodes.map((node) => ({
        ...node,
        selected: selectedStepNames.includes(node.id),
      })),
    );

    setSelectedActions([]);
    clearSelectedStep();
  }, [clearSelectedStep, selectedActions, state]);

  const copySelectedStep = useDebounceCallback(() => {
    if (!selectedStep) {
      return;
    }

    const stepDetails = flowHelper.getStep(flowVersion, selectedStep);

    if (!stepDetails || !flowHelper.isAction(stepDetails.type)) {
      return;
    }

    const stepToBeCopied = cloneDeep(stepDetails);
    stepToBeCopied.nextAction = undefined;
    flowHelper.clearStepTestData(stepToBeCopied);

    handleCopy(stepToBeCopied as Action, 1);
  }, COPY_DEBOUNCE_DELAY_MS);

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
  }, COPY_DEBOUNCE_DELAY_MS);

  const copyAction = (action: Action) => {
    const actionToBeCopied = cloneDeep(action);
    actionToBeCopied.nextAction = undefined;
    const allNestedSteps = flowHelper.getAllSteps(actionToBeCopied);
    allNestedSteps.forEach((step) => {
      flowHelper.clearStepTestData(step);
    });
    handleCopy(actionToBeCopied, allNestedSteps.length);
  };

  const handleCopy = (action: Action, actionCount: number) => {
    const flowString = JSON.stringify(action);

    navigator.clipboard
      .writeText(flowString)
      .then(() => {
        copyPasteToast({
          success: true,
          isCopy: true,
          itemsCount: actionCount,
        });
        fetchClipboardOperations();
      })
      .catch(() => {
        copyPasteToast({
          success: false,
          isCopy: true,
          itemsCount: actionCount,
        });
      });
  };

  useEffect(() => {
    if (!copyPressed) {
      return;
    }

    if (selectedStep) {
      copySelectedStep();
    } else {
      copySelectedArea();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copyPressed, selectedStep]);

  const contextValue = useMemo(
    () => ({
      panningMode: effectivePanningMode,
      setPanningMode,
      onSelectionChange,
      onSelectionEnd,
      copySelectedArea,
      copyAction,
      pastePlusButton,
      setPastePlusButton,
      readonly: false,
    }),
    [
      effectivePanningMode,
      onSelectionChange,
      onSelectionEnd,
      copySelectedArea,
      copyAction,
      pastePlusButton,
    ],
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
