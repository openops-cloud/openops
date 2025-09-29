import fs from "fs/promises";
import os from "os";
import path from "path";
import crypto from "crypto";

export async function writeTempFile(content: string, extension = ""): Promise<string> {
  const tmpDir = os.tmpdir();
  const fileName = `oci-${crypto.randomUUID()}${extension}`;
  const filePath = path.join(tmpDir, fileName);
  await fs.writeFile(filePath, content, { mode: 0o600 });
  return filePath;
}

export async function deleteFileSafe(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // Ignore errors like file not existing
  }
}