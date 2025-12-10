import { ApplicationError } from '@openops/shared';
import {
  AppSystemProp,
  SharedSystemProp,
  system,
} from '../../src/lib/system';

describe('system configuration helpers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith('OPS_')) {
        delete process.env[key];
      }
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns environment values through getOrThrow', () => {
    process.env['OPS_API_KEY'] = 'super-secret';

    expect(system.getOrThrow(AppSystemProp.API_KEY)).toBe('super-secret');
  });

  it('falls back to default values when env is missing', () => {
    expect(system.getOrThrow(SharedSystemProp.LOG_LEVEL)).toBe('info');
  });

  it('throws an ApplicationError when a required value is missing', () => {
    expect(() => system.getOrThrow(AppSystemProp.API_KEY)).toThrow(
      ApplicationError,
    );
  });

  it('parses numeric values and exposes helpers', () => {
    process.env['OPS_MAX_CONCURRENT_JOBS_PER_PROJECT'] = '200';
    process.env['OPS_LOG_PRETTY'] = 'true';

    expect(
      system.getNumberOrThrow(AppSystemProp.MAX_CONCURRENT_JOBS_PER_PROJECT),
    ).toBe(200);
    expect(system.getBoolean(SharedSystemProp.LOG_PRETTY)).toBe(true);
  });

  it('parses comma separated lists and updates configuration hash when values change', () => {
    const baseHash = system.calculateConfigurationHash();

    process.env['OPS_ALLOWED_DOMAINS'] = 'openops.com, example.com';
    process.env['OPS_COMPONENT'] = 'api';

    expect(system.getList(AppSystemProp.ALLOWED_DOMAINS)).toEqual([
      'openops.com',
      'example.com',
    ]);

    const updatedHash = system.calculateConfigurationHash();
    expect(updatedHash).not.toBe(baseHash);
  });

  it('returns null for invalid numeric values', () => {
    process.env['OPS_MAX_CONCURRENT_JOBS_PER_PROJECT'] = 'not-a-number';

    expect(
      system.getNumber(AppSystemProp.MAX_CONCURRENT_JOBS_PER_PROJECT),
    ).toBeNull();
  });
});
