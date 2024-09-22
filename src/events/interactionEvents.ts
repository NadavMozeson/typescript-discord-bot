import { withErrorHandling } from '../utils/errorHandler';
import { client } from '../index';
import { ButtonInteraction, CommandInteraction, Interaction, StringSelectMenuInteraction } from 'discord.js';
import { handleTicketButtons } from '../assets/ticketButtons';
import { handleOpenDMInteraction } from '../assets/privateChats';
import { createNewInvestment, deleteInvestment, postEarlyExitMessage, postFirstExitMessage, postNewFoderInvestment, postNewInvestment, postNewTOTWInvestment, postProfitMessage, sendInvestmentListPicker } from '../assets/newInvestments';
import { handelTrackerButtonClick } from '../assets/investmentTracker';
import { handleTeamSuggest } from '../assets/teamUpgrades';
import { handleNewFAQ, handleNewFAQClick } from '../assets/FAQ';

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
    } else if (interaction.customId.toString().includes('tracker_button_')) {
        await handelTrackerButtonClick(interaction)
    } else if (interaction.customId.toString().includes('faq-click-')) {
        await handleNewFAQClick(interaction)
    }
})

const handleSlashCommands = withErrorHandling(async (interaction: CommandInteraction) => {
    if (interaction.commandName === 'open-dm') {
        await handleOpenDMInteraction(interaction)
    } else if (interaction.commandName === 'investment') {
        await createNewInvestment(interaction)
    } else if (interaction.commandName === 'profit' || interaction.commandName === 'exit' || interaction.commandName === 'first-exit' || interaction.commandName === 'delete_investment') {
        await sendInvestmentListPicker(interaction)
    } else if (interaction.commandName === 'foder') {
        await postNewFoderInvestment(interaction)
    } else if (interaction.commandName === 'totw') {
        await postNewTOTWInvestment(interaction)
    } else if (interaction.commandName === 'team-suggest') {
        await handleTeamSuggest(interaction)
    } else if (interaction.commandName === 'faq-new') {
        await handleNewFAQ(interaction)
    }
})

const handleSelectMenuInteraction = withErrorHandling(async (interaction: StringSelectMenuInteraction) => {
    if (interaction.customId.includes('new_investment_pick_player')) {
        await postNewInvestment(interaction)
    } else if (interaction.customId.includes('post_profit_pick_player')) {
        await postProfitMessage(interaction)
    } else if (interaction.customId.includes('first_exit_pick_player')) {
        await postFirstExitMessage(interaction)
    } else if (interaction.customId.includes('early_exit_pick_player')) {
        await postEarlyExitMessage(interaction)
    } else if (interaction.customId.includes('delete_pick_player')) {
        await deleteInvestment(interaction)
    }
})

