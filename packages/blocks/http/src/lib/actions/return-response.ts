import {
  DynamicPropsValue,
  Property,
  createAction,
} from '@openops/blocks-framework';
import { EngineHttpResponse } from '@openops/shared';
import { StatusCodes } from 'http-status-codes';

export const httpReturnResponse = createAction({
  name: 'return_response',
  displayName: 'Send Webhook Response',
  description: 'Send a response to the webhook caller.',
  isWriteAction: false,
  props: {
    status: Property.Number({
      displayName: 'Status',
      required: false,
      defaultValue: 200,
    }),
    headers: Property.Object({
      displayName: 'Headers',
      required: false,
    }),
    body_type: Property.StaticDropdown({
      displayName: 'Body Type',
      required: false,
      defaultValue: 'json',
      options: {
        disabled: false,
        options: [
          {
            label: 'JSON',
            value: 'json',
          },
          {
            label: 'Raw',
            value: 'raw',
          },
        ],
      },
    }),
    body: Property.DynamicProperties({
      displayName: 'Response',
      refreshers: ['body_type'],
      required: true,
      props: async ({ body_type }) => {
        if (!body_type) return {};

        const bodyTypeInput = body_type as unknown as string;

        const fields: DynamicPropsValue = {};

        switch (bodyTypeInput) {
          case 'json':
            fields['data'] = Property.Json({
              displayName: 'JSON Body',
              required: true,
            });
            break;
          case 'raw':
            fields['data'] = Property.LongText({
              displayName: 'Raw Body',
              required: true,
            });
            break;
        }
        return fields;
      },
    }),
  },

  async run(context) {
    const { status, body, body_type, headers } = context.propsValue;
    const bodyInput = body['data'];

    const response: EngineHttpResponse = {
      status: status ?? StatusCodes.OK,
      headers: (headers as Record<string, string>) ?? {},
      body: {},
    };

    if (body_type == 'json') {
      response.body = praseToJson(bodyInput);
    } else {
      response.body = bodyInput;
    }

    await context.run.sendWebhookResponse(response);

    return response;
  },
});

function praseToJson(body: unknown) {
  if (typeof body === 'string') {
    return JSON.parse(body);
  }
  return JSON.parse(JSON.stringify(body));
}
