import { EncryptedObject, isNil } from '@openops/shared';
import * as crypto from 'crypto';
import { AppSystemProp, system } from '../system';

let encryptionKey: string | null;
const algorithm = 'aes-256-cbc';
const ivLength = 16;

const loadEncryptionKey = (): string => {
  if (isNil(encryptionKey)) {
    encryptionKey = system.getOrThrow(AppSystemProp.ENCRYPTION_KEY);
  }

  return encryptionKey;
};

function encryptString(inputString: string): EncryptedObject {
  const secret = loadEncryptionKey();
  const iv = crypto.randomBytes(ivLength); // Generate a random initialization vector
  const key = Buffer.from(secret, 'binary');
  const cipher = crypto.createCipheriv(algorithm, key, iv); // Create a cipher with the key and initialization vector
  let encrypted = cipher.update(inputString, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    iv: iv.toString('hex'),
    data: encrypted,
  };
}

function encryptObject(object: unknown): EncryptedObject {
  const objectString = JSON.stringify(object); // Convert the object to a JSON string
  return encryptString(objectString);
}

function encryptBuffer(inputBuffer: Buffer): EncryptedObject {
  const secret = loadEncryptionKey();
  const iv = crypto.randomBytes(ivLength);
  const key = Buffer.from(secret, 'binary');
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(inputBuffer).toString('hex');
  encrypted += cipher.final('hex');
  return {
    iv: iv.toString('hex'),
    data: encrypted,
  };
}

function decryptObject<T>(encryptedObject: EncryptedObject): T {
  const secret = loadEncryptionKey();
  const iv = Buffer.from(encryptedObject.iv, 'hex');
  const key = Buffer.from(secret, 'binary');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedObject.data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

function decryptBuffer(encryptedObject: EncryptedObject): Buffer {
  const secret = loadEncryptionKey();
  const iv = Buffer.from(encryptedObject.iv, 'hex');
  const key = Buffer.from(secret, 'binary');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  return Buffer.concat([
    decipher.update(encryptedObject.data, 'hex'),
    decipher.final(),
  ]);
}

function decryptString(
  encryptedObject: EncryptedObject,
): string {
  const secret = loadEncryptionKey();
  const iv = Buffer.from(encryptedObject.iv, 'hex');
  const key = Buffer.from(secret, 'binary');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedObject.data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function get16ByteKey(): string {
  return loadEncryptionKey();
}

export const encryptUtils = {
  decryptString,
  decryptObject,
  decryptBuffer,
  encryptBuffer,
  encryptObject,
  encryptString,
  get16ByteKey,
  loadEncryptionKey,
};
