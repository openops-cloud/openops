import { jwtDecode } from 'jwt-decode';

export const getExpirationDate = (accessToken: string) => {
  const decoded = jwtDecode(accessToken);

  if (!decoded.exp) {
    return;
  }

  const expires = new Date(decoded.exp * 1000);
  return expires;
};
