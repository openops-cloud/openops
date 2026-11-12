export const auth = {
  baseUrl: 'https://optscale.example.com',
  email: 'user@example.com',
  password: 'secret',
};

export function createContext(propsValue: Record<string, unknown> = {}) {
  return { auth, propsValue } as any;
}
