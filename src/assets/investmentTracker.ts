import { withErrorHandling } from "../utils/errorHandler.js";
import { client, config } from "../index.js";
import { dbManager } from "../utils/databaseManager.js";
import { countryNameToFlag } from "./newInvestments.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  Message,
  TextChannel,
  User,
} from "discord.js";

export const updateTrackerMessage = withErrorHandling(async () => {
  const allChannel = await client.channels.fetch(
    config.SERVER.CHANNELS.InvestmentTracker.everyone.toString()
  );
  const vipChannel = await client.channels.fetch(
    config.SERVER.CHANNELS.InvestmentTracker.VIP.toString()
  );
  let allMessage = "# מעקב השקעות";
  let vipMessage = "# מעקב השקעות";
  const investmentsData = await dbManager.Investments.getAllInvestment();

  if (investmentsData) {
    investmentsData.sort((a, b) => {
      if (a.vip === b.vip) {
        return 0;
      }
      return a.vip ? 1 : -1;
    });

    for (const item of investmentsData) {
      const investmentText = `\n### ${item.name} ${
        item.rating
      } ${await countryNameToFlag(item.nation)}\nhttps://discord.com/channels/${
        config.SERVER.INFO.ServerId
      }/${item.channel}/${item.msg}`;

      if (item.vip) {
        allMessage += "\n### ████████████ ██ :pirate_flag:" + investmentText;
        vipMessage += investmentText;
      } else {
        allMessage += investmentText;
        vipMessage += investmentText;
      }
    }
    allMessage += "\n\n *ההשקעות המחוקות זמינות רק לחברי המועדון שלנו*";

    const sendMessages = async (channel: TextChannel, message: string) => {
      const chunks = [];
      while (message.length > 2000) {
        let splitIndex = message.lastIndexOf("\n", 2000);
        if (splitIndex === -1) splitIndex = 2000;
        chunks.push(message.substring(0, splitIndex));
        message = message.substring(splitIndex).trim();
      }
      chunks.push(message);

      for (const chunk of chunks) {
        await channel.send({ content: chunk });
      }
    };

    if (allChannel instanceof TextChannel) {
      const lastAllMessage = (
        await allChannel.messages.fetch({ limit: 1 })
      ).first();
      if (lastAllMessage) {
        if (lastAllMessage.editable) {
          await lastAllMessage.delete();
        }
      }
      await sendMessages(allChannel, allMessage);
    }

    if (vipChannel instanceof TextChannel) {
      const lastVIPMessage = (
        await vipChannel.messages.fetch({ limit: 1 })
      ).first();
      if (lastVIPMessage) {
        if (lastVIPMessage.editable) {
          await lastVIPMessage.delete();
        }
      }
      await sendMessages(vipChannel, vipMessage);
    }
  }
});

export const generateTrackerButtons = withErrorHandling(async (id: string) => {
  const buttonAdd = new ButtonBuilder()
    .setCustomId(`tracker_button_add_${id}`)
    .setLabel("ביצוע מעקב")
    .setStyle(ButtonStyle.Success);

  const buttonRemove = new ButtonBuilder()
    .setCustomId(`tracker_button_remove_${id}`)
    .setLabel("הסרת מעקב")
    .setStyle(ButtonStyle.Danger);

  const data = await dbManager.Investments.getInvestmentByID(id);
  if (data && data.link) {
    const buttonFutbin = new ButtonBuilder()
      .setLabel("לקלף בפוטבין")
      .setStyle(ButtonStyle.Link)
      .setURL(data.link);

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      buttonAdd,
      buttonRemove,
      buttonFutbin
    );
    return actionRow;
  }

  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    buttonAdd,
    buttonRemove
  );

  return actionRow;
});

export const handelTrackerButtonClick = withErrorHandling(
  async (interaction: ButtonInteraction) => {
    const member = await interaction.guild?.members.fetch(interaction.user.id);
    if (member) {
      if (
        member.guild.id === config.VIP_SERVER.INFO.ServerId &&
        !(
          member.roles.cache.has(config.VIP_SERVER.ROLES.VIP) ||
          member.roles.cache.has(config.VIP_SERVER.ROLES.VIP2)
        )
      ) {
        await interaction.reply({
          content: "️⚠️ רק לחברי מועדון יש גישה למעקב ⚠",
          ephemeral: true,
        });
        return;
      }
      if (interaction.customId.toString().includes("_add_")) {
        const investmentID = interaction.customId
          .toString()
          .split("tracker_button_add_")[1];
        if (investmentID) {
          if (
            await dbManager.InvestmentsTracker.checkIfExists(
              interaction.user.id.toString(),
              investmentID.toString()
            )
          ) {
            await interaction.reply({
              content: "❕ כבר יש לך מעקב אחרי השקעה זו ❕",
              ephemeral: true,
            });
          } else {
            await dbManager.InvestmentsTracker.createNewTracker(
              interaction.user.id.toString(),
              investmentID.toString()
            );
            await interaction.reply({
              content: "✅ ההשקעה נוספה לרשימת מעקב שלך ✅",
              ephemeral: true,
            });
          }
        }
      } else if (interaction.customId.toString().includes("_remove_")) {
        const investmentID = interaction.customId
          .toString()
          .split("tracker_button_remove_")[1];
        if (investmentID) {
          if (
            await dbManager.InvestmentsTracker.checkIfExists(
              interaction.user.id.toString(),
              investmentID.toString()
            )
          ) {
            await dbManager.InvestmentsTracker.deleteTracker(
              interaction.user.id.toString(),
              investmentID.toString()
            );
            await interaction.reply({
              content: "❌ ההשקעה ירדה מרשימת המעקב שלך ❌",
              ephemeral: true,
            });
          } else {
            await interaction.reply({
              content: "❕ אין לך מעקב אחרי השקעה זו ❕",
              ephemeral: true,
            });
          }
        }
      }
    }
  }
);

export const notifyInvestmentTracker = withErrorHandling(
  async (message: Message, investmentID: string) => {
    const resultData =
      await dbManager.InvestmentsTracker.getAllTrackerOfInvestment(
        investmentID
      );
    if (resultData) {
      for (const asset of resultData) {
        const user = await client.users.fetch(asset.user.toString());
        if (user) {
          try {
            await user.send({
              content: message.content,
              components: message.components,
              files: Array.from(message.attachments.values()),
            });
          } catch (error) {
            continue;
          }
        }
      }
    }
  }
);

export const disableInvestmentButtons = withErrorHandling(
  async (investmentID: string) => {
    const investmentData = await dbManager.Investments.getInvestmentByID(
      investmentID
    );
    if (investmentData) {
      const channel = await client.channels.fetch(
        investmentData.channel.toString()
      );
      if (channel && channel instanceof TextChannel) {
        const allMessages = await channel.messages.fetch();
        if (allMessages.has(investmentData.msg.toString())) {
          const message = allMessages.get(investmentData.msg.toString());
          if (message) {
            const button = new ButtonBuilder()
              .setCustomId(`disabled_tracker_button_${investmentID}`)
              .setLabel("השקעה זו אינה פעילה יותר!")
              .setStyle(ButtonStyle.Danger)
              .setDisabled(true);

            const actionRow =
              new ActionRowBuilder<ButtonBuilder>().addComponents(button);
            await message.edit({ components: [actionRow] });
          }
        }
      }
    }
  }
);

export const generateTrackerListMessage = withErrorHandling(
  async (interaction: CommandInteraction) => {
    await interaction.reply({ content: "אוסף נתונים...", ephemeral: true });
    const investments =
      await dbManager.InvestmentsTracker.getUserTrackerInvestments(
        interaction.user.id
      );
    let text = "## השקעות ברשימת מעקב";
    for (const investment of investments) {
      if (
        investment !== null &&
        investment.country !== null &&
        investment.name !== null
      ) {
        let ServerId = config.SERVER.INFO.ServerId;
        if (investment.vip) {
          ServerId = config.VIP_SERVER.INFO.ServerId;
        }
        const msgUrl = `https://discord.com/channels/${ServerId}/${investment.channel}/${investment.msg}`;
        const flag = await countryNameToFlag(investment.nation);
        text +=
          `\n### ${flag} ${investment.name} ${investment.rating}\n` + msgUrl;
      }
    }
    await interaction.editReply({ content: text });
  }
);
