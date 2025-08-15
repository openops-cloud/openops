import { HttpMethod } from '@openops/blocks-common';
import { makeRequest } from './make-request';

export async function getEnumValues(
  endpoint: string,
  enumName: string,
): Promise<string[]> {
  const spec = await makeRequest({
    endpoint: '/swagger.json',
    auth: '',
    method: HttpMethod.GET,
  });

  const params = spec.paths[endpoint].get.parameters;
  const param = params.find((p: any) => p.name === enumName);
  const values: string[] = param.enum;

  return values;
}
