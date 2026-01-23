import { ExecutionVerdict, FlowExecutorContext } from '../../src/lib/handler/context/flow-execution-context'
import { flowExecutor } from '../../src/lib/handler/flow-executor'
import { buildBlockAction, generateMockEngineConstants } from './test-helper'

jest.mock('../../src/lib/services/progress.service', () => ({
    progressService: {
        sendUpdate: jest.fn().mockImplementation(() => Promise.resolve()),
    },
}))

const hookMock = jest.fn(async () => undefined);
jest.mock('../../src/lib/handler/create-webhook-response-hook', () => ({
  createWebhookResponseHook: jest.fn(() => hookMock),
}));

describe('flow with webhook response', () => {
  it('should send the webhook response successfully', async () => {
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

      expect(result.verdict).toBe(ExecutionVerdict.RUNNING)
      expect(result.steps.http.output).toEqual(response)
      expect(hookMock).toHaveBeenCalledWith(response);
  })
})
