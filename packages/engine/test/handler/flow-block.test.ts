import { ExecutionVerdict, FlowExecutorContext } from '../../src/lib/handler/context/flow-execution-context'
import { blockExecutor } from '../../src/lib/handler/block-executor'
import { buildBlockAction, generateMockEngineConstants } from './test-helper'

describe('blockExecutor', () => {

    it('should execute a block successfully', async () => {
        const result = await blockExecutor.handle({
            action: buildBlockAction({
              name: 'buildArn',
              blockName: '@openops/block-aws',
              actionName: 'build_arn',
              input: {
                  auth: {},
                  service: 's3',
                  region: 'us-east-1',
                  accountId: '123456789012',
                  resourceId: 'mybucket/myobject',
                },
            }), executionState: FlowExecutorContext.empty(), constants: generateMockEngineConstants(),
        })
        expect(result.verdict).toBe(ExecutionVerdict.RUNNING)
        expect(result.steps.buildArn.output).toEqual('arn:aws:s3:us-east-1:123456789012:mybucket/myobject')
    })

    it.skip('should execute fail gracefully when blocks fail', async () => {
        const result = await blockExecutor.handle({
            action: buildBlockAction({
                name: 'send_http',
                blockName: '@openops/block-http',
                actionName: 'send_request',
                input: {
                    'url': 'https://cloud.openops.com/api/v1/asd',
                    'method': 'GET',
                    'headers': {},
                    'body_type': 'none',
                    'body': {},
                    'queryParams': {},
                },
            }), executionState: FlowExecutorContext.empty(), constants: generateMockEngineConstants(),
        })

        const expectedError = {
            response: {
                status: 404,
                body: {
                    statusCode: 404,
                    error: 'Not Found',
                    message: 'Route not found',
                },
            },
            request: {},
        }

        expect(result.verdict).toBe(ExecutionVerdict.FAILED)
        expect(result.steps.send_http.status).toBe('FAILED')
        expect(result.steps.send_http.errorMessage).toEqual(JSON.stringify(expectedError))
    })
})
