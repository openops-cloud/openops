import {
    ActionType,
    GenericStepOutput,
    StepOutputStatus,
    StepRetryMetadata,
} from '@openops/shared'
import { ExecutionVerdict, FlowExecutorContext } from '../../src/lib/handler/context/flow-execution-context'
import { getBlockRetryMetadata, runWithExponentialBackoff } from '../../src/lib/helper/error-handling'
import { buildBlockAction, buildCodeAction, generateMockEngineConstants } from '../handler/test-helper'

const AZURE_429_RETRY_TYPE = 'AZURE_429' as const

describe('runWithExponentialBackoff', () => {
    const executionState = FlowExecutorContext.empty()
    const codeAction = buildCodeAction({
        name: 'runtime',
        input: {},
        errorHandlingOptions: {
            continueOnFailure: {
                value: false,
            },
            retryOnFailure: {
                value: true,
            },
        },
    })
    const azureAction = buildBlockAction({
        name: 'azure_step',
        input: {},
        blockName: '@openops/block-azure',
        actionName: 'custom_azure_api_call',
        errorHandlingOptions: {
            continueOnFailure: {
                value: false,
            },
            retryOnFailure: {
                value: true,
            },
        },
    })
    const constants = generateMockEngineConstants()
    const requestFunction = jest.fn()
    let setTimeoutSpy: jest.SpyInstance

    beforeEach(() => {
        jest.clearAllMocks()
        jest.useFakeTimers()
        setTimeoutSpy = jest.spyOn(global, 'setTimeout')
    })

    afterEach(() => {
        setTimeoutSpy.mockRestore()
        jest.useRealTimers()
    })

    it('should return resultExecutionState when verdict is not FAILED', async () => {
        const resultExecutionState = FlowExecutorContext.empty().setVerdict(ExecutionVerdict.SUCCEEDED, undefined)
        requestFunction.mockResolvedValue(resultExecutionState)

        const output = await runWithExponentialBackoff(executionState, codeAction, constants, requestFunction)

        expect(output).toEqual(resultExecutionState)
        expect(requestFunction).toHaveBeenCalledWith({ action: codeAction, executionState, constants })
        expect(setTimeoutSpy).not.toHaveBeenCalled()
    })

    it('should retry with the default engine backoff for non-Azure failures', async () => {
        const failedExecutionState = createFailedExecutionState({
            stepName: codeAction.name,
            actionType: ActionType.CODE,
        })
        const successfulExecutionState = FlowExecutorContext.empty().setVerdict(ExecutionVerdict.SUCCEEDED)

        requestFunction
            .mockResolvedValueOnce(failedExecutionState)
            .mockResolvedValueOnce(successfulExecutionState)

        const outputPromise = runWithExponentialBackoff(
            executionState,
            codeAction,
            constants,
            requestFunction,
        )

        await jest.runOnlyPendingTimersAsync()
        const output = await outputPromise

        expect(output).toEqual(successfulExecutionState)
        expect(requestFunction).toHaveBeenCalledTimes(2)
        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1)
    })

    it('should retry with the Azure retry header delay when metadata is present', async () => {
        const failedExecutionState = createFailedExecutionState({
            stepName: azureAction.name,
            actionType: ActionType.BLOCK,
            retryMetadata: {
                type: AZURE_429_RETRY_TYPE,
                retryAfterMs: 3000,
            },
        })
        const successfulExecutionState = FlowExecutorContext.empty().setVerdict(ExecutionVerdict.SUCCEEDED)

        requestFunction
            .mockResolvedValueOnce(failedExecutionState)
            .mockResolvedValueOnce(successfulExecutionState)

        const outputPromise = runWithExponentialBackoff(
            executionState,
            azureAction,
            constants,
            requestFunction,
        )

        await jest.runOnlyPendingTimersAsync()
        const output = await outputPromise

        expect(output).toEqual(successfulExecutionState)
        expect(requestFunction).toHaveBeenCalledTimes(2)
        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 3000)
    })

    it('should retry with a 60-second fallback for Azure 429 failures without a matching header', async () => {
        const failedExecutionState = createFailedExecutionState({
            stepName: azureAction.name,
            actionType: ActionType.BLOCK,
            retryMetadata: {
                type: AZURE_429_RETRY_TYPE,
            },
        })
        const successfulExecutionState = FlowExecutorContext.empty().setVerdict(ExecutionVerdict.SUCCEEDED)

        requestFunction
            .mockResolvedValueOnce(failedExecutionState)
            .mockResolvedValueOnce(successfulExecutionState)

        const outputPromise = runWithExponentialBackoff(
            executionState,
            azureAction,
            constants,
            requestFunction,
        )

        await jest.runOnlyPendingTimersAsync()
        const output = await outputPromise

        expect(output).toEqual(successfulExecutionState)
        expect(requestFunction).toHaveBeenCalledTimes(2)
        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 60000)
    })

    it('should fall back to 60 seconds for invalid Azure retry metadata values', async () => {
        const failedExecutionState = createFailedExecutionState({
            stepName: azureAction.name,
            actionType: ActionType.BLOCK,
            retryMetadata: {
                type: AZURE_429_RETRY_TYPE,
                retryAfterMs: Number.POSITIVE_INFINITY,
            },
        })
        const successfulExecutionState = FlowExecutorContext.empty().setVerdict(ExecutionVerdict.SUCCEEDED)

        requestFunction
            .mockResolvedValueOnce(failedExecutionState)
            .mockResolvedValueOnce(successfulExecutionState)

        const outputPromise = runWithExponentialBackoff(
            executionState,
            azureAction,
            constants,
            requestFunction,
        )

        await jest.runOnlyPendingTimersAsync()
        const output = await outputPromise

        expect(output).toEqual(successfulExecutionState)
        expect(requestFunction).toHaveBeenCalledTimes(2)
        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 60000)
    })

    it('should not retry when retry is disabled even if retry metadata exists', async () => {
        const resultExecutionState = createFailedExecutionState({
            stepName: azureAction.name,
            actionType: ActionType.BLOCK,
            retryMetadata: {
                type: AZURE_429_RETRY_TYPE,
                retryAfterMs: 3000,
            },
        })

        requestFunction.mockResolvedValue(resultExecutionState)

        const actionWithDisabledRetry = buildBlockAction({
            name: 'azure_step',
            input: {},
            blockName: '@openops/block-azure',
            actionName: 'custom_azure_api_call',
            errorHandlingOptions: {
                continueOnFailure: {
                    value: false,
                },
                retryOnFailure: {
                    value: false,
                },
            },
        })

        const output = await runWithExponentialBackoff(
            executionState,
            actionWithDisabledRetry,
            constants,
            requestFunction,
        )

        expect(output).toEqual(resultExecutionState)
        expect(requestFunction).toHaveBeenCalledTimes(1)
        expect(setTimeoutSpy).not.toHaveBeenCalled()
    })
})

describe('getBlockRetryMetadata', () => {
    const azureAction = buildBlockAction({
        name: 'azure_step',
        input: {},
        blockName: '@openops/block-azure',
        actionName: 'custom_azure_api_call',
        errorHandlingOptions: {
            retryOnFailure: {
                value: true,
            },
        },
    })

    it('should return Azure retry metadata for Azure custom API 429 errors', () => {
        expect(
            getBlockRetryMetadata(azureAction, {
                response: {
                    status: 429,
                },
                retryAfterMs: 5000,
            }),
        ).toEqual({
            type: AZURE_429_RETRY_TYPE,
            retryAfterMs: 5000,
        })
    })

    it('should return fallback Azure retry metadata when no header delay exists', () => {
        expect(
            getBlockRetryMetadata(azureAction, {
                response: {
                    status: 429,
                },
            }),
        ).toEqual({
            type: AZURE_429_RETRY_TYPE,
            retryAfterMs: undefined,
        })
    })

    it('should ignore non-Azure actions', () => {
        const nonAzureAction = buildBlockAction({
            name: 'http_step',
            input: {},
            blockName: 'http',
            actionName: 'send_http_request',
            errorHandlingOptions: {
                retryOnFailure: {
                    value: true,
                },
            },
        })

        expect(
            getBlockRetryMetadata(nonAzureAction, {
                response: {
                    status: 429,
                },
                retryAfterMs: 5000,
            }),
        ).toBeUndefined()
    })
})

function createFailedExecutionState({
    stepName,
    actionType,
    retryMetadata,
}: {
    stepName: string
    actionType: ActionType.CODE | ActionType.BLOCK
    retryMetadata?: StepRetryMetadata
}): FlowExecutorContext {
    const failedStepOutput = (
        actionType === ActionType.CODE
            ? GenericStepOutput.create({
                input: {},
                type: ActionType.CODE,
                status: StepOutputStatus.FAILED,
            })
            : GenericStepOutput.create({
                input: {},
                type: ActionType.BLOCK,
                status: StepOutputStatus.FAILED,
            })
    ).setRetryMetadata(retryMetadata)

    return FlowExecutorContext.empty()
        .upsertStep(stepName, failedStepOutput)
        .setVerdict(ExecutionVerdict.FAILED, undefined)
}