export const generateAuthHeader = ({
  username,
  password,
}: {
  username: string;
  password: string;
}) => {
  return {
    Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString(
      'base64',
    )}`,
  };
};
