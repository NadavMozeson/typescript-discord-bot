import { withErrorHandling } from '../utils/errorHandler';
import { client } from '../index';
import { ButtonInteraction, CommandInteraction, Interaction } from 'discord.js';
import { handleTicketButtons } from '../assets/ticketButtons';
import { handleOpenDMInteraction } from '../assets/privateChats';

export async function setupInteractionEvents() {
	client.on('interactionCreate', withErrorHandling(async (interaction: Interaction) => {
        if (interaction.isButton()) {
            await handleButtons(interaction as ButtonInteraction)
        } else if (interaction.isCommand()) {
            await handleSlashCommands(interaction as CommandInteraction)
        }
    }));
}

const handleButtons = withErrorHandling(async (interaction: ButtonInteraction) => {
    if (interaction.customId.toString().includes('ticket')) {
        await handleTicketButtons(interaction)
    }
})

const handleSlashCommands = withErrorHandling(async (interaction: CommandInteraction) => {
    if (interaction.commandName === 'open-dm') {
        await handleOpenDMInteraction(interaction)
    }
})

