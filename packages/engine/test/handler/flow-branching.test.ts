import { ExecutionVerdict, FlowExecutorContext } from '../../src/lib/handler/context/flow-execution-context'
import { flowExecutor } from '../../src/lib/handler/flow-executor'
import { buildActionWithOneCondition, generateMockEngineConstants } from './test-helper'
import { BranchCondition, BranchOperator } from '@openops/shared'

jest.mock('../../src/lib/services/progress.service', () => ({
    progressService: {
        sendUpdate: jest.fn().mockImplementation(() => Promise.resolve()),
    },
}))

function executeBranchActionWithOneCondition(condition: BranchCondition): Promise<FlowExecutorContext> {
    return flowExecutor.executeFromAction({
        action: buildActionWithOneCondition({
            condition,
        }),
        executionState: FlowExecutorContext.empty(),
        constants: generateMockEngineConstants(),
    })
}
describe('flow with branching different conditions', () => {

    it('should execute branch with text contains condition (case insensitive)', async () => {
        const result = await executeBranchActionWithOneCondition(
            {
                operator: BranchOperator.TEXT_CONTAINS,
                firstValue: 'test',
                secondValue: 'TeSt',
                caseSensitive: false,
            },
        )
        expect(result.verdict).toBe(ExecutionVerdict.RUNNING)
        expect(result.steps.branch.output).toEqual({
            condition: true,
        })
    })

    it('should execute branch with text does not contain condition (case insensitive)', async () => {
        const result = await executeBranchActionWithOneCondition(
            {
                operator: BranchOperator.TEXT_DOES_NOT_CONTAIN,
                firstValue: 'test',
                secondValue: 'ExAmPlE',
                caseSensitive: false,
            },
        )
        expect(result.verdict).toBe(ExecutionVerdict.RUNNING)
        expect(result.steps.branch.output).toEqual({
            condition: true,
        })
    })

    it('should execute branch with text exactly matches condition (case insensitive)', async () => {
        const result = await executeBranchActionWithOneCondition(
            {
                operator: BranchOperator.TEXT_EXACTLY_MATCHES,
                firstValue: 'test',
                secondValue: 'TeSt',
                caseSensitive: false,
            },
        )
        expect(result.verdict).toBe(ExecutionVerdict.RUNNING)
        expect(result.steps.branch.output).toEqual({
            condition: true,
        })
    })

    it('should execute branch with text does not exactly match condition (case insensitive)', async () => {
        const result = await executeBranchActionWithOneCondition(
            {
                operator: BranchOperator.TEXT_DOES_NOT_EXACTLY_MATCH,
                firstValue: 'test',
                secondValue: 'ExAmPlE',
                caseSensitive: false,
            },
        )
        expect(result.verdict).toBe(ExecutionVerdict.RUNNING)
        expect(result.steps.branch.output).toEqual({
            condition: true,
        })
    })

    it('should execute branch with text starts with condition (case insensitive)', async () => {
        const result = await executeBranchActionWithOneCondition(
            {
                operator: BranchOperator.TEXT_STARTS_WITH,
                firstValue: 'test',
                secondValue: 'tE',
                caseSensitive: false,
            },
        )
        expect(result.verdict).toBe(ExecutionVerdict.RUNNING)
        expect(result.steps.branch.output).toEqual({
            condition: true,
        })
    })

    it('should execute branch with text does not start with condition (case insensitive)', async () => {
        const result = await executeBranchActionWithOneCondition(
            {
                operator: BranchOperator.TEXT_DOES_NOT_START_WITH,
                firstValue: 'test',
                secondValue: 'eS',
                caseSensitive: false,
            },
        )
        expect(result.verdict).toBe(ExecutionVerdict.RUNNING)
        expect(result.steps.branch.output).toEqual({
            condition: true,
        })
    })

    it('should execute branch with text ends with condition (case insensitive)', async () => {
        const result = await executeBranchActionWithOneCondition(
            {
                operator: BranchOperator.TEXT_ENDS_WITH,
                firstValue: 'test',
                secondValue: 'sT',
                caseSensitive: false,
            },
        )
        expect(result.verdict).toBe(ExecutionVerdict.RUNNING)
        expect(result.steps.branch.output).toEqual({
            condition: true,
        })
    })

    it('should execute branch with text does not end with condition (case insensitive)', async () => {
        const result = await executeBranchActionWithOneCondition(
            {
                operator: BranchOperator.TEXT_DOES_NOT_END_WITH,
                firstValue: 'test',
                secondValue: 'eS',
                caseSensitive: false,
            },
        )
        expect(result.verdict).toBe(ExecutionVerdict.RUNNING)
        expect(result.steps.branch.output).toEqual({
            condition: true,
        })
    })

    it('should execute branch with text contains condition', async () => {
        const result = await executeBranchActionWithOneCondition(
            {
                operator: BranchOperator.TEXT_CONTAINS,
                firstValue: 'test',
                secondValue: 'test',
                caseSensitive: true,
            },
        )
        expect(result.verdict).toBe(ExecutionVerdict.RUNNING)
        expect(result.steps.branch.output).toEqual({
            condition: true,
        })
    })

    it('should execute branch with text does not contain condition', async () => {
        const result = await executeBranchActionWithOneCondition(
            {
                operator: BranchOperator.TEXT_DOES_NOT_CONTAIN,
                firstValue: 'test',
                secondValue: 'example',
                caseSensitive: true,
            },
        )
        expect(result.verdict).toBe(ExecutionVerdict.RUNNING)
        expect(result.steps.branch.output).toEqual({
            condition: true,
        })
    })

    it('should execute branch with text exactly matches condition', async () => {
        const result = await executeBranchActionWithOneCondition(
            {
                operator: BranchOperator.TEXT_EXACTLY_MATCHES,
                firstValue: 'test',
                secondValue: 'test',
                caseSensitive: true,
            },
        )
        expect(result.verdict).toBe(ExecutionVerdict.RUNNING)
        expect(result.steps.branch.output).toEqual({
            condition: true,
        })
    })

    it('should execute branch with text does not exactly match condition', async () => {
        const result = await executeBranchActionWithOneCondition(
            {
                operator: BranchOperator.TEXT_DOES_NOT_EXACTLY_MATCH,
                firstValue: 'test',
                secondValue: 'example',
                caseSensitive: true,
            },
        )
        expect(result.verdict).toBe(ExecutionVerdict.RUNNING)
        expect(result.steps.branch.output).toEqual({
            condition: true,
        })
    })

    it('should execute branch with text starts with condition', async () => {
        const result = await executeBranchActionWithOneCondition(
            {
                operator: BranchOperator.TEXT_STARTS_WITH,
                firstValue: 'test',
                secondValue: 'te',
                caseSensitive: true,
            },
        )
        expect(result.verdict).toBe(ExecutionVerdict.RUNNING)
        expect(result.steps.branch.output).toEqual({
            condition: true,
        })
    })

    it('should execute branch with text does not start with condition', async () => {
        const result = await executeBranchActionWithOneCondition(
            {
                operator: BranchOperator.TEXT_DOES_NOT_START_WITH,
                firstValue: 'test',
                secondValue: 'es',
                caseSensitive: true,
            },
        )
        expect(result.verdict).toBe(ExecutionVerdict.RUNNING)
        expect(result.steps.branch.output).toEqual({
            condition: true,
        })
    })

    it('should execute branch with text ends with condition', async () => {
        const result = await executeBranchActionWithOneCondition(
            {
                operator: BranchOperator.TEXT_ENDS_WITH,
                firstValue: 'test',
                secondValue: 'st',
                caseSensitive: true,
            },
        )
        expect(result.verdict).toBe(ExecutionVerdict.RUNNING)
        expect(result.steps.branch.output).toEqual({
            condition: true,
        })
    })

    it('should execute branch with text does not end with condition', async () => {
        const result = await executeBranchActionWithOneCondition(
            {
                operator: BranchOperator.TEXT_DOES_NOT_END_WITH,
                firstValue: 'test',
                secondValue: 'es',
                caseSensitive: true,
            },
        )
        expect(result.verdict).toBe(ExecutionVerdict.RUNNING)
        expect(result.steps.branch.output).toEqual({
            condition: true,
        })
    })

    it('should execute branch with exists condition', async () => {
        const result = await executeBranchActionWithOneCondition(
            {
                operator: BranchOperator.EXISTS,
                firstValue: 'test',
            },
        )
        expect(result.verdict).toBe(ExecutionVerdict.RUNNING)
        expect(result.steps.branch.output).toEqual({
            condition: true,
        })
    })

    it('should execute branch with does not exist condition', async () => {
        const result = await executeBranchActionWithOneCondition(
            {
                operator: BranchOperator.DOES_NOT_EXIST,
                firstValue: '',
            },
        )
        expect(result.verdict).toBe(ExecutionVerdict.RUNNING)
        expect(result.steps.branch.output).toEqual({
            condition: true,
        })
    })

    it('should execute branch with boolean is true condition', async () => {
        const result = await executeBranchActionWithOneCondition(
            {
                operator: BranchOperator.BOOLEAN_IS_TRUE,
                firstValue: 'true',
            },
        )
        expect(result.verdict).toBe(ExecutionVerdict.RUNNING)
        expect(result.steps.branch.output).toEqual({
            condition: true,
        })
    })

    it('should execute branch with boolean is false condition', async () => {
        const result = await executeBranchActionWithOneCondition(
            {
                operator: BranchOperator.BOOLEAN_IS_FALSE,
                firstValue: '{{false}}',
            },
        )
        expect(result.verdict).toBe(ExecutionVerdict.RUNNING)
        expect(result.steps.branch.output).toEqual({
            condition: true,
        })
    })

    it('should execute branch with two equal numbers', async () => {
        const result = await executeBranchActionWithOneCondition(
            {
                operator: BranchOperator.NUMBER_IS_EQUAL_TO,
                firstValue: '1',
                secondValue: '1',
            },
        )
        expect(result.verdict).toBe(ExecutionVerdict.RUNNING)
        expect(result.steps.branch.output).toEqual({
            condition: true,
        })
    })

    it('should execute branch with the first number greater than the second one', async () => {
        const result = await executeBranchActionWithOneCondition(
            {
                operator: BranchOperator.NUMBER_IS_GREATER_THAN,
                firstValue: '2',
                secondValue: '1',
            },
        )
        expect(result.verdict).toBe(ExecutionVerdict.RUNNING)
        expect(result.steps.branch.output).toEqual({
            condition: true,
        })
    })

    it('should execute branch with the first number less than the second one', async () => {
        const result = await executeBranchActionWithOneCondition(
            {
                operator: BranchOperator.NUMBER_IS_LESS_THAN,
                firstValue: '1',
                secondValue: '2',
            },
        )
        expect(result.verdict).toBe(ExecutionVerdict.RUNNING)
        expect(result.steps.branch.output).toEqual({
            condition: true,
        })
    })
})
