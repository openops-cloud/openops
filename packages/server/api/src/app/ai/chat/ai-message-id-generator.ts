export function generateMessageId(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(18));
  const base64url = Array.from(randomBytes)
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 24);

  return `msg-${base64url}`;
}
