import { DropdownState } from '@openops/blocks-framework';
import { SharedSystemProp, system } from '@openops/server-shared';

const getSMTPPorts = (): number[] | undefined => {
  const raw = system.getOrThrow(SharedSystemProp.SMTP_ALLOWED_PORTS);
  const ports = raw
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => Number(p))
    .filter((port) => Number.isInteger(port) && port > 0 && port <= 65535);

  if (ports.length === 0) {
    return undefined;
  }

  return ports;
};

export function getSmtpPortsOptions(): DropdownState<number> {
  const ports = getSMTPPorts();

  return {
    disabled: !ports,
    error: ports
      ? undefined
      : 'Invalid value for OPS_SMTP_ALLOWED_PORTS. At least one valid TCP port (1-65535) must be configured.',
    options: ports
      ? ports.map((port) => {
          return {
            label: port.toString(),
            value: port,
          };
        })
      : [],
  };
}
