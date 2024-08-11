import { withErrorHandling } from '../utils/errorHandler';
import { client } from '../index';
import { ButtonInteraction, CommandInteraction, Interaction, StringSelectMenuInteraction } from 'discord.js';
import { handleTicketButtons } from '../assets/ticketButtons';
import { handleOpenDMInteraction } from '../assets/privateChats';
import { createNewInvestment, postNewInvestment } from '../assets/newInvestments';

export async function setupInteractionEvents() {
	client.on('interactionCreate', withErrorHandling(async (interaction: Interaction) => {
        if (interaction.isButton()) {
            await handleButtons(interaction as ButtonInteraction)
        } else if (interaction.isCommand()) {
            await handleSlashCommands(interaction as CommandInteraction)
        } else if (interaction.isStringSelectMenu()) {
            await handleSelectMenuInteraction(interaction as StringSelectMenuInteraction)
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
    } else if (interaction.commandName === 'investment') {
        await createNewInvestment(interaction)
    }
})

const handleSelectMenuInteraction = withErrorHandling(async (interaction: StringSelectMenuInteraction) => {
    if (interaction.customId.includes('new_investment_pick_player')) {
        await postNewInvestment(interaction)
    }
})

