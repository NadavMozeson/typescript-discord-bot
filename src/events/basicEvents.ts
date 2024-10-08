import { withErrorHandling } from '../utils/errorHandler.js';
import { client } from '../index.js';
import { setupAssets } from '../assets/loadAssets.js';
import { setupSlashCommands } from './slashCommands.js';
import { updateStats } from '../assets/statsHandler.js';
import { handleFAQMessage } from '../assets/FAQ.js';

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
	await handleFAQMessage();
	updateStats();
})
