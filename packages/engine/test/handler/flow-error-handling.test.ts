
import { codeExecutor } from '../../src/lib/handler/code-executor'
import { ExecutionVerdict, FlowExecutorContext } from '../../src/lib/handler/context/flow-execution-context'
import { blockExecutor } from '../../src/lib/handler/block-executor'
import { buildCodeAction, buildBlockAction, generateMockEngineConstants } from './test-helper'

jest.mock('../../src/lib/code-block/prepare-code-block.ts', () => ({
    prepareCodeBlock: jest.fn(),
}))

describe('code block with error handling', () => {

    it('should continue on failure when execute code a code that throws an error', async () => {
        const result = await codeExecutor.handle({
            action: buildCodeAction({
                name: 'runtime',
                input: {},
                errorHandlingOptions: {
                    continueOnFailure: {
                        value: true,
                    },
                    retryOnFailure: {
                        value: false,
                    },
                },
            }), executionState: FlowExecutorContext.empty(), constants: generateMockEngineConstants(),
        })
        expect(result.verdict).toBe(ExecutionVerdict.RUNNING)
        expect(result.steps.runtime.status).toEqual('FAILED')
        expect(result.steps.runtime.errorMessage).toEqual('Custom Runtime Error')
    })

})

describe('block with error handling', () => {

    it('should continue on failure when block fails', async () => {
        const result = await blockExecutor.handle({
            action: buildBlockAction({
                name: 'send_http',
                blockName: '@openops/block-http',
                actionName: 'send_request',
                input: {
                    'url': 'https://httpstatuses.maor.io/404',
                    'method': 'GET',
                    'headers': {},
                    'failsafe': false,
                    'queryParams': {},
                },
                errorHandlingOptions: {
                    continueOnFailure: {
                        value: true,
                    },
                    retryOnFailure: {
                        value: false,
                    },
                },
            }), executionState: FlowExecutorContext.empty(), constants: generateMockEngineConstants(),
        })

        const expectedError = {
            response: {
                status: 404,
                body: {
                    code: 404,
                    description: 'Not Found',
                },
            },
            request: {},
        }

        expect(result.verdict).toBe(ExecutionVerdict.RUNNING)
        expect(result.steps.send_http.status).toBe('FAILED')
        expect(result.steps.send_http.errorMessage).toStrictEqual(JSON.stringify(expectedError))
    }, 10000)
})
