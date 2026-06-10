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
    const cloudabilityAction = buildBlockAction({
        name: 'cloudability_step',
        input: {},
        blockName: '@openops/block-cloudability',
        actionName: 'cloudability_get_recommendations',
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
    let randomSpy: jest.SpyInstance

    beforeEach(() => {
        jest.clearAllMocks()
        jest.useFakeTimers()
        setTimeoutSpy = jest.spyOn(global, 'setTimeout')
        randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0)
    })

    afterEach(() => {
        setTimeoutSpy.mockRestore()
        randomSpy.mockRestore()
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

    // [label, retryMetadata, Math.random() value, expected setTimeout delay (ms)]
    // jitter = floor(base * 0.2 * random), added to base, then capped at 10 minutes.
    it.each<[string, StepRetryMetadata, number, number]>([
        ['the 60-second default when no Retry-After is provided', { type: 'HTTP_429' }, 0, 60000],
        ['additive jitter (60000 + floor(60000 * 0.2 * 0.5))', { type: 'HTTP_429' }, 0.5, 66000],
        ['the server-provided Retry-After delay', { type: 'HTTP_429', retryAfterMs: 5000 }, 0, 5000],
        ['the base+jitter sum capped at 10 minutes', { type: 'HTTP_429', retryAfterMs: 599000 }, 1, 600000],
    ])('should retry a Cloudability 429 with %s', async (_label, retryMetadata, randomValue, expectedDelayMs) => {
        randomSpy.mockReturnValue(randomValue)
        const failedExecutionState = createFailedExecutionState({
            stepName: cloudabilityAction.name,
            actionType: ActionType.BLOCK,
            retryMetadata,
        })
        const successfulExecutionState = FlowExecutorContext.empty().setVerdict(ExecutionVerdict.SUCCEEDED)

        requestFunction
            .mockResolvedValueOnce(failedExecutionState)
            .mockResolvedValueOnce(successfulExecutionState)

        const outputPromise = runWithExponentialBackoff(
            executionState,
            cloudabilityAction,
            constants,
            requestFunction,
        )

        await jest.runOnlyPendingTimersAsync()
        const output = await outputPromise

        expect(output).toEqual(successfulExecutionState)
        expect(requestFunction).toHaveBeenCalledTimes(2)
        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), expectedDelayMs)
    })

    it('should not retry Cloudability permanent client errors', async () => {
        const resultExecutionState = createFailedExecutionState({
            stepName: cloudabilityAction.name,
            actionType: ActionType.BLOCK,
            retryMetadata: {
                type: 'HTTP_CLIENT_ERROR',
            },
        })

        requestFunction.mockResolvedValue(resultExecutionState)

        const output = await runWithExponentialBackoff(
            executionState,
            cloudabilityAction,
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

    const cloudabilityAction = buildBlockAction({
        name: 'cloudability_step',
        input: {},
        blockName: '@openops/block-cloudability',
        actionName: 'cloudability_get_recommendations',
        errorHandlingOptions: {
            retryOnFailure: {
                value: true,
            },
        },
    })

    // [label, error, expected metadata] — 429 retries with a long backoff,
    // permanent 4xx (except 408) are non-retryable, everything else (408, 5xx)
    // falls through to the generic exponential retry (undefined metadata).
    it.each<
        [string, { response: { status: number }; retryAfterMs?: number }, StepRetryMetadata | undefined]
    >([
        ['429 without a Retry-After', { response: { status: 429 } }, { type: 'HTTP_429', retryAfterMs: undefined }],
        ['429 with a sanitized Retry-After', { response: { status: 429 }, retryAfterMs: 5000 }, { type: 'HTTP_429', retryAfterMs: 5000 }],
        ['422 permanent client error', { response: { status: 422 } }, { type: 'HTTP_CLIENT_ERROR' }],
        ['403 permanent client error', { response: { status: 403 } }, { type: 'HTTP_CLIENT_ERROR' }],
        ['408 timeout', { response: { status: 408 } }, undefined],
        ['503 server error', { response: { status: 503 } }, undefined],
    ])('maps a Cloudability %s', (_label, error, expected) => {
        expect(getBlockRetryMetadata(cloudabilityAction, error)).toEqual(expected)
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