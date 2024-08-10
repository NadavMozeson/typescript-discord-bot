import { setupBasicEvents } from './basicEvents';
import { setupInteractionEvents } from './interactionEvents';
import { setupMemberEvents } from './memberEvents';
import { setupMessagesEvents } from './messageEvents';

export async function setupEvents() {
	await setupBasicEvents();
	await setupMemberEvents();
	await setupMessagesEvents();
	await setupInteractionEvents();
}