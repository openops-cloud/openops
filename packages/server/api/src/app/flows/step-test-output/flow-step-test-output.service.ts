import {
  compressAndEncrypt,
  decryptAndDecompress,
  EncryptedObject,
} from '@openops/server-shared';
import {
  FlowStepTestOutput,
  FlowVersionId,
  OpenOpsId,
  openOpsId,
} from '@openops/shared';
import { isEmptyObject } from '@tiptap/react';
import { In } from 'typeorm';
import { repoFactory } from '../../core/db/repo-factory';
import { FlowStepTestOutputEntity } from './flow-step-test-output-entity';

const flowStepTestOutputRepo = repoFactory(FlowStepTestOutputEntity);

export const flowStepTestOutputService = {
  async save({
    stepId,
    flowVersionId,
    input,
    output,
    success,
  }: SaveParams): Promise<FlowStepTestOutput> {
    let compressedInput = {};
    let compressedOutput = {};
    if (output !== undefined) {
      compressedOutput = await compressAndEncrypt(output);
    }

    if (input !== undefined) {
      compressedInput = await compressAndEncrypt(input);
    }

    const existing = await flowStepTestOutputRepo().findOneBy({
      stepId,
      flowVersionId,
    });

    let outputId = openOpsId();
    if (existing) {
      outputId = existing.id;
    }

    const stepOutput = {
      id: outputId,
      stepId,
      flowVersionId,
      input: compressedInput,
      output: compressedOutput,
      success,
    };

    return flowStepTestOutputRepo().save(stepOutput);
  },

  async copyFromVersion({
    fromVersionId,
    toVersionId,
  }: {
    fromVersionId: FlowVersionId;
    toVersionId: FlowVersionId;
  }): Promise<void> {
    const previousEntries = await flowStepTestOutputRepo().findBy({
      flowVersionId: fromVersionId,
    });

    await Promise.all(
      previousEntries.map((previous) =>
        flowStepTestOutputRepo().save({
          stepId: previous.stepId,
          flowVersionId: toVersionId,
          input: previous.input,
          output: previous.output,
          id: openOpsId(),
        }),
      ),
    );
  },

  async listDecrypted(params: ListParams): Promise<FlowStepTestOutput[]> {
    const flowStepTestOutputs = await flowStepTestOutputRepo().findBy({
      flowVersionId: params.flowVersionId,
      stepId: In(params.stepIds),
    });

    return Promise.all(flowStepTestOutputs.map(decompressOutput));
  },

  async listEncrypted(params: ListParams): Promise<FlowStepTestOutput[]> {
    return flowStepTestOutputRepo().findBy({
      flowVersionId: params.flowVersionId,
      stepId: In(params.stepIds),
    });
  },
};

async function decompressOutput(
  record: FlowStepTestOutput,
): Promise<FlowStepTestOutput> {
  const inputObj = record.input as EncryptedObject;
  let decryptedInput = undefined;
  if (!isEmptyObject(inputObj)) {
    decryptedInput = await decryptAndDecompress(inputObj);
  }

  const outputObj = record.output as EncryptedObject;
  let decryptedOutput = undefined;
  if (!isEmptyObject(outputObj)) {
    decryptedOutput = await decryptAndDecompress(outputObj);
  }

  return {
    ...record,
    input: decryptedInput,
    output: decryptedOutput,
  };
}

type ListParams = {
  flowVersionId: FlowVersionId;
  stepIds: OpenOpsId[];
};

type SaveParams = {
  stepId: OpenOpsId;
  flowVersionId: FlowVersionId;
  input: unknown;
  output: unknown;
  success: boolean;
};
