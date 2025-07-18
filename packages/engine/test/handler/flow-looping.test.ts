jest.mock('lodash.clonedeep', () => jest.fn((value) => value));
import { ExecutionVerdict, FlowExecutorContext } from '../../src/lib/handler/context/flow-execution-context'
import { flowExecutor } from '../../src/lib/handler/flow-executor'
import { buildCodeAction, buildSimpleLoopAction, generateMockEngineConstants } from './test-helper'
import { LoopStepOutput } from '@openops/shared'

jest.mock('../../src/lib/code-block/prepare-code-block.ts', () => ({
    prepareCodeBlock: jest.fn(),
}))

jest.mock('../../src/lib/services/storage.service', () => ({
  createContextStore: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    put: jest.fn(),
  })),
}))

jest.mock('../../src/lib/services/progress.service', () => ({
    progressService: {
        sendUpdate: jest.fn().mockImplementation(() => Promise.resolve()),
    },
}))
describe('flow with looping', () => {

    it('should execute iterations', async () => {
        const codeAction = buildCodeAction({
            name: 'echo_step',
            input: {
                'index': '{{loop.index}}',
            },
        })
        const result = await flowExecutor.executeFromAction({
            action: buildSimpleLoopAction({
                name: 'loop',
                loopItems: '{{ [4,5,6] }}',
                firstLoopAction: codeAction,
            }),
            executionState: FlowExecutorContext.empty(),
            constants: generateMockEngineConstants(),
        })

        const loopOut = result.steps.loop as LoopStepOutput
        expect(result.verdict).toBe(ExecutionVerdict.RUNNING)
        expect(loopOut.output?.iterations.length).toBe(3)
        expect(loopOut.output?.index).toBe(3)
        expect(loopOut.output?.item).toBe(6)
    })

    it('should execute iterations and fail on first iteration', async () => {
        const generateArray = buildCodeAction({
            name: 'echo_step',
            input: {
                'array': '{{ [4,5,6] }}',
            },
            nextAction: buildSimpleLoopAction({
                name: 'loop',
                loopItems: '{{ echo_step.array }}',
                firstLoopAction: buildCodeAction({
                    name: 'runtime',
                    input: {},
                }),
            }),
        })
        const result = await flowExecutor.executeFromAction({
            action: generateArray,
            executionState: FlowExecutorContext.empty(),
            constants: generateMockEngineConstants(),
        })

        const loopOut = result.steps.loop as LoopStepOutput
        expect(result.verdict).toBe(ExecutionVerdict.FAILED)
        expect(loopOut.output?.iterations.length).toBe(3)
        expect(loopOut.output?.index).toBe(3)
        expect(loopOut.output?.item).toBe(6)
    })

})
