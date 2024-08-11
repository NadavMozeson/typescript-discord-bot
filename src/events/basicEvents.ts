import { withErrorHandling } from '../utils/errorHandler';
import { client } from '../index';
import { setupAssets } from '../assets/loadAssets';
import { setupSlashCommands } from './slashCommands';

export async function setupBasicEvents() {
	client.on(
		'ready',
		withErrorHandling(async () => {
			if (client.user) {
				console.log(`Logged in as ${client.user.tag}!`);
			}
			await StartupFunctions();
		}),
	);
}

const StartupFunctions = withErrorHandling(async () => { 
	await setupSlashCommands();
	await setupAssets();
})