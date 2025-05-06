import { fileCompressor } from '@openops/server-shared';
import {
  FileCompression,
  FlowStepTestOutput,
  FlowVersionId,
  OpenOpsId,
  openOpsId,
} from '@openops/shared';
import { repoFactory } from '../../core/db/repo-factory';
import { encryptUtils } from '../../helper/encryption';
import { FlowStepTestOutputEntity } from './flow-step-test-output-entity';

export const flowStepTestOutputRepo = repoFactory(FlowStepTestOutputEntity);

export const flowStepTestOutputService = {
  async save({
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
      output: compressedOutput,
    };

    return flowStepTestOutputRepo().save(stepOutput);
  },
};

type SaveParams = {
  stepId: OpenOpsId;
  flowVersionId: FlowVersionId;
  output: unknown;
};
