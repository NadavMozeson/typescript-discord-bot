import { ButtonInteraction } from "discord.js"
import { withErrorHandling } from "../utils/errorHandler.js"
import { createNewTicket, confirmTicketClose } from "./ticketSystem.js"
import { confirmTicketCloseMessage } from "../components/ticketEmbeds.js"

export const handleTicketButtons = withErrorHandling(async (interaction: ButtonInteraction) => {
    if (interaction.customId.includes('ticket-create-button-')) {
        const reason = interaction.customId.split('ticket-create-button-')
        if (reason) {
            await createNewTicket(interaction, reason[1])
        }
    } else if (interaction.customId.startsWith('close-ticket-')) {
        await confirmTicketCloseMessage(interaction)
    } else if (interaction.customId.startsWith('confirm-close-ticket-')) {
        await confirmTicketClose(interaction)
    }
})

