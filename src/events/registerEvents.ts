import { setupBasicEvents } from './basicEvents';
//import { setupMemberEvents } from './memberEvents.js';
//import { setupMessagesEvents } from './messageEvents.js';

export async function setupEvents() {
	await setupBasicEvents();
	//await setupMemberEvents();
	//await setupMessagesEvents();
}