import { fileCompressor } from '@openops/server-shared';
import {
  FileCompression,
  FlowStepTestOutput,
  OpenOpsId,
  openOpsId,
} from '@openops/shared';
import { repoFactory } from '../../core/db/repo-factory';
import { encryptUtils } from '../../helper/encryption';
import { FlowStepTestOutputEntity } from './flow-step-test-output-entity';

export const flowStepTestOutputRepo = repoFactory(FlowStepTestOutputEntity);

export const flowStepTestOutputService = {
  async save({
    outputId,
    stepId,
    flowVersionId,
    output,
  }: SaveParams): Promise<FlowStepTestOutput> {
    const encryptOutput = encryptUtils.encryptObject(output);
    const binaryOutput = Buffer.from(JSON.stringify(encryptOutput));

    const compressedOutput = await fileCompressor.compress({
      data: binaryOutput,
      compression: FileCompression.GZIP,
    });

    const stepOutput = {
      id: outputId ?? openOpsId(),
      stepId,
      flowVersionId,
      output: compressedOutput,
    };

    return flowStepTestOutputRepo().save(stepOutput);
  },
};

type SaveParams = {
  outputId?: OpenOpsId | undefined;
  // TODO: remove optional
  stepId?: OpenOpsId | undefined;
  flowVersionId: OpenOpsId;
  output: unknown;
};
