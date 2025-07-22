import { getReportAction } from '../../src/lib/actions/get-report-action';

describe('getReportAction', () => {
  test('should create action with correct properties', () => {
    expect(getReportAction.props).toMatchObject({
      recommendationId: {
        required: true,
        type: 'SHORT_TEXT',
      },
    });
  });

  test('should have correct action metadata', () => {
    expect(getReportAction.name).toBe('cloudfix_get_report');
    expect(getReportAction.displayName).toBe('Get Report');
    expect(getReportAction.description).toBe(
      'Get a report for a specific recommendation.',
    );
    expect(getReportAction.requireAuth).toBe(true);
  });

  test('should have correct recommendationId description', () => {
    expect(getReportAction.props.recommendationId.description).toBe(
      'The ID of the recommendation to get a report for',
    );
  });
});
