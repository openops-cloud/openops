import { buildWrapperUrl } from '../src/lib/build-wrapper-url';
import { parseFollowUpForm } from '../src/lib/follow-up-form';

const baseParams = {
  frontendUrl: 'https://app.openops.com',
  isTest: false,
  resumeUrl:
    'https://api.openops.com/v1/flow-runs/run-1/requests/pause-1?button=Not%20mine&path=step_1',
};

const encodedResumeUrl = encodeURIComponent(baseParams.resumeUrl);

const form = parseFollowUpForm({
  title: 'Request an exception',
  subtitle: 'sqlserver-rds-dev',
  fields: [
    {
      name: 'reason',
      label: 'Exception reason',
      type: 'select',
      options: ['VendorSet', 'Decommissioning'],
    },
    { name: 'justification', label: 'Justification', type: 'textarea' },
  ],
});

// Mirrors how collect_input.html reads the form param.
function readForm(url: string): { title?: string } {
  const encoded = new URL(url).searchParams.get('form') ?? '';
  return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
}

describe('buildWrapperUrl', () => {
  test('uses the resume page for a button without a form', () => {
    const url = buildWrapperUrl(baseParams);

    expect(url).toBe(
      `https://app.openops.com/html/resume_execution.html?isTest=false&redirectUrl=${encodedResumeUrl}`,
    );
  });

  test('uses the collect-input page and carries the whole form in one param', () => {
    const url = buildWrapperUrl({ ...baseParams, form });

    const parsed = new URL(url);
    expect(parsed.origin).toBe('https://app.openops.com');
    expect(parsed.pathname).toBe('/html/collect_input.html');
    expect([...parsed.searchParams.keys()]).toEqual([
      'isTest',
      'form',
      'redirectUrl',
    ]);
    expect(parsed.searchParams.get('form')).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(parsed.searchParams.get('redirectUrl')).toBe(baseParams.resumeUrl);
    expect(readForm(url)).toEqual(form);
  });

  test('keeps non-Latin text intact', () => {
    const url = buildWrapperUrl({
      ...baseParams,
      form: { ...form, subtitle: 'ресурс – 資源' },
    });

    expect(readForm(url)).toEqual({ ...form, subtitle: 'ресурс – 資源' });
  });

  test('cuts a long form heading so the link stays within Slack limits', () => {
    const url = buildWrapperUrl({
      ...baseParams,
      form: { ...form, title: 'x'.repeat(400) },
    });

    const title = readForm(url).title ?? '';
    expect(title).toHaveLength(150);
    expect(title.endsWith('…')).toBe(true);
  });

  test.each([true, false])('passes isTest=%p through', (isTest) => {
    expect(buildWrapperUrl({ ...baseParams, isTest })).toContain(
      `isTest=${isTest}`,
    );
    expect(buildWrapperUrl({ ...baseParams, isTest, form })).toContain(
      `isTest=${isTest}`,
    );
  });
});
