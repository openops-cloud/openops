import { vantage } from '../src/index';
import { vantageAuth } from '../src/lib/auth';

describe('block declaration tests', () => {
  test('should return block with correct authentication', () => {
    expect(vantageAuth).toMatchObject({
      type: 'SECRET_TEXT',
      required: true,
      authProviderKey: 'vantage',
      authProviderDisplayName: 'Vantage',
      authProviderLogoUrl: 'https://static.openops.com/blocks/vantage.png',
    });
  });

  test('should return block with correct number of actions', () => {
    expect(Object.keys(vantage.actions()).length).toBe(1);
    expect(vantage.actions()).toMatchObject({
      custom_api_call: {
        name: 'custom_api_call',
        requireAuth: true,
      },
    });
  });
});
