import { WorkflowNode } from '@/lib/flow-canvas-utils';
import { flowHelper } from '@openops/shared';
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
  useMemo,
  useState,
} from 'react';
import { SHIFT_KEY, SPACE_KEY } from './constants';
export type PanningMode = 'grab' | 'pan';

type CanvasContextState = {
  panningMode: PanningMode;
  setPanningMode: React.Dispatch<React.SetStateAction<PanningMode>>;
  onSelectionChange: (ev: OnSelectionChangeParams) => void;
  onSelectionEnd: () => void;
};

const CanvasContext = createContext<CanvasContextState | undefined>(undefined);

export const CanvasContextProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [panningMode, setPanningMode] = useState<PanningMode>('grab');
  const [selectedNodes, setSelectedNodes] = useState<WorkflowNode[]>([]);
  const state = useStoreApi().getState();

  const spacePressed = useKeyPress(SPACE_KEY);
  const shiftPressed = useKeyPress(SHIFT_KEY);

  const effectivePanningMode: PanningMode = useMemo(() => {
    if ((spacePressed || panningMode === 'grab') && !shiftPressed) {
      return 'grab';
    } else if ((shiftPressed || panningMode === 'pan') && !spacePressed) {
      return 'pan';
    }
    return 'grab';
  }, [panningMode, shiftPressed, spacePressed]);

  const onSelectionChange = (ev: OnSelectionChangeParams) => {
    if (ev.nodes.length) {
      setSelectedNodes(ev.nodes as WorkflowNode[]);
    }
  };

  const onSelectionEnd = useCallback(() => {
    const firstStep = selectedNodes[0]?.data.step;
    if (!firstStep) return;

    const topLevelSteps = flowHelper.getAllStepsAtFirstLevel(firstStep);
    if (!topLevelSteps.length) return;

    const lastSelectedIndex = selectedNodes.reduceRight(
      (foundIndex, node, i) =>
        foundIndex === -1 &&
        topLevelSteps.some((step) => step.name === node.data.step?.name)
          ? i
          : foundIndex,
      -1,
    );

    const selectedSteps =
      lastSelectedIndex !== -1
        ? topLevelSteps.slice(0, lastSelectedIndex + 1)
        : topLevelSteps;

    if (!selectedSteps.length) return;

    const truncatedFlow = flowHelper.truncateFlow(
      cloneDeep(selectedSteps[0]), // Ensuring deep cloning before modifying
      selectedSteps[selectedSteps.length - 1].name,
    );

    const selectedStepNames = flowHelper
      .getAllSteps(truncatedFlow)
      .map((step) => step.name);

    state.addSelectedNodes(selectedStepNames);
  }, [selectedNodes, state]);

  const contextValue = useMemo(
    () => ({
      panningMode: effectivePanningMode,
      setPanningMode,
      selectedNodes,
      onSelectionChange,
      onSelectionEnd,
    }),
    [effectivePanningMode, selectedNodes, onSelectionEnd],
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
