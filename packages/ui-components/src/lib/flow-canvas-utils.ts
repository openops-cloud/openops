import {
  Action,
  ActionType,
  assertNotNullOrUndefined,
  FlowVersion,
  isNil,
  StepLocationRelativeToParent,
  Trigger,
  TriggerType,
} from '@openops/shared';
import { nanoid } from 'nanoid';

const VERTICAL_OFFSET = 160;
const HORIZONTAL_SPACE_BETWEEN_NODES = 80;
const SMALL_BUTTON_SIZE = 18;
const BIG_BUTTON_SIZE = 32;
const PLACEHOLDER_HEIGHT = 5;
const NODE_HEIGHT = 70;
const VERTICAL_OFFSET_CORRECTION = 50;
export const LINE_WIDTH = 1;
export const NODE_WIDTH = 260;
export const DRAGGED_STEP_TAG = 'dragged-step';

export enum WorkflowNodeType {
  LOOP_PLACEHOLDER = 'loopPlaceholder',
  PLACEHOLDER = 'placeholder',
  BIG_BUTTON = 'bigButton',
  STEP_NODE = 'stepNode',
  SMALL_BUTTON = 'smallButton',
}

export const OPS_NODE_SIZE: Record<
  WorkflowNodeType,
  { height: number; width: number }
> = {
  [WorkflowNodeType.BIG_BUTTON]: {
    height: BIG_BUTTON_SIZE,
    width: NODE_WIDTH,
  },
  [WorkflowNodeType.STEP_NODE]: {
    height: NODE_HEIGHT,
    width: NODE_WIDTH,
  },
  [WorkflowNodeType.PLACEHOLDER]: {
    height: PLACEHOLDER_HEIGHT,
    width: NODE_WIDTH,
  },
  [WorkflowNodeType.LOOP_PLACEHOLDER]: {
    height: NODE_HEIGHT,
    width: NODE_WIDTH,
  },
  [WorkflowNodeType.SMALL_BUTTON]: {
    height: SMALL_BUTTON_SIZE,
    width: SMALL_BUTTON_SIZE,
  },
};

export const flowCanvasUtils = {
  isPlaceHolder,
  convertFlowVersionToGraph(version: FlowVersion): Graph {
    return traverseFlow(version.trigger);
  },
  traverseFlow,
};

function traverseFlow(
  step: Action | Trigger | undefined,
  branchNodeId?: string,
): Graph {
  if (isNil(step)) {
    return buildGraph(WorkflowNodeType.PLACEHOLDER, undefined, branchNodeId);
  }
  const graph: Graph = buildGraph(
    WorkflowNodeType.STEP_NODE,
    step,
    branchNodeId,
  );
  switch (step.type) {
    case ActionType.LOOP_ON_ITEMS: {
      const { firstLoopAction, nextAction } = step;
      const isEmpty = isNil(firstLoopAction);
      const firstLoopGraph = isEmpty
        ? buildBigButton(step.name, StepLocationRelativeToParent.INSIDE_LOOP)
        : traverseFlow(firstLoopAction);
      const childrenGraphs = [
        buildGraph(WorkflowNodeType.LOOP_PLACEHOLDER),
        offsetGraph(firstLoopGraph, { x: 0, y: BIG_BUTTON_SIZE }),
      ];

      return buildChildrenGraph(
        childrenGraphs,
        [
          StepLocationRelativeToParent.INSIDE_LOOP,
          StepLocationRelativeToParent.INSIDE_LOOP,
        ],
        nextAction,
        graph,
        step.name,
        isEmpty ? 0 : VERTICAL_OFFSET_CORRECTION,
      );
    }
    case ActionType.BRANCH: {
      const { nextAction, onSuccessAction, onFailureAction } = step;

      const isEmpty = isNil(onSuccessAction) && isNil(onFailureAction);

      const childrenGraphs = [onSuccessAction, onFailureAction].map(
        (childGraph, index) => {
          return isNil(childGraph)
            ? offsetGraph(
                buildBigButton(
                  step.name,
                  index === 0
                    ? StepLocationRelativeToParent.INSIDE_TRUE_BRANCH
                    : StepLocationRelativeToParent.INSIDE_FALSE_BRANCH,
                ),
                {
                  x: 0,
                  y: 20,
                },
              )
            : offsetGraph(traverseFlow(childGraph), {
                x: 0,
                y: 20,
              });
        },
      );

      return buildChildrenGraph(
        childrenGraphs,
        [
          StepLocationRelativeToParent.INSIDE_TRUE_BRANCH,
          StepLocationRelativeToParent.INSIDE_FALSE_BRANCH,
        ],
        nextAction,
        graph,
        step.name,
        isEmpty ? 0 : VERTICAL_OFFSET_CORRECTION,
      );
    }
    case ActionType.SPLIT: {
      const { nextAction, branches, settings } = step;

      const mergedBranchesWithSettings = settings.options.map((option) => {
        const definedBranch = branches?.find(
          (branch) => branch.optionId === option.id,
        );
        return {
          optionId: option.id,
          action: definedBranch?.nextAction,
        };
      });

      const isEmpty = !mergedBranchesWithSettings.some(
        (branch) => branch.action,
      );

      const childrenGraphs = mergedBranchesWithSettings.map(
        ({ optionId, action }) => {
          if (action) {
            return offsetGraph(traverseFlow(action, optionId), {
              x: 0,
              y: 20,
            });
          }
          return offsetGraph(
            buildBigButton(
              step.name,
              StepLocationRelativeToParent.INSIDE_SPLIT,
              optionId,
            ),
            {
              x: 0,
              y: 20,
            },
          );
        },
      );

      return buildChildrenGraph(
        childrenGraphs,
        settings.options.map(() => StepLocationRelativeToParent.INSIDE_SPLIT),
        nextAction,
        graph,
        step.name,
        isEmpty ? 0 : VERTICAL_OFFSET_CORRECTION,
      );
    }
    default: {
      const { nextAction } = step;
      const childGraph = offsetGraph(traverseFlow(nextAction), {
        x: 0,
        y: VERTICAL_OFFSET,
      });
      const stepName = graph.nodes[0].data.step?.name;
      assertNotNullOrUndefined(
        stepName,
        'stepName for first node in graph should be defined',
      );
      graph.edges.push(
        addEdge(
          graph.nodes[0],
          childGraph.nodes[0],
          StepLocationRelativeToParent.AFTER,
          stepName,
        ),
      );
      return mergeGraph(graph, childGraph);
    }
  }
}

function buildChildrenGraph(
  childrenGraphs: Graph[],
  locations: StepLocationRelativeToParent[],
  nextAction: Action | Trigger | undefined,
  graph: Graph,
  parentStep: string,
  verticalOffsetCorrection = 0,
): Graph {
  const totalWidth =
    (childrenGraphs.length - 1) * HORIZONTAL_SPACE_BETWEEN_NODES +
    childrenGraphs.reduce(
      (acc, current) => boundingBox(current).width + acc,
      0,
    );
  const maximumHeight =
    childrenGraphs.reduce(
      (acc, current) => Math.max(acc, boundingBox(current).height),
      0,
    ) +
    2 * VERTICAL_OFFSET -
    verticalOffsetCorrection;

  const commonPartGraph = offsetGraph(
    isNil(nextAction)
      ? buildGraph(WorkflowNodeType.PLACEHOLDER)
      : traverseFlow(nextAction),
    {
      x: 0,
      y: maximumHeight,
    },
  );

  let deltaLeftX =
    -(
      totalWidth -
      boundingBox(childrenGraphs[0]).widthLeft -
      boundingBox(childrenGraphs[childrenGraphs.length - 1]).widthRight
    ) /
      2 -
    boundingBox(childrenGraphs[0]).widthLeft;

  childrenGraphs.forEach((childGraph, idx) => {
    const cbx = boundingBox(childGraph);
    graph.edges.push(
      addEdge(graph.nodes[0], childGraph.nodes[0], locations[idx], parentStep),
    );
    const childGraphAfterOffset = offsetGraph(childGraph, {
      x: deltaLeftX + cbx.widthLeft,
      y: VERTICAL_OFFSET,
    });
    graph = mergeGraph(graph, childGraphAfterOffset);
    const rootStepName = graph.nodes[0].data.step?.name;
    assertNotNullOrUndefined(rootStepName, 'rootStepName should be defined');
    graph.edges.push(
      addEdge(
        childGraphAfterOffset.nodes[childGraphAfterOffset.nodes.length - 1],
        commonPartGraph.nodes[0],
        StepLocationRelativeToParent.AFTER,
        rootStepName,
      ),
    );

    if (shouldHideAddButton(idx, childrenGraphs.length, locations)) {
      graph.edges[graph.edges.length - 1].data.addButton = false;
    }

    deltaLeftX += cbx.width + HORIZONTAL_SPACE_BETWEEN_NODES;
  });
  graph = mergeGraph(graph, commonPartGraph);
  return graph;
}

// hide add button in middle branch when having uneven number of branches in a split
const shouldHideAddButton = (
  currentIndex: number,
  totalLength: number,
  locations: StepLocationRelativeToParent[],
) => {
  if (totalLength % 2 === 0) {
    return false;
  }

  const isMiddleIndex = currentIndex === Math.floor(totalLength / 2);
  return (
    isMiddleIndex &&
    locations.includes(StepLocationRelativeToParent.INSIDE_SPLIT)
  );
};

const BUTTON_SIZE = {
  width: 24,
  height: 24,
};

function addEdge(
  nodeOne: WorkflowNode,
  nodeTwo: WorkflowNode,
  stepLocationRelativeToParent: StepLocationRelativeToParent,
  parentStep: string,
): Edge {
  return {
    id: `${nodeOne.id}-${nodeTwo.id}`,
    source: nodeOne.id,
    target: nodeTwo.id,
    focusable: false,
    type:
      nodeTwo.type === WorkflowNodeType.LOOP_PLACEHOLDER
        ? 'apReturnEdge'
        : 'apEdge',
    label: nodeTwo.id,
    data: {
      parentStep: parentStep,
      stepLocationRelativeToParent,
      addButton: nodeTwo.type !== WorkflowNodeType.BIG_BUTTON,
      targetType: nodeTwo.type,
    },
  };
}

function isPlaceHolder(type: WorkflowNodeType): boolean {
  return [
    WorkflowNodeType.PLACEHOLDER,
    WorkflowNodeType.LOOP_PLACEHOLDER,
  ].includes(type);
}

function boundingBox(graph: Graph): BoundingBox {
  const minX = Math.min(...graph.nodes.map((node) => node.position.x));
  const minY = Math.min(...graph.nodes.map((node) => node.position.y));
  const maxX = Math.max(
    ...graph.nodes.map(
      (node) => node.position.x + OPS_NODE_SIZE[node.type].width,
    ),
  );
  const maxY = Math.max(
    ...graph.nodes.map(
      (node) => node.position.y + OPS_NODE_SIZE[node.type].height,
    ),
  );
  const width = maxX - minX;
  const height = maxY - minY;
  const widthLeft = -minX + OPS_NODE_SIZE[graph.nodes[0].type].width / 2;
  const widthRight = maxX - OPS_NODE_SIZE[graph.nodes[0].type].width / 2;
  return { width, height, widthLeft, widthRight };
}

function offsetGraph(graph: Graph, offset: { x: number; y: number }): Graph {
  return {
    nodes: graph.nodes.map((node) => ({
      ...node,
      position: {
        x: node.position.x + offset.x,
        y: node.position.y + offset.y,
      },
    })),
    edges: graph.edges,
  };
}

function buildBigButton(
  parentStep: string,
  stepLocationRelativeToParent?: StepLocationRelativeToParent,
  branchNodeId?: string,
): Graph {
  return {
    nodes: [
      {
        id: nanoid(),
        position: { x: 0, y: 0 },
        type: WorkflowNodeType.BIG_BUTTON,
        data: {
          parentStep,
          stepLocationRelativeToParent,
          branchNodeId,
        },
        selectable: false,
      },
    ],
    edges: [],
  };
}

function buildGraph(
  type: WorkflowNodeType,
  step?: Step,
  branchNodeId?: string,
): Graph {
  return {
    nodes: [
      {
        id: step?.name ?? nanoid(),
        position: { x: 0, y: 0 },
        type,
        data: {
          step,
          branchNodeId,
        },
        draggable: true,
        selectable:
          type !== WorkflowNodeType.PLACEHOLDER &&
          type !== WorkflowNodeType.LOOP_PLACEHOLDER &&
          step?.type !== TriggerType.EMPTY &&
          step?.type !== TriggerType.BLOCK,
      },
    ],
    edges: [],
  };
}

function mergeGraph(graph1: Graph, graph2: Graph): Graph {
  return {
    nodes: [...graph1.nodes, ...graph2.nodes],
    edges: [...graph1.edges, ...graph2.edges],
  };
}

export type EdgePath = {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  data: Edge['data'];
  source: string;
  target: string;
};

export function getEdgePath({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  lengthMultiplier,
}: EdgePath & {
  lengthMultiplier: number;
}) {
  const ARROW_DOWN = 'm6 -6 l-6 6 m-6 -6 l6 6';

  const targetYWithPlaceHolder =
    targetY +
    (flowCanvasUtils.isPlaceHolder(data.targetType)
      ? OPS_NODE_SIZE[data.targetType].height + 10
      : 0);

  if (sourceX === targetX) {
    return {
      buttonPosition: {
        x: (targetX + sourceX) / 2 - BUTTON_SIZE.width / 2,
        y: (targetYWithPlaceHolder + sourceY) / 2 - BUTTON_SIZE.height / 2,
      },
      edgePath: `M ${sourceX} ${sourceY} v ${
        targetYWithPlaceHolder - sourceY
      } ${data.targetType === WorkflowNodeType.STEP_NODE ? ARROW_DOWN : ''}`,
    };
  }

  const FIRST_LINE_LENGTH = 55 * lengthMultiplier;
  const ARC_LEFT = 'a15,15 0 0,0 -15,15';
  const ARC_RIGHT = 'a15,15 0 0,1 15,15';
  const ARC_LEFT_DOWN = 'a15,15 0 0,1 -15,15';
  const ARC_RIGHT_DOWN = 'a15,15 0 0,0 15,15';
  const ARC_LENGTH = 15;
  const SIGN = sourceX > targetX ? -1 : 1;

  return {
    buttonPosition: {
      x: targetX - BUTTON_SIZE.width / 2,
      y: targetYWithPlaceHolder - FIRST_LINE_LENGTH / 2 - 10,
    },
    edgePath: `M${sourceX} ${sourceY}
    v${
      (targetYWithPlaceHolder - sourceY - FIRST_LINE_LENGTH - ARC_LENGTH) *
      lengthMultiplier
    } ${SIGN < 0 ? ARC_LEFT_DOWN : ARC_RIGHT_DOWN}
    h${targetX - sourceX - 2 * SIGN * ARC_LENGTH} ${
      SIGN < 0 ? ARC_LEFT : ARC_RIGHT
    }
    v${(FIRST_LINE_LENGTH - ARC_LENGTH) * lengthMultiplier}
    ${data.targetType === WorkflowNodeType.STEP_NODE ? ARROW_DOWN : ''}`,
  };
}

export const getPositionRelativeToParent = (
  stepLocationRelativeToParent: StepLocationRelativeToParent,
) => ({
  isInsideLoop:
    stepLocationRelativeToParent === StepLocationRelativeToParent.INSIDE_LOOP,
  isInsideSplit:
    stepLocationRelativeToParent === StepLocationRelativeToParent.INSIDE_SPLIT,
  isInsideBranch:
    stepLocationRelativeToParent ===
      StepLocationRelativeToParent.INSIDE_TRUE_BRANCH ||
    stepLocationRelativeToParent ===
      StepLocationRelativeToParent.INSIDE_FALSE_BRANCH,
});

export const getLengthMultiplier = ({
  isInsideBranch,
  isInsideSplit,
  isInsideLoop,
}: {
  isInsideBranch: boolean;
  isInsideSplit: boolean;
  isInsideLoop: boolean;
}) => (isInsideSplit || isInsideBranch || isInsideLoop ? 1.7 : 1);

type Step = Action | Trigger;

type BoundingBox = {
  width: number;
  height: number;
  widthLeft: number;
  widthRight: number;
};

export type WorkflowNode = {
  id: string;
  position: { x: number; y: number };
  type: WorkflowNodeType;
  data: {
    step?: Step;
    parentStep?: string;
    stepLocationRelativeToParent?: StepLocationRelativeToParent;
    branchNodeId?: string;
  };
  selectable?: boolean;
  selected?: boolean;
  draggable?: boolean;
};

export type Edge = {
  id: string;
  source: string;
  target: string;
  type: string;
  focusable: false;
  label: string;
  data: {
    addButton: boolean;
    targetType: WorkflowNodeType;
    stepLocationRelativeToParent: StepLocationRelativeToParent;
    parentStep?: string;
    branchNodeId?: string;
  };
};

export type Graph = {
  nodes: WorkflowNode[];
  edges: Edge[];
};
