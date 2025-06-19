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
      id: FlagId.USE_NEW_EXTERNAL_TESTDATA,
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
