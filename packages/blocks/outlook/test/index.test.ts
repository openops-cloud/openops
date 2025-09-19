import { outlook } from '../src';

describe('Outlook Block', () => {
  it('should be properly configured', () => {
    expect(outlook.displayName).toBe('Microsoft Outlook');
    expect(outlook.description).toBe(
      'Integration with Microsoft Outlook/Office 365 for email operations',
    );
    expect(outlook.categories).toContain('COLLABORATION');
    expect(outlook.authors).toContain('OpenOps');
  });

  it('should have newEmailTrigger', () => {
    const trigger = outlook.getTrigger('new_email');
    expect(trigger).toBeDefined();
    expect(trigger?.displayName).toBe('New Email');
  });

  it('should have custom API call action', () => {
    const actions = outlook.actions();
    expect(Object.keys(actions)).toContain('custom_api_call');
  });
});
