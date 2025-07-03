import { ExecutionVerdict, FlowExecutorContext } from '../../src/lib/handler/context/flow-execution-context'
import { flowExecutor } from '../../src/lib/handler/flow-executor'
import { buildBlockAction, generateMockEngineConstants } from './test-helper'
import { FlowRunStatus } from '@openops/shared'

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
            reason: FlowRunStatus.STOPPED,
            stopResponse: response,
        })
        expect(result.steps.http.output).toEqual(response)
    })

})
