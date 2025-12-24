import { Static, Type } from '@sinclair/typebox';

export const EncryptedObject = Type.Object({
  iv: Type.String(),
  data: Type.String(),
});

export type EncryptedObject = Static<typeof EncryptedObject>;
