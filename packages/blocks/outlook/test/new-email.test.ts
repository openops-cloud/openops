import { newEmailTrigger } from '../src/lib/triggers/new-email';

describe('newEmailTrigger', () => {
  it('should have correct trigger configuration', () => {
    expect(newEmailTrigger.name).toBe('new_email');
    expect(newEmailTrigger.displayName).toBe('New Email');
    expect(newEmailTrigger.description).toBe(
      'Triggers when a new email is received with optional filtering',
    );
    expect(newEmailTrigger.type).toBe('POLLING');
  });

  it('should have optional filter properties', () => {
    expect(newEmailTrigger.props.sender.required).toBe(false);
    expect(newEmailTrigger.props.recipients.required).toBe(false);
    expect(newEmailTrigger.props.cc.required).toBe(false);
    expect(newEmailTrigger.props.subject.required).toBe(false);
    expect(newEmailTrigger.props.subjectContains.required).toBe(false);
  });

  it('should have sample data', () => {
    expect(newEmailTrigger.sampleData).toBeDefined();
    expect((newEmailTrigger.sampleData as any).id).toBe('sample-email-id');
    expect((newEmailTrigger.sampleData as any).subject).toBe(
      'Sample Email Subject',
    );
  });
});
