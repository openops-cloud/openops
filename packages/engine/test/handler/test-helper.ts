import { EngineConstants } from '../../src/lib/handler/context/engine-constants'
import { VariableService } from '../../src/lib/variables/variable-service'
import { Action, ActionErrorHandlingOptions, ActionType, BranchAction, BranchCondition, CodeAction, FlowVersionState, LoopOnItemsAction, PackageType, BlockAction, BlockType, ProgressUpdateType } from '@openops/shared'

export const generateMockEngineConstants = (params?: Partial<EngineConstants>): EngineConstants => {
    return new EngineConstants(
        params?.executionCorrelationId ?? 'executionCorrelationId',
        params?.flowId ?? 'flowId',
        params?.flowName ?? 'flowName',
        params?.flowVersionId ?? 'flowVersionId',
        params?.flowVersionState ?? FlowVersionState.DRAFT,
        params?.flowRunId ?? 'flowRunId',
        params?.publicUrl ?? 'http://127.0.0.1:3000',
        params?.internalApiUrl ?? 'http://127.0.0.1:3000',
        params?.retryConstants ?? {
            maxAttempts: 2,
            retryExponential: 1,
            retryInterval: 1,
        },
        params?.engineToken ?? 'engineToken',
        params?.projectId ?? 'projectId',
        params?.variableService ?? new VariableService({
            projectId: 'projectId',
            engineToken: 'engineToken',
            apiUrl: 'http://127.0.0.1:3000',
        }),
        params?.testSingleStepMode ?? false,
        params?.filesServiceType ?? 'local',
        params?.progressUpdateType ?? ProgressUpdateType.NONE,
        params?.serverHandlerId ?? null,
        params?.resumePayload,
    )
}

export function buildSimpleLoopAction({
    name,
    loopItems,
    firstLoopAction,
}: {
    name: string
    loopItems: string
    firstLoopAction?: Action
}): LoopOnItemsAction {
    return {
        id: name,
        name,
        displayName: 'Loop',
        type: ActionType.LOOP_ON_ITEMS,
        settings: {
            items: loopItems,
            inputUiInfo: {},
        },
        firstLoopAction,
        valid: true,
    }
}

export function buildActionWithOneCondition({ condition, onSuccessAction, onFailureAction }: { condition: BranchCondition, onSuccessAction?: Action, onFailureAction?: Action }): BranchAction {
    return {
        id: 'branch',
        name: 'branch',
        displayName: 'Your Branch Name',
        type: ActionType.BRANCH,
        settings: {
            inputUiInfo: {},
            conditions: [
                [condition],
            ],
        },
        onFailureAction,
        onSuccessAction,
        valid: true,
    }
}

export function buildCodeAction({ name, input, nextAction, errorHandlingOptions }: { name: 'echo_step' | 'runtime' | 'echo_step_1', input: Record<string, unknown>, errorHandlingOptions?: ActionErrorHandlingOptions, nextAction?: Action }): CodeAction {
    return {
        id: name,
        name,
        displayName: 'Your Action Name',
        type: ActionType.CODE,
        settings: {
            input,
            sourceCode: {
                packageJson: '{}',
                code: '',
            },
            errorHandlingOptions,
        },
        nextAction,
        valid: true,
    }
}

export function buildBlockAction({ name, input, blockName, actionName, nextAction, errorHandlingOptions }: { errorHandlingOptions?: ActionErrorHandlingOptions, name: string, input: Record<string, unknown>, nextAction?: Action, blockName: string, actionName: string }): BlockAction {
    return {
        id: name,
        name,
        displayName: 'Your Action Name',
        type: ActionType.BLOCK,
        settings: {
            input,
            blockName,
            packageType: PackageType.REGISTRY,
            blockVersion: '1.0.0', // Not required since it's running in development mode
            blockType: BlockType.OFFICIAL,
            actionName,
            inputUiInfo: {
                currentSelectedData: {},
            },
            errorHandlingOptions,
        },
        nextAction,
        valid: true,
    }
}
