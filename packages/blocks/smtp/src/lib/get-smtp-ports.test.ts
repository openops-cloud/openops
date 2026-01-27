import { SharedSystemProp, system } from '@openops/server-shared';
import { getSmtpPortsOptions } from './get-smtp-ports';

jest.mock('@openops/server-shared', () => ({
  ...jest.requireActual('@openops/server-shared'),
  system: {
    getOrThrow: jest.fn(),
  },
}));

describe('getSmtpPortsOptions', () => {
  it('should return valid options when valid ports are provided', () => {
    (system.getOrThrow as jest.Mock).mockReturnValue('25, 465, 587');

    const result = getSmtpPortsOptions();

    expect(result).toEqual({
      disabled: false,
      error: undefined,
      options: [
        { label: '25', value: 25 },
        { label: '465', value: 465 },
        { label: '587', value: 587 },
      ],
    });
    expect(system.getOrThrow).toHaveBeenCalledWith(
      SharedSystemProp.SMTP_ALLOWED_PORTS,
    );
  });

  it('should filter out invalid ports and return only valid ones', () => {
    (system.getOrThrow as jest.Mock).mockReturnValue(
      '25, abc, 0, 70000, 587, 25.5',
    );

    const result = getSmtpPortsOptions();

    expect(result.options).toEqual([
      { label: '25', value: 25 },
      { label: '587', value: 587 },
    ]);
  });

  it('should return disabled state and error message when no valid ports are provided', () => {
    (system.getOrThrow as jest.Mock).mockReturnValue('abc, -1, 0, 99999');

    const result = getSmtpPortsOptions();

    expect(result).toEqual({
      disabled: true,
      error:
        'Invalid value for OPS_SMTP_ALLOWED_PORTS. At least one valid TCP port (1-65535) must be configured.',
      options: [],
    });
  });

  it('should return disabled state and error message when the input is empty or contains only separators', () => {
    (system.getOrThrow as jest.Mock).mockReturnValue(' , ,, ');

    const result = getSmtpPortsOptions();

    expect(result.disabled).toBe(true);
    expect(result.error).toBeDefined();
    expect(result.options).toEqual([]);
  });
});
