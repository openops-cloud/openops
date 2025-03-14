jest.mock('lodash-es/cloneDeep', () => jest.fn((value) => value));
import { ExecutionVerdict, FlowExecutorContext } from '../../src/lib/handler/context/flow-execution-context'
import { StepExecutionPath } from '../../src/lib/handler/context/step-execution-path'
import { flowExecutor } from '../../src/lib/handler/flow-executor'
import { buildActionWithOneCondition, buildCodeAction, buildBlockAction, buildSimpleLoopAction, generateMockEngineConstants } from './test-helper'
import { BranchOperator, LoopStepOutput } from '@openops/shared'

const runnedSteps = {
    'branch': { 'type': 'BRANCH', 'status': 'SUCCEEDED', 'input': { 'inputUiInfo': {}, 'conditions': [[{ 'operator': 'BOOLEAN_IS_FALSE', 'firstValue': false }]] }, 'output': { 'condition': true } },
    'approval': { 'type': 'BLOCK', 'status': 'SUCCEEDED', 'input': {}, 'output': { 'approved': true } },
    'echo_step': { 'type': 'CODE', 'status': 'SUCCEEDED', 'input': {}, 'output': {} },
}

jest.mock('nanoid', () => ({
    ...jest.requireActual('nanoid'),
    nanoid: jest.fn(() => 'mocked-id'),
}))

jest.mock('../../src/lib/code-block/prepare-code-block.ts', () => ({
    prepareCodeBlock: jest.fn(),
}))

jest.mock('../../src/lib/services/storage.service', () => ({
    createContextStore: jest.fn().mockImplementation(() => ({
        get: jest.fn()
            .mockReturnValueOnce({
                item: 1,
                index: 1,
                isPaused: true,
                steps: runnedSteps,
            })
            .mockResolvedValue({
                item: 1,
                index: 1,
                isPaused: false,
                steps: runnedSteps,
            }),
        put: jest.fn(),
    })),
}))

const simplePauseFlow = buildBlockAction({
    name: 'approval',
    blockName: '@openops/block-approval',
    actionName: 'wait_for_approval',
    input: {},
    nextAction: buildCodeAction({
        name: 'echo_step',
        input: {},
    }),
})

const flawWithTwoPause = buildBlockAction({
    name: 'approval',
    blockName: '@openops/block-approval',
    actionName: 'wait_for_approval',
    input: {},
    nextAction: buildCodeAction({
        name: 'echo_step',
        input: {},
        nextAction: buildBlockAction({
            name: 'approval-1',
            blockName: '@openops/block-approval',
            actionName: 'wait_for_approval',
            input: {},
            nextAction: buildCodeAction({
                name: 'echo_step_1',
                input: {},
            }),
        }),

    }),
})


const pauseFlowWithLoopAndBranch = buildSimpleLoopAction({
    name: 'loop',
    loopItems: '{{ [1] }}',
    firstLoopAction: buildActionWithOneCondition({
        condition: {
            operator: BranchOperator.BOOLEAN_IS_FALSE,
            firstValue: '{{ false }}',
        },
        onSuccessAction: simplePauseFlow,
    }),
})

describe('flow with pause', () => {

    it('should pause and resume succesfully with loops and branch', async () => {
        const pauseResult = await flowExecutor.execute({
            action: pauseFlowWithLoopAndBranch,
            executionState: FlowExecutorContext.empty().setPauseId('executionCorrelationId'),
            constants: generateMockEngineConstants(),
        })
        expect(pauseResult.verdict).toBe(ExecutionVerdict.PAUSED)
        expect(pauseResult.verdictResponse).toEqual({
            'pauseMetadata': {
                executionCorrelationId: 'mocked-id',
            },
            'reason': 'PAUSED',
        })
        expect(Object.keys(pauseResult.steps)).toEqual(['loop'])

        const resumeResult = await flowExecutor.execute({
            action: pauseFlowWithLoopAndBranch,
            executionState: pauseResult.setVerdict(ExecutionVerdict.RUNNING, undefined).setCurrentPath(StepExecutionPath.empty()),
            constants: generateMockEngineConstants({
                resumePayload: {
                    queryParams: {
                        action: 'approve',
                        path: 'loop,0',
                    },
                    body: {},
                    headers: {},
                },
            }),
        })
        expect(resumeResult.verdict).toBe(ExecutionVerdict.RUNNING)
        expect(Object.keys(resumeResult.steps)).toEqual(['loop'])
        const loopOut = resumeResult.steps.loop as LoopStepOutput
        expect(Object.keys(loopOut.output?.iterations[0] ?? {})).toEqual(['branch', 'approval', 'echo_step'])
    })

    it('should pause and resume with two different steps in same flow successfully', async () => {
        const pauseResult1 = await flowExecutor.execute({
            action: flawWithTwoPause,
            executionState: FlowExecutorContext.empty().setPauseId('executionCorrelationId'),
            constants: generateMockEngineConstants(),
        })
        const resumeResult1 = await flowExecutor.execute({
            action: flawWithTwoPause,
            executionState: pauseResult1,
            constants: generateMockEngineConstants({
                resumePayload: {
                    queryParams: {
                        action: 'approve',
                    },
                    body: {},
                    headers: {},
                },
            }),
        })
        expect(resumeResult1.verdict).toBe(ExecutionVerdict.PAUSED)
        expect(resumeResult1.verdictResponse).toEqual({
            'pauseMetadata': {
                executionCorrelationId: 'executionCorrelationId',
                response: {},
            },
            'reason': 'PAUSED',
        })
        const resumeResult2 = await flowExecutor.execute({
            action: flawWithTwoPause,
            executionState: resumeResult1.setVerdict(ExecutionVerdict.RUNNING, undefined),
            constants: generateMockEngineConstants({
                resumePayload: {
                    queryParams: {
                        action: 'approve',
                        path: 'loop,0',
                    },
                    body: {},
                    headers: {},
                },
            }),
        })
        expect(resumeResult2.verdict).toBe(ExecutionVerdict.RUNNING)

    })


    it('should pause and resume successfully', async () => {
        const pauseResult = await flowExecutor.execute({
            action: simplePauseFlow,
            executionState: FlowExecutorContext.empty().setPauseId('executionCorrelationId'),
            constants: generateMockEngineConstants(),
        })
        expect(pauseResult.verdict).toBe(ExecutionVerdict.PAUSED)
        expect(pauseResult.verdictResponse).toEqual({
            'pauseMetadata': {
                executionCorrelationId: 'executionCorrelationId',
                response: {},
            },
            'reason': 'PAUSED',
        })

        const resumeResult = await flowExecutor.execute({
            action: simplePauseFlow,
            executionState: pauseResult,
            constants: generateMockEngineConstants({
                resumePayload: {
                    queryParams: {
                        action: 'approve',
                        path: 'loop,0',
                    },
                    body: {},
                    headers: {},
                },
            }),
        })
        expect(resumeResult.verdict).toBe(ExecutionVerdict.RUNNING)
        expect(resumeResult.currentState()).toEqual({
            'approval': {
                approved: true,
            },
            echo_step: {},
        })
    })

})
