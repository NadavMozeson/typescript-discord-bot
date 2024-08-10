import { withErrorHandling } from '../utils/errorHandler';
import { client } from '../index';
import { ButtonInteraction, Interaction } from 'discord.js';
import { handleTicketButtons } from '../assets/ticketButtons';

export async function setupInteractionEvents() {
	client.on('interactionCreate', withErrorHandling(async (interaction: Interaction) => {
        if (interaction.isButton()) {
            await handleButtons(interaction as ButtonInteraction)
        }
    }));
}

const handleButtons = withErrorHandling(async (interaction: ButtonInteraction) => {
    if (interaction.customId.toString().includes('ticket')) {
        await handleTicketButtons(interaction)
    }
})

