import { createAction, Property } from '@openops/blocks-framework';
import { stripHtml } from 'string-strip-html';

export const stripHtmlContent = createAction({
  name: 'stripHtml',
  displayName: 'Remove HTML Tags',
  description: 'Remove all HTML tags and return plain text',
  isWriteAction: false,
  props: {
    html: Property.LongText({
      displayName: 'HTML Content',
      required: true,
    }),
  },
  async run({ propsValue }) {
    return stripHtml(propsValue.html).result;
  },
});
