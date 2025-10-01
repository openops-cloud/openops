const evaluateConditionsMock = jest.fn()

jest.mock('../../src/lib/handler/branch-executor', () => ({
    evaluateConditions: evaluateConditionsMock,
}))

const executeFlowMock = jest.fn().mockResolvedValue('result from flowExecutor')

jest.mock('../../src/lib/handler/flow-executor', () => ({
    flowExecutor: {
        executeFromAction: executeFlowMock,
    },
}))

import { FlowExecutorContext } from '../../src/lib/handler/context/flow-execution-context'
import { splitExecutor } from '../../src/lib/handler/split-executor'
import { buildCodeAction } from './test-helper'
import { SplitAction } from '@openops/shared'

describe('split-executor', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    const action: SplitAction = {
        name: 'split',
        nextAction: undefined,
        branches: [
            {
                optionId: '1',
            },
            {
                optionId: '2',
            },
            {
                optionId: '3',
            },
        ],
        settings: {
            inputUiInfo: {},
            defaultBranch: '3',
            options: [
                {
                    id: '1',
                    name: 'option1',
                    conditions: ['condition1'],
                },
                {
                    id: '2',
                    name: 'option2',
                    conditions: ['condition2'],
                },
                {
                    id: '3',
                    name: 'default',
                    conditions: ['condition3'],
                },
            ],
        },
    } as unknown as SplitAction

    test('should always evaluate all conditions except for default branch', async () => {
        evaluateConditionsMock.mockReturnValue(true)

        await splitExecutor.handle({
            action,
            executionState: FlowExecutorContext.empty(),
            constants: mockVariableService(action.settings),
        })

        expect(evaluateConditionsMock).toHaveBeenCalledTimes(2)
        expect(evaluateConditionsMock).toHaveBeenCalledWith(['condition1'])
        expect(evaluateConditionsMock).toHaveBeenCalledWith(['condition2'])
        expect(evaluateConditionsMock).not.toHaveBeenCalledWith(['condition3'])
    })

    test('should return an error message if multiple branch conditions are matched', async () => {
        evaluateConditionsMock.mockReturnValueOnce(true)

        const result = await splitExecutor.handle({
            action,
            executionState: FlowExecutorContext.empty(),
            constants: mockVariableService(action.settings),
        })

        expect(result.verdict).toBe('FAILED')
        expect(result.error?.message).toBe('Multiple branch conditions are matched (option1, option2). Flow execution is stopped!')
    })

    test.each([
        [true, '3'],
        [false, '2'],
    ])('should return an error message when the selected branch is not found', async (shouldSelectDefault: boolean, expectedSelectedOptionId: string) => {
        if (shouldSelectDefault) {
            evaluateConditionsMock.mockReturnValue(false)
        }
        else {
            evaluateConditionsMock.mockReturnValueOnce(false).mockReturnValueOnce(true).mockReturnValue(false)
        }

        const result = await splitExecutor.handle({
            action: {
                ...action,
                branches: [],
            },
            executionState: FlowExecutorContext.empty(),
            constants: mockVariableService(action.settings),
        })

        expect(result.verdict).toBe('FAILED')
        expect(result.error?.message).toBe(`Did not find a branch that matches optionId=${expectedSelectedOptionId}. Flow execution is stopped!`)
    })

    test.each([
        [true, '3', 'default'],
        [false, '2', 'option2'],
    ])('should return the execution context when selected branch is default=%p and it has no next action and the split also has no next action', async (shouldSelectDefault: boolean, expectedSelectedOptionId: string, expectedSelectedOptionName: string) => {
        if (shouldSelectDefault) {
            evaluateConditionsMock.mockReturnValue(false)
        }
        else {
            evaluateConditionsMock.mockReturnValueOnce(false).mockReturnValueOnce(true)
        }

        const result = await splitExecutor.handle({
            action: {
                ...action,
                branches: [
                    {
                        optionId: expectedSelectedOptionId,
                        nextAction: undefined,
                    },
                ],
            },
            executionState: FlowExecutorContext.empty(),
            constants: mockVariableService(action.settings),
        })

        expect(result.verdict).toBe('RUNNING')
        expect(result.getStepOutput('split')?.output).toEqual({
            evaluatedOptions: [
                { conditionsMatched: false, optionId: '1', optionName: 'option1' },
                { conditionsMatched: !shouldSelectDefault, optionId: '2', optionName: 'option2' },
            ],
            selectedOptionName: expectedSelectedOptionName,
        })

        expect(executeFlowMock).not.toHaveBeenCalled()
    })

    test.each([
        true,
        false,
    ])('should execute the next action of the split when selected branch is default=%p and it has no next action but the split has a next action', async (shouldSelectDefault: boolean) => {
        if (shouldSelectDefault) {
            evaluateConditionsMock.mockReturnValue(false)
        }
        else {
            evaluateConditionsMock.mockReturnValueOnce(false).mockReturnValueOnce(true)
        }

        const result = await splitExecutor.handle({
            action: {
                ...action,
                nextAction: buildCodeAction({
                    name: 'echo_step',
                    input: {},
                }),
            },
            executionState: FlowExecutorContext.empty(),
            constants: mockVariableService(action.settings),
        })

        expect(result).toBe('result from flowExecutor')

        expect(executeFlowMock).toHaveBeenCalledTimes(1)
        expect(executeFlowMock).toHaveBeenCalledWith({
            action: buildCodeAction({
                name: 'echo_step',
                input: {},
            }),
            constants: expect.anything(),
            executionState: expect.anything(),
        })
    })

    test.each([
        [true, '3'],
        [false, '2'],
    ])('should execute the next action of the selected branch when selected branch is default=%p and it has a next action', async (shouldSelectDefault: boolean, expectedSelectedOptionId: string) => {
        if (shouldSelectDefault) {
            evaluateConditionsMock.mockReturnValue(false)
        }
        else {
            evaluateConditionsMock.mockReturnValueOnce(false).mockReturnValueOnce(true)
        }

        const result = await splitExecutor.handle({
            action: {
                ...action,
                branches: [
                    {
                        optionId: expectedSelectedOptionId,
                        nextAction: buildCodeAction({
                            name: 'echo_step',
                            input: {},
                        }),
                    },
                ],
            },
            executionState: FlowExecutorContext.empty(),
            constants: mockVariableService(action.settings),
        })

        expect(result).toBe('result from flowExecutor')

        expect(executeFlowMock).toHaveBeenCalledTimes(1)
        expect(executeFlowMock).toHaveBeenCalledWith({
            action: buildCodeAction({
                name: 'echo_step',
                input: {},
            }),
            constants: expect.anything(),
            executionState: expect.anything(),
        })
    })
})


function mockVariableService(resolvedInput: unknown) {
    return {
        ...jest.requireActual('packages/engine/src/lib/handler/context/engine-constants'),
        propsResolver: {
            resolve: jest.fn().mockResolvedValue({
                censoredInput: {},
                resolvedInput,
            }),
        },
    }
}
