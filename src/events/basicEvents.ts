import { withErrorHandling } from '../utils/errorHandler';
import { client } from '../index';

export async function setupBasicEvents() {
	client.on(
		'ready',
		withErrorHandling(async () => {
			if (client.user) {
				console.log(`Logged in as ${client.user.tag}!`);
			}
		}),
	);
}
