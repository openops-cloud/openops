import { Client } from '@microsoft/microsoft-graph-client';

export async function parseMsPaginatedData<T, O>(
  client: Client,
  response: any,
  options: O[],
  fn: (options: O[], elem: T) => void,
) {
  while (response.value.length > 0) {
    for (const elem of response.value as T[]) {
      fn(options, elem);
    }

    if (response['@odata.nextLink']) {
      response = await client.api(response['@odata.nextLink']).get();
    } else {
      break;
    }
  }
}
