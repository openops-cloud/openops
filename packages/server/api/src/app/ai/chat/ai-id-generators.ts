function generateId(prefix: string): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(18));
  const base64url = Array.from(randomBytes)
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 24);

  return `${prefix}-${base64url}`;
}

export function generateMessageId(): string {
  return generateId('msg');
}

export function generateToolId(): string {
  return generateId('tool');
}

export function generateApprovalId(): string {
  return generateId('approval');
}
