import { client } from '../index';

export function withErrorHandling(fn: (...args: any[]) => Promise<void>) {
	return async function (...args: any[]) {
		try {
			await fn(...args);
		} catch (error) {
			try {
				const user = await client.users.fetch(process.env.DEVELOPER_DISCORD_ID as string);
				await user.send(`Error: ${(error as Error).message}\nStack Trace:\n${(error as Error).stack}`);
			} catch (errorSend) {
				console.error(`Failed to send exception: ${errorSend}`);
			}
		}
	};
}
