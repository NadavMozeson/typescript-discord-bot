import { withErrorHandling } from '../utils/errorHandler.js';
import { client, config } from '../index.js';
import { ButtonInteraction, CommandInteraction, GuildMember, Interaction, StringSelectMenuInteraction } from 'discord.js';
import { handleTicketButtons } from '../assets/ticketButtons.js';
import { handleOpenDMInteraction } from '../assets/privateChats.js';
import { confirmDeleteInvestment, createNewInvestment, deleteInvestment, postEarlyExitMessage, postFirstExitMessage, postNewFoderInvestment, postNewInvestment, postNewTOTWInvestment, postProfitMessage, sendInvestmentListPicker } from '../assets/newInvestments.js';
import { generateTrackerListMessage, handelTrackerButtonClick } from '../assets/investmentTracker.js';
import { handleTeamSuggest } from '../assets/teamUpgrades.js';
import { handleNewFAQ, handleNewFAQClick } from '../assets/FAQ.js';
import { handleVIPRequestCommand, syncAllVIPs, updateUserForVIP } from '../assets/syncVIPMembers.js';

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
    if (interaction.customId.toString().includes('ticket') && isPrimaryServer(interaction)) {
        await handleTicketButtons(interaction)
    } else if (interaction.customId.toString().includes('tracker_button_')) {
        await handelTrackerButtonClick(interaction)
    } else if (interaction.customId.toString().includes('faq-click-') && isPrimaryServer(interaction)) {
        await handleNewFAQClick(interaction)
    } else if (interaction.customId.toString().includes('confirm_delete_inv_')) {
        await confirmDeleteInvestment(interaction)
    } else if (interaction.customId.toString().includes('sync-user-vip-button')) {
        await handleVIPRequestCommand(interaction)
    }
})

const handleSlashCommands = withErrorHandling(async (interaction: CommandInteraction) => {
    if (interaction.commandName === 'open-dm' && isPrimaryServer(interaction)) {
        await handleOpenDMInteraction(interaction)
    } else if (interaction.commandName === 'investment') {
        await createNewInvestment(interaction)
    } else if (interaction.commandName === 'profit' || interaction.commandName === 'exit' || interaction.commandName === 'first-exit' || interaction.commandName === 'delete_investment') {
        await sendInvestmentListPicker(interaction)
    } else if (interaction.commandName === 'foder') {
        await postNewFoderInvestment(interaction)
    } else if (interaction.commandName === 'totw') {
        await postNewTOTWInvestment(interaction)
    } else if (interaction.commandName === 'team-suggest' && isPrimaryServer(interaction)) {
        await handleTeamSuggest(interaction)
    } else if (interaction.commandName === 'faq-new' && isPrimaryServer(interaction)) {
        await handleNewFAQ(interaction)
    } else if (interaction.commandName === 'vip') {
        await handleVIPRequestCommand(interaction)
    } else if (interaction.commandName === 'sync_vip') {
        await syncAllVIPs(interaction)
    } else if (interaction.commandName === 'sync_user'){
        await updateUserForVIP(interaction)
    } else if(interaction.commandName === 'list_tracker'){
        await generateTrackerListMessage(interaction)
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

const isPrimaryServer = (interaction: (Interaction | ButtonInteraction | CommandInteraction | StringSelectMenuInteraction)) => {
    return interaction.guildId?.toString() === config.SERVER.INFO.ServerId
}