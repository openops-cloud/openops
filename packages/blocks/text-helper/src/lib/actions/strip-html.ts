import { createAction, Property } from '@openops/blocks-framework';
import { stripHtml } from 'string-strip-html';

export const stripHtmlContent = createAction({
  name: 'stripHtml',
  displayName: 'Remove HTML Tags',
  description: 'Removes every HTML tag and returns plain text',
  requireToolApproval: false,
  props: {
    html: Property.LongText({
      displayName: 'HTML content',
      required: true,
    }),
  },
  async run({ propsValue }) {
    return stripHtml(propsValue.html).result;
  },
});
