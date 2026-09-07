import { faker } from '@faker-js/faker';
import {
  Action,
  ActionType,
  BlockType,
  FlowStatus,
  FlowVersion,
  FlowVersionState,
  openOpsId,
  PackageType,
  PopulatedFlow,
  Trigger,
  TriggerType,
} from '@openops/shared';

export const flowGenerator = {
  simpleActionAndTrigger(): PopulatedFlow {
    return flowGenerator.randomizeMetadata(
      flowVersionGenerator.simpleActionAndTrigger(),
    );
  },
  randomizeMetadata(version: Omit<FlowVersion, 'flowId'>): PopulatedFlow {
    const flowId = openOpsId();
    const result = {
      version: {
        ...version,
        trigger: randomizeTriggerMetadata(version.trigger),
        flowId,
      },
      schedule: null,
      status: faker.helpers.enumValue(FlowStatus),
      id: flowId,
      projectId: openOpsId(),
      folderId: openOpsId(),
      description: faker.lorem.sentence(),
      created: faker.date.recent().toISOString(),
      updated: faker.date.recent().toISOString(),
    };
    return result;
  },
};

const flowVersionGenerator = {
  simpleActionAndTrigger(): Omit<FlowVersion, 'flowId'> {
    return {
      id: openOpsId(),
      displayName: faker.animal.dog(),
      created: faker.date.recent().toISOString(),
      updated: faker.date.recent().toISOString(),
      updatedBy: openOpsId(),
      valid: true,
      trigger: {
        ...randomizeTriggerMetadata(generateTrigger()),
        nextAction: generateAction(),
      },
      description: faker.lorem.sentence(),
      state: FlowVersionState.DRAFT,
    };
  },
};

function randomizeTriggerMetadata(trigger: Trigger): Trigger {
  return {
    ...trigger,
    settings: {
      ...trigger.settings,
      inputUiInfo: {
        server: faker.internet.url(),
        port: faker.color.cmyk(),
        username: faker.internet.username(),
        password: faker.internet.password(),
      },
    },
  };
}
function generateAction(): Action {
  return {
    type: ActionType.BLOCK,
    displayName: faker.hacker.noun(),
    name: openOpsId(),
    settings: {
      packageType: PackageType.REGISTRY,
      blockType: BlockType.OFFICIAL,
      blockName: faker.helpers.arrayElement([
        '@openops/block-schedule',
        '@openops/block-webhook',
      ]),
      blockVersion: faker.system.semver(),
      actionName: faker.hacker.noun(),
      input: {},
      inputUiInfo: {},
    },
    valid: true,
  };
}

function generateTrigger(): Trigger {
  return {
    type: TriggerType.BLOCK,
    displayName: faker.hacker.noun(),
    name: openOpsId(),
    settings: {
      packageType: PackageType.REGISTRY,
      blockType: BlockType.OFFICIAL,
      blockName: faker.helpers.arrayElement([
        '@openops/block-schedule',
        '@openops/block-webhook',
      ]),
      blockVersion: faker.system.semver(),
      triggerName: faker.hacker.noun(),
      input: {},
      inputUiInfo: {},
    },
    valid: true,
  };
}
