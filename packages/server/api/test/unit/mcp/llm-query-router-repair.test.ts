import {
  normalizeToolNames,
  repairText,
} from '../../../src/app/ai/mcp/llm-query-router';

describe('normalizeToolNames', () => {
  it('should return array as-is when input is already an array', () => {
    expect(normalizeToolNames(['Tool1', 'Tool2'])).toEqual(['Tool1', 'Tool2']);
  });

  it('should split comma-separated string into array and trim whitespace', () => {
    expect(normalizeToolNames('Tool1, Tool2, Tool3')).toEqual([
      'Tool1',
      'Tool2',
      'Tool3',
    ]);
  });

  it('should return empty array for invalid input', () => {
    expect(normalizeToolNames(null)).toEqual([]);
    expect(normalizeToolNames(undefined)).toEqual([]);
  });
});

describe('repairText', () => {
  it('should handle tool_names as comma-separated string (bug fix)', () => {
    const input = JSON.stringify({
      tool_names: 'Get_Run_Details, Get_Latest_Flow_Version_By_Id',
      query_classification: ['openops', 'run_investigation'],
      reasoning: 'Some reasoning',
      user_facing_reasoning: 'User facing reasoning',
    });

    const result = repairText(input);
    const parsed = JSON.parse(result || '{}');

    expect(parsed.tool_names).toEqual([
      'Get_Run_Details',
      'Get_Latest_Flow_Version_By_Id',
    ]);
  });

  it('should handle tool_names as an array (correct format)', () => {
    const input = JSON.stringify({
      tool_names: ['Tool1', 'Tool2'],
      query_classification: ['general'],
      reasoning: 'Some reasoning',
      user_facing_reasoning: 'User facing reasoning',
    });

    const result = repairText(input);
    const parsed = JSON.parse(result || '{}');

    expect(parsed.tool_names).toEqual(['Tool1', 'Tool2']);
  });

  it('should return null for invalid JSON', () => {
    expect(repairText('not valid json')).toBeNull();
  });
});
