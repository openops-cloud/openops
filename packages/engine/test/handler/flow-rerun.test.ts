import { ExecutionVerdict, FlowExecutorContext } from '../../src/lib/handler/context/flow-execution-context'
import { flowExecutor } from '../../src/lib/handler/flow-executor'
import { buildBlockAction, generateMockEngineConstants } from './test-helper'

jest.mock('../../src/lib/services/progress.service', () => ({
    progressService: {
        sendUpdate: jest.fn().mockImplementation(() => Promise.resolve()),
    },
}))

const failedHttpAction = buildBlockAction({
    name: 'send_http',
    blockName: '@openops/block-http',
    actionName: 'send_request',
    input: {
        'url': 'https://httpstatuses.maor.io/500',
        'method': 'GET',
        'headers': {},
        'body_type': 'none',
        'body': {},
        'queryParams': {},
    },
})

const successHttpAction =  buildBlockAction({
    name: 'send_http',
    blockName: '@openops/block-http',
    actionName: 'send_request',
    input: {
        'url': 'https://httpstatuses.maor.io/200',
        'method': 'GET',
        'headers': {},
        'body_type': 'none',
        'body': {},
        'queryParams': {},
    },
})


describe('flow retry', () => {
    const context = FlowExecutorContext.empty()
    it('should retry entire flow', async () => {
        const failedResult = await flowExecutor.execute({
            action: failedHttpAction, executionState: context, constants: generateMockEngineConstants(),
        })
        const retryEntireFlow = await flowExecutor.execute({
            action: successHttpAction, executionState: context, constants: generateMockEngineConstants(),
        })
        expect(failedResult.verdict).toBe(ExecutionVerdict.FAILED)
        expect(retryEntireFlow.verdict).toBe(ExecutionVerdict.RUNNING)
    })

    it('should retry flow from failed step', async () => {
        const failedResult = await flowExecutor.execute({
            action: failedHttpAction, executionState: context, constants: generateMockEngineConstants(),
        })

        const retryFromFailed = await flowExecutor.execute({
            action: successHttpAction, executionState: context, constants: generateMockEngineConstants({}),
        })
        expect(failedResult.verdict).toBe(ExecutionVerdict.FAILED)
        expect(retryFromFailed.verdict).toBe(ExecutionVerdict.RUNNING)
    })
})
