import { FlowVersion, GenericStepOutput, OpenOpsId, StepOutput, StepOutputStatus, TriggerType } from '@openops/shared';

const MAX_RUN_SIZE = 10
const ONE_MB_IN_BYTES = 1024 * 1024
jest.mock('@openops/server-shared', () => ({
  MAX_REQUEST_BODY_WITH_BUFFER_MB: MAX_RUN_SIZE,
  ONE_MB_IN_BYTES: ONE_MB_IN_BYTES,
}))

const sizeofMock = jest.fn();
jest.mock('object-sizeof', () => sizeofMock)

import { isSizeValidationError, validateExecutionSize } from '../../src/lib/helper/size-validation'

describe('isSizeValidationError', () => {
  it('should return true when error message includes the base message', () => {
    const result = isSizeValidationError('Workflow output size exceeds maximum allowed size. Additional details...')
    expect(result).toBe(true)
  })

  it('should return false when error message does not include the base message', () => {
    const result = isSizeValidationError('Some other error message')
    expect(result).toBe(false)
  })

  it('should return false when error message is undefined', () => {
    const result = isSizeValidationError()
    expect(result).toBe(false)
  })
})

describe('validateExecutionSize', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  })

  it('should return isValid true when size is within limits', () => {
    const mockSteps: Record<string, StepOutput> = {
      step1: createStepOutput('small output'),
      step2: createStepOutput('another small output'),
    }

    const mockSize = (MAX_RUN_SIZE - 1) * ONE_MB_IN_BYTES;
    sizeofMock.mockReturnValue(mockSize)

    const result = validateExecutionSize(mockSteps)

    expect(result).toEqual({ isValid: true })
    expect(sizeofMock).toHaveBeenCalledWith(mockSteps)
  })

  it('should return isValid false with error message when size exceeds limits', () => {
    const mockSteps: Record<string, StepOutput> = {
      step1: createStepOutput('large output'),
      step2: createStepOutput('another large output'),
    }

    const mockSize = (MAX_RUN_SIZE + 1) * ONE_MB_IN_BYTES;
    sizeofMock.mockReturnValue(mockSize)

    const result = validateExecutionSize(mockSteps)

    expect(result).toEqual({
      isValid: false,
      errorMessage: expect.stringContaining('Workflow output size exceeds maximum allowed size')
    })
    expect(sizeofMock).toHaveBeenCalledWith(mockSteps)
  })

  it('should handle flowVersion and stepTestOutputs input type', () => {
    const mockFlowVersion: FlowVersion = { id: '123' } as FlowVersion
    const mockStepTestOutputs: Record<OpenOpsId, unknown> = {
      'step1': { data: 'test data' },
      'step2': { data: 'more test data' }
    }

    const mockInput = {
      flowVersion: mockFlowVersion,
      stepTestOutputs: mockStepTestOutputs
    }

    const mockSize = (MAX_RUN_SIZE + 1) * ONE_MB_IN_BYTES;
    sizeofMock.mockReturnValue(mockSize)

    const result = validateExecutionSize(mockInput)

    expect(result).toEqual({
      isValid: false,
      errorMessage: expect.stringContaining('Workflow output size exceeds maximum allowed size')
    })
    expect(sizeofMock).toHaveBeenCalledWith(mockInput)
  })

  it('should extract stepTestOutputs for error message when using flowVersion input type', () => {
    const mockFlowVersion: FlowVersion = { id: '123' } as FlowVersion
    const mockStepTestOutputs: Record<OpenOpsId, unknown> = {
      'step1': { data: 'test data' },
      'step2': { data: 'more test data' }
    }

    const mockInput = {
      flowVersion: mockFlowVersion,
      stepTestOutputs: mockStepTestOutputs
    }

    const mockSize = (MAX_RUN_SIZE + 1) * ONE_MB_IN_BYTES;
    sizeofMock.mockReturnValue(mockSize)

    const result = validateExecutionSize(mockInput)

    expect(result.isValid).toBe(false)
    if(!result.isValid){
      expect(result.errorMessage).toContain('step1')
      expect(result.errorMessage).toContain('step2')
    }
  })
})

function createStepOutput(output: unknown): StepOutput{
  return GenericStepOutput.create({
    type: TriggerType.BLOCK,
    status: StepOutputStatus.SUCCEEDED,
    input: {},
    output,
  });
}
