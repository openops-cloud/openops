import {
  AuthenticationType,
  httpClient,
  HttpMethod,
  HttpRequest,
} from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { slackAuth } from '../common/authentication';

export const uploadFile = createAction({
  auth: slackAuth,
  name: 'uploadFile',
  displayName: 'Upload file',
  description: 'Upload file without sharing it to a channel or user',
  requireToolApproval: true,
  props: {
    file: Property.File({
      displayName: 'Attachment',
      required: true,
    }),
    title: Property.ShortText({
      displayName: 'Title',
      required: false,
    }),
  },
  async run(context) {
    const token = context.auth.access_token;
    const { file, title } = context.propsValue;
    const formData = new FormData();
    formData.append('file', new Blob([file.data]));
    if (title !== undefined) {
      formData.append('title', title);
    }

    const request: HttpRequest = {
      url: `https://slack.com/api/files.upload`,
      method: HttpMethod.POST,
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      authentication: {
        type: AuthenticationType.BEARER_TOKEN,
        token,
      },
    };
    const response = await httpClient.sendRequest(request);
    if (!response.body.ok) {
      throw new Error(response.body.error);
    }
    return response.body;
  },
});
