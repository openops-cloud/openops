import { ExecutionVerdict, FlowExecutorContext, VerdictReason } from '../../src/lib/handler/context/flow-execution-context'
import { flowExecutor } from '../../src/lib/handler/flow-executor'
import { buildBlockAction, generateMockEngineConstants } from './test-helper'

jest.mock('../../src/lib/services/progress.service', () => ({
    progressService: {
        sendUpdate: jest.fn().mockImplementation(() => Promise.resolve()),
    },
}))

describe('flow with response', () => {

    it('should execute return response successfully', async () => {
        const input = {
            status: 200,
            headers: {
                'random': 'header',
            },
            body: {
                data: {
                    'hello': 'world',
                },
                body_type: 'json',
            },
        }
        const response = {
            status: 200,
            headers: {
                'random': 'header',
            },
            body: {
                'hello': 'world',
            },
        }
        const result = await flowExecutor.executeFromAction({
            action: buildBlockAction({
                name: 'http',
                blockName: '@openops/block-http',
                actionName: 'return_response',
                input,
            }), executionState: FlowExecutorContext.empty(), constants: generateMockEngineConstants(),
        })

        expect(result.verdict).toBe(ExecutionVerdict.SUCCEEDED)
        expect(result.verdictResponse).toEqual({
            reason: VerdictReason.STOPPED,
            stopResponse: response,
        })
        expect(result.steps.http.output).toEqual(response)
    })

})
