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
      id: FlagId.CODE_WITH_AI,
      value: false,
      created,
      updated,
    },
    {
      id: FlagId.SHOW_CHAT_IN_RESIZABLE_PANEL,
      value: false,
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
