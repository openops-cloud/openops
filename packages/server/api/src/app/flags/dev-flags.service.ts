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

  flags = [];

  return flags;
}

export const devFlagsService = {
  getOne,
  getAll,
};
