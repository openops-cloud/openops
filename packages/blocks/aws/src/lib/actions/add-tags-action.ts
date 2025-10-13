import { createAction, Property } from '@openops/blocks-framework';
import {
  addTagsToResources,
  amazonAuth,
  convertToARNArrayWithValidation,
  dryRunCheckBox,
  getARNsProperty,
  getCredentialsForAccount,
  groupARNsByAccount,
  tryParseJson,
} from '@openops/common';
import { isObject, RiskLevel } from '@openops/shared';

export const addTagsAction = createAction({
  auth: amazonAuth,
  name: 'add_tags_to_resources',
  description: 'Add tags to the given resources',
  displayName: 'Tag Resources',
  riskLevel: RiskLevel.HIGH,
  IsWriteAction: true,
  props: {
    resourceARNs: getARNsProperty(),
    tags: Property.Object({
      displayName: 'Tags',
      description: 'Name and value of the tag to be added',
      required: true,
    }),
    dryRun: dryRunCheckBox(),
  },
  async run(context) {
    try {
      const { dryRun } = context.propsValue;

      if (dryRun) {
        return `Step execution skipped, dry run flag enabled.`;
      }

      const arns = convertToARNArrayWithValidation(
        context.propsValue.resourceARNs,
      );
      const tags = convertToRecordString(context.propsValue.tags);
      const groupedARNs = groupARNsByAccount(arns);

      const promises = [];

      for (const accountId in groupedARNs) {
        const arnsForAccount = groupedARNs[accountId];
        const credentials = await getCredentialsForAccount(
          context.auth,
          accountId,
        );
        promises.push(addTagsToResources(arnsForAccount, tags, credentials));
      }

      const resources = await Promise.all(promises);

      return resources.flat();
    } catch (error) {
      throw new Error(
        'An error occurred while adding tags to the resources: ' + error,
      );
    }
  },
});

function convertToRecordString(input: unknown): Record<string, string> {
  const output: Record<string, string> = {};

  let tags = input;
  if (typeof input === 'string') {
    tags = tryParseJson(input);
  }

  if (!isObject(tags)) {
    throw new Error('The provided tags must be in key-value format');
  }

  const entries = Object.entries(tags);
  if (!entries.length) {
    throw new Error('Record with tags should not be empty');
  }

  entries.forEach(([key, value]) => {
    output[key] = String(value);
  });

  return output;
}
