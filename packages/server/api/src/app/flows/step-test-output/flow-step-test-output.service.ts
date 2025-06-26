import {
  decompressAndDecrypt,
  encryptAndCompress,
} from '@openops/server-shared';
import {
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
  }: SaveParams): Promise<FlowStepTestOutput> {
    let compressedInput = Buffer.alloc(0);
    let compressedOutput = Buffer.alloc(0);
    if (output !== undefined) {
      compressedOutput = await encryptAndCompress(output);
    }
    if (input !== undefined) {
      compressedInput = await encryptAndCompress(input);
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
  const inputBuffer = record.input as Buffer;
  let decryptedInput = undefined;
  if (inputBuffer.length !== 0) {
    decryptedInput = await decompressAndDecrypt(inputBuffer);
  }
  
  const outputBuffer = record.output as Buffer;
  let decryptedOutput = undefined;
  if (outputBuffer.length !== 0) {
    decryptedOutput = await decompressAndDecrypt(outputBuffer);
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
};
