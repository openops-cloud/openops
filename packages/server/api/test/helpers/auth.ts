import { faker } from '@faker-js/faker';
import { openOpsId, Principal, PrincipalType } from '@openops/shared';
import jwt, { Algorithm, JwtPayload, SignOptions } from 'jsonwebtoken';

const generateToken = ({
  payload,
  algorithm = 'HS256',
  key = 'secret',
  keyId = '1',
  issuer = 'OpenOps',
}: GenerateTokenParams): string => {
  const options: SignOptions = {
    algorithm,
    expiresIn: '1h',
    keyid: keyId,
    issuer,
  };

  return jwt.sign(payload, key, options);
};

export const generateMockToken = async (
  principal?: Partial<Principal>,
): Promise<string> => {
  const mockPrincipal: Principal = {
    id: principal?.id ?? openOpsId(),
    type: principal?.type ?? faker.helpers.enumValue(PrincipalType),
    projectId: principal?.projectId ?? openOpsId(),
    organization: principal?.organization ?? {
      id: openOpsId(),
    },
    projectSettings: principal?.projectSettings ?? {},
  };

  return generateToken({
    payload: mockPrincipal,
    issuer: 'OpenOps',
  });
};

export const decodeToken = (token: string): JwtPayload | null => {
  return jwt.decode(token, { json: true });
};

type GenerateTokenParams = {
  payload: Record<string, unknown>;
  algorithm?: Algorithm;
  key?: string;
  keyId?: string;
  issuer?: string;
};
