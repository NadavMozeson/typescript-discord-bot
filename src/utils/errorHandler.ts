import { client } from "../index.js";

export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T
): T {
  return async function (
    ...args: Parameters<T>
  ): Promise<ReturnType<T> | undefined> {
    try {
      return await fn(...args);
    } catch (error) {
      console.error(error);
      if (
        !(
          error instanceof Error &&
          error.message.includes("Navigation timeout of 60000 ms exceeded")
        )
      ) {
        try {
          if (client.user) {
            const user = await client.users.fetch(
              process.env.DEVELOPER_DISCORD_ID as string
            );
            console.log(`${error}`);
            await user.send(
              `${(error as Error).message}\nStack Trace:\n${
                (error as Error).stack
              }`
            );
          }
        } catch (errorSend) {
          console.error(`Failed to send exception to user: ${errorSend}`);
        }
      } else {
        console.log(`${error}`);
      }
      return undefined;
    }
  } as T;
}
