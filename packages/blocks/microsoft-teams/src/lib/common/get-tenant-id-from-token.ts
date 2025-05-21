export const getTenantIdFromToken = (accessToken: string) => {
  try {
    const [, payloadBase64] = accessToken.split('.');
    const payload = JSON.parse(atob(payloadBase64));

    return payload.tid ?? null;
  } catch (error) {
    return null;
  }
};
