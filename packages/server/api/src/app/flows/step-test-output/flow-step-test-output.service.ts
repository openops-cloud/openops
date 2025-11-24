import {
  compressAndEncrypt,
  decryptAndDecompress,
} from '@openops/server-shared';
import {
  EncryptedObject,
  FlowStepTestOutput,
  FlowVersionId,
  OpenOpsId,
  openOpsId,
} from '@openops/shared';
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
    if (input === undefined) {
      input = Buffer.alloc(0);
    }

    if (output === undefined) {
      output = Buffer.alloc(0);
    }

    const compressedInput = await compressAndEncrypt(input);
    const compressedOutput = await compressAndEncrypt(output);

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
  let decryptedInput = await decryptAndDecompress(inputObj);

  if (isEmptyBuffer(decryptedInput)) {
    decryptedInput = undefined;
  }

  const outputObj = record.output as EncryptedObject;
  let decryptedOutput = await decryptAndDecompress(outputObj);

  if (isEmptyBuffer(decryptedOutput)) {
    decryptedOutput = undefined;
  }

  return {
    ...record,
    input: decryptedInput,
    output: decryptedOutput,
  };
}

function isEmptyBuffer(val: unknown): boolean {
  return (
    typeof val === 'object' &&
    val !== null &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (val as any).type === 'Buffer' &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Array.isArray((val as any).data) &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (val as any).data.length === 0
  );
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
