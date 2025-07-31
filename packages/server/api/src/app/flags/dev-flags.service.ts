import { AppSystemProp, system } from '@openops/server-shared';
import { Flag, FlagId } from '@openops/shared';

let flags: Flag[];

async function getOne(flagId: FlagId): Promise<Flag | undefined> {
  const flags = await getAll();

  return flags.find((flag) => flag.id === flagId);
}

async function getAll(): Promise<Flag[]> {
  if (flags) {
    return flags;
  }

  const now = new Date().toISOString();
  const created = now;
  const updated = now;

  flags = [
    {
      id: FlagId.ASSISTANT_UI_ENABLED,
      value: true,
      created,
      updated,
    },
  ];

  return flags;
}

export const devFlagsService = {
  getOne,
  getAll,
};
