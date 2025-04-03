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
import {
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
  actionToPaste: Action | null;
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
      actionToPaste: null,
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
  onPaste,
  children,
}: {
  flowCanvasContainerId?: string;
  selectedStep: string | null;
  clearSelectedStep: () => void;
  flowVersion: FlowVersion;
  onPaste: (actionToPaste: Action) => void;
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
  const [actionToPaste, setActionToPaste] = useState<Action | null>(null);
  const canvasRef = useRef<HTMLElement | null>(null);

  const spacePressed = useKeyPress(SPACE_KEY);
  const shiftPressed = useKeyPress(SHIFT_KEY);
  const copyPressed = useKeyPress(COPY_KEYS, {
    target: canvasRef.current,
  });

  useEffect(() => {
    if (!flowCanvasContainerId) {
      canvasRef.current = null;
      return;
    }

    canvasRef.current = document.getElementById(flowCanvasContainerId);

    const interval = setInterval(() => {
      const element = document.getElementById(flowCanvasContainerId);
      if (element) {
        canvasRef.current = element;
        clearInterval(interval);
      }
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [flowCanvasContainerId]);

  const fallbackCopy = (
    text: string,
    action: Action | null,
    actionCount?: number,
  ) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      if (action) {
        setActionToPaste(action);
      }
      // eslint-disable-next-line
      if (document.execCommand) {
        // eslint-disable-next-line
        document.execCommand('copy');
      }

      if (!action || !actionCount) {
        return;
      }

      copyPasteToast({
        success: true,
        isCopy: true,
        itemsCount: actionCount,
      });
    } catch (err) {
      copyPasteToast({
        success: false,
        isCopy: true,
      });
    } finally {
      document.body.removeChild(textarea);
    }
  };

  const handleCopy = useCallback((action: Action, actionCount: number) => {
    const flowString = JSON.stringify(action);

    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(flowString)
        .then(() => {
          setActionToPaste(action);
          copyPasteToast({
            success: true,
            isCopy: true,
            itemsCount: actionCount,
          });
        })
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.error(error);
          fallbackCopy(flowString, action, actionCount);
          copyPasteToast({
            success: false,
            isCopy: true,
          });
        });
    } else {
      fallbackCopy(flowString, action, actionCount);
    }
  }, []);

  const copySelectedStep = useCallback(() => {
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
  }, [flowVersion, handleCopy, selectedStep]);

  const copySelectedArea = useCallback(() => {
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
  }, [handleCopy]);

  useEffect(() => {
    if (!copyPressed) {
      return;
    }
    const activeElement = document.activeElement;
    const isInsideCanvas = activeElement?.closest(`#${flowCanvasContainerId}`);

    if (!isInsideCanvas) {
      return;
    }

    if (selectedStep) {
      copySelectedStep();
    } else {
      copySelectedArea();
    }
  }, [
    copyPressed,
    copySelectedArea,
    copySelectedStep,
    flowCanvasContainerId,
    selectedStep,
  ]);

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

  useEffect(() => {
    function handler(e: ClipboardEvent) {
      const activeElement = document.activeElement;

      const isEditableElement =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement?.hasAttribute('contenteditable');

      if (isEditableElement) {
        return;
      }

      const clipboardText = e.clipboardData?.getData('text/plain') ?? '';

      if (!clipboardText) {
        // eslint-disable-next-line no-console
        console.log('No data found in the clipboard event');
        copyPasteToast({
          success: false,
          isCopy: false,
        });
        return;
      }

      try {
        const parsedAction = JSON.parse(clipboardText);
        if (parsedAction?.name && parsedAction?.settings) {
          setActionToPaste(parsedAction);
          onPaste(parsedAction);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);

        if (actionToPaste) {
          onPaste(actionToPaste);
        } else {
          copyPasteToast({
            success: false,
            isCopy: false,
          });
        }
      }
    }

    document.addEventListener('paste', handler);

    return () => {
      document.removeEventListener('paste', handler);
    };
  }, [actionToPaste, onPaste, selectedStep]);

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

  const copyAction = useCallback(
    (action: Action) => {
      const actionToBeCopied = cloneDeep(action);
      actionToBeCopied.nextAction = undefined;
      const allNestedSteps = flowHelper.getAllSteps(actionToBeCopied);
      allNestedSteps.forEach((step) => {
        flowHelper.clearStepTestData(step);
      });
      handleCopy(actionToBeCopied, allNestedSteps.length);
    },
    [handleCopy],
  );

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
      actionToPaste,
    }),
    [
      effectivePanningMode,
      onSelectionChange,
      onSelectionEnd,
      copySelectedArea,
      copyAction,
      pastePlusButton,
      actionToPaste,
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
