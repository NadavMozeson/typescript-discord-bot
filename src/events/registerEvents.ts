import { setupBasicEvents } from './basicEvents';
import { setupMemberEvents } from './memberEvents';
import { setupMessagesEvents } from './messageEvents';

export async function setupEvents() {
	await setupBasicEvents();
	await setupMemberEvents();
	await setupMessagesEvents();
}