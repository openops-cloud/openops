import { ParsedMail, simpleParser } from 'mailparser';

export async function parseMailFromBuffer(stream: Buffer): Promise<ParsedMail> {
  return new Promise<ParsedMail>((resolve, reject) => {
    simpleParser(stream, (err, parsed) => {
      if (err) {
        reject(err);
      } else {
        resolve(parsed);
      }
    });
  });
}
