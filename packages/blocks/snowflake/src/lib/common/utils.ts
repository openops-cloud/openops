/* eslint-disable @typescript-eslint/no-explicit-any */
import snowflakeSdk from 'snowflake-sdk';

export async function connect(conn: snowflakeSdk.Connection) {
  return await new Promise<void>((resolve, reject) => {
    conn.connect((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

export async function destroy(conn: snowflakeSdk.Connection) {
  return await new Promise<void>((resolve, reject) => {
    conn.destroy((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

export async function execute(
  conn: snowflakeSdk.Connection,
  sqlText: string,
  binds: snowflakeSdk.Binds,
) {
  return await new Promise<any[] | undefined>((resolve, reject) => {
    conn.execute({
      sqlText,
      binds,
      complete: (error, _, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      },
    });
  });
}
