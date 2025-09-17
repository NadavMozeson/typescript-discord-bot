import { setupTicketSystem } from "./ticketSystem.js";

export async function setupAssets() {
  await setupTicketSystem();
}
