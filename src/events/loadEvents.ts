import { setupBasicEvents } from './basicEvents.js';
import { setupInteractionEvents } from './interactionEvents.js';
import { setupMemberEvents } from './memberEvents.js';
import { setupMessagesEvents } from './messageEvents.js';

export async function setupEvents() {
	await setupBasicEvents();
	await setupMemberEvents();
	await setupMessagesEvents();
	await setupInteractionEvents();
}