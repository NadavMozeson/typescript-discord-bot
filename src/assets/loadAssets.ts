import { vipHelpMessage } from "./syncVIPMembers.js";
import { setupTicketSystem } from "./ticketSystem.js";

export async function setupAssets() {
	await setupTicketSystem();
	await vipHelpMessage();
}