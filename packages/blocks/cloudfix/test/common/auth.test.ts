import { cloudfixAuth } from '../../src/lib/common/auth';

describe('cloudfixAuth', () => {
  test('should have correct auth configuration', () => {
    expect(cloudfixAuth).toMatchObject({
      required: true,
      authProviderKey: 'cloudfix',
      authProviderDisplayName: 'CloudFix',
      authProviderLogoUrl: 'https://static.openops.com/blocks/cloudfix.png',
    });
  });

  test('should have correct props structure', () => {
    expect(cloudfixAuth.props).toMatchObject({
      apiUrl: {
        required: true,
        type: 'SHORT_TEXT',
      },
      apiKey: {
        required: true,
        type: 'SECRET_TEXT',
      },
    });
  });

  test('should have correct apiUrl configuration', () => {
    expect(cloudfixAuth.props.apiUrl).toMatchObject({
      displayName: 'API URL',
      description: 'The base URL for the CloudFix API',
      required: true,
      defaultValue: 'https://preview.app.cloudfix.com/api/v3',
    });
  });

  test('should have correct apiKey configuration', () => {
    expect(cloudfixAuth.props.apiKey).toMatchObject({
      displayName: 'API Key',
      description: 'The API key to use to connect to CloudFix',
      required: true,
    });
  });

  test('should have markdown documentation', () => {
    expect(cloudfixAuth.description).toContain('To get your CloudFix API key:');
    expect(cloudfixAuth.description).toContain(
      'From the CloudFix app, click on "Settings"',
    );
    expect(cloudfixAuth.description).toContain('API Tokens');
    expect(cloudfixAuth.description).toContain('Create Token');
  });
});
