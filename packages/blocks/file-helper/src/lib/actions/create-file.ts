import { createAction, Property } from '@openops/blocks-framework';

export const createFile = createAction({
  name: 'createFile',
  displayName: 'Create file',
  description: 'Create file from UTF-8 content',
  requireToolApproval: false,
  props: {
    content: Property.LongText({ displayName: 'Content', required: true }),
    fileName: Property.ShortText({ displayName: 'File name', required: true }),
  },
  async run({ propsValue, files }) {
    const fileUrl = await files.write({
      fileName: propsValue.fileName,
      data: Buffer.from(propsValue.content, 'utf-8'),
    });
    return { fileName: propsValue.fileName, url: fileUrl };
  },
});
