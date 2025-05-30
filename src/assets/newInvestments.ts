import {
  ActionRowBuilder,
  APIAttachment,
  Attachment,
  AttachmentBuilder,
  AttachmentPayload,
  BufferResolvable,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  JSONEncodable,
  Message,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
  TextChannel,
} from "discord.js";
import { withErrorHandling } from "../utils/errorHandler.js";
import {
  getFutbinFoderPageData,
  getFutbinPlayerPageData,
  getFutbinTOTWPageData,
  getPageContent,
} from "../utils/puppeteerManager.js";
import * as cheerio from "cheerio";
import axios from "axios";
import { dbManager } from "../utils/databaseManager.js";
import { client, config } from "../index.js";
import { Stream } from "stream";
import {
  generateTrackerButtons,
  notifyInvestmentTracker,
} from "./investmentTracker.js";
import sharp from "sharp";
import { createCanvas, loadImage } from "canvas";
import path from "path";
import * as fs from "fs";

const RETRIES = 5;
let MESSAGES_BUFFER: { [key: string]: string } = {};

export const createNewInvestment = withErrorHandling(
  async (interaction: CommandInteraction) => {
    const playerSearchName = interaction.options.get("שחקן")?.value?.toString();
    const investmentRisk = interaction.options.get("סיכון")?.value?.toString();
    const priceDifference = interaction.options
      .get("חיסור-מחיר")
      ?.value?.toString()
      .replace(/\D/g, "");
    if (playerSearchName && investmentRisk && priceDifference) {
      await interaction.reply({
        content: "מבצע חיפוש לשחקן, אנא המתן...",
        ephemeral: true,
      });
      const url = `https://www.futbin.com/players?search=${encodeURI(
        playerSearchName
      )}`;
      const content = await getPageContent(url);
      const $ = cheerio.load(content);
      const results: { label: string; value: string }[] = [];

      const playerTable = $(
        "#content-container > div.extra-columns-wrapper.relative > div.players-table-wrapper.custom-scrollbar.overflow-x > table > tbody"
      );
      const children = playerTable.children();
      children.each((_, row) => {
        const playerRow = $(row);

        const player = {
          name: playerRow.find(".table-player-name").text(),
          rating: playerRow.find(".player-rating-card-text").text(),
          card: playerRow.find(".table-player-revision").text(),
          price: playerRow.find(".table-price.platform-ps-only .price").text(),
          url: playerRow.find(".table-player-name").attr("href"),
        };
        if (player.url) {
          let label = `${player.name}(${player.rating}) ${player.price} | ${player.card}`;
          if (label.length > 100) {
            label = label.slice(0, 100 - 3) + "...";
          }
          results.push({ label: label, value: player.url });
        }
      });
      if (results.length > 0) {
        const menusOptions: { label: string; value: string }[][] = [];
        for (let i = 0; i < results.length; i += 20) {
          menusOptions.push(results.slice(i, i + 20));
        }
        const components: ActionRowBuilder<StringSelectMenuBuilder>[] = [];
        for (let i = 0; i < menusOptions.length; i++) {
          components.push(new ActionRowBuilder<StringSelectMenuBuilder>());
          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`new_investment_pick_player_${i}`)
            .setPlaceholder(`רשימת תוצאות ${i + 1}`)
            .addOptions(
              menusOptions[i].map((player) =>
                new StringSelectMenuOptionBuilder()
                  .setLabel(player.label)
                  .setValue(
                    JSON.stringify({
                      url: player.value,
                      risk: investmentRisk,
                      priceDiff: priceDifference,
                    })
                  )
              )
            );
          components[i].addComponents(selectMenu);
        }
        await interaction.editReply({
          content: "בחר שחקן",
          components: components,
        });
      } else {
        await interaction.editReply({ content: "לא נמצא שחקן עם שם זה" });
      }
    }
  }
);

export const postNewInvestment = withErrorHandling(
  async (interaction: StringSelectMenuInteraction) => {
    const paramsData = JSON.parse(interaction.values[0]);
    await interaction.update({
      content: `אנא המתן בזמן שאני יוצר את ההודעה של ההשקעה`,
      components: [],
    });
    let pageData = await getFutbinPlayerPageData(
      "https://www.futbin.com" + paramsData.url
    );
    for (let i = 0; i < RETRIES; i++) {
      if (
        pageData &&
        pageData.country &&
        pageData.pricePC &&
        pageData.minPCPrice &&
        pageData.priceConsole &&
        pageData.minConsolePrice
      ) {
        break;
      }
      pageData = await getFutbinPlayerPageData(
        "https://www.futbin.com" + paramsData.url
      );
    }
    if (pageData?.image) {
      pageData.image = await addWatermarkToImage(
        pageData.image,
        interaction.guild?.iconURL()
      );
    }
    if (
      pageData?.country &&
      pageData.minPCPrice &&
      pageData.minConsolePrice &&
      pageData.pricePC &&
      pageData.priceConsole &&
      pageData.name &&
      pageData.rating &&
      pageData.card
    ) {
      const flagEmoji = await countryNameToFlag(pageData.country);
      const pricePC =
        parseInt(pageData.pricePC.replace(/\D/g, "")) -
        parseInt(paramsData.priceDiff);
      let pricePCLabel = pricePC.toLocaleString();
      if (pricePC < parseInt(pageData.minPCPrice.toString())) {
        pricePCLabel = parseInt(
          pageData.minPCPrice.toString()
        ).toLocaleString();
      }
      const priceConsole =
        parseInt(pageData.priceConsole.replace(/\D/g, "")) -
        parseInt(paramsData.priceDiff);
      let priceConsoleLabel = priceConsole.toLocaleString();
      if (priceConsole < parseInt(pageData.minConsolePrice.toString())) {
        priceConsoleLabel = parseInt(
          pageData.minConsolePrice.toString()
        ).toLocaleString();
      }
      const everyoneRole = interaction.guild?.roles.everyone;
      const formattedText =
        `## ${flagEmoji} ${pageData.name.toUpperCase()} ${
          pageData.rating
        } ${flagEmoji}\n\n` +
        `${config.BOT.Emoji.XBox}${config.BOT.Emoji.PS} **:** ${priceConsoleLabel} ${config.BOT.Emoji.FifaCoins}\n` +
        `${config.BOT.Emoji.PC} **:** ${pricePCLabel} ${config.BOT.Emoji.FifaCoins}\n` +
        `${paramsData.risk}\n` +
        `||${interaction.user} **מפרסם ההשקעה** ||\n` +
        `**||${everyoneRole}||**`;
      const msg = await interaction.channel?.send({
        content: formattedText,
        files: [pageData.image],
      });
      let isVIP = interaction.guildId === config.VIP_SERVER.INFO.ServerId;
      if (msg) {
        fs.writeFileSync(
          `./src/images/investments/investment_${msg.id}.png`,
          new Uint8Array(pageData.image)
        );
        const insertedData = await dbManager.Investments.createNewInvestment(
          pageData.name,
          "https://www.futbin.com" + paramsData.url,
          pageData.country,
          pageData.rating,
          pageData.card,
          paramsData.risk,
          interaction.channelId,
          priceConsoleLabel,
          pricePCLabel,
          interaction.user.id,
          msg.id,
          isVIP
        );
        await msg.edit({
          components: [
            await generateTrackerButtons(insertedData.insertedId.toString()),
          ],
        });
      }
    }
  }
);

export const sendInvestmentListPicker = withErrorHandling(
  async (interaction: CommandInteraction) => {
    await interaction.reply({
      content: "משיג מידע על כל ההשקעות...",
      ephemeral: true,
    });
    let customID = "post_profit_pick_player";
    if (interaction.commandName === "first-exit") {
      customID = "first_exit_pick_player";
    } else if (interaction.commandName === "exit") {
      customID = "early_exit_pick_player";
    } else if (interaction.commandName === "delete_investment") {
      customID = "delete_pick_player";
    }
    const messageInput = interaction.options.get("הודעה")?.value?.toString();
    if (interaction.id.toString() && messageInput) {
      MESSAGES_BUFFER[interaction.id.toString()] = messageInput;
    }
    const allInvestmentsData = await dbManager.Investments.getAllInvestment();
    const result: { label: string; value: string }[] = [];
    for (const investment of allInvestmentsData) {
      result.push({
        label: `${investment.name}(${investment.rating}) - ${investment.version}`,
        value: investment._id.toString(),
      });
    }
    const menusOptions: { label: string; value: string }[][] = [];
    for (let i = 0; i < allInvestmentsData.length; i += 20) {
      menusOptions.push(result.slice(i, i + 20));
    }
    const components: ActionRowBuilder<StringSelectMenuBuilder>[] = [];
    for (let i = 0; i < menusOptions.length; i++) {
      components.push(new ActionRowBuilder<StringSelectMenuBuilder>());
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(customID + `_${i}`)
        .setPlaceholder(`רשימת תוצאות ${i + 1}`)
        .addOptions(
          menusOptions[i].map((player) =>
            new StringSelectMenuOptionBuilder().setLabel(player.label).setValue(
              JSON.stringify({
                id: player.value,
                interaction: interaction.id.toString(),
              })
            )
          )
        );
      components[i].addComponents(selectMenu);
    }
    await interaction.editReply({
      content: "בחר השקעה",
      components: components,
    });
  }
);

export const postProfitMessage = withErrorHandling(
  async (interaction: StringSelectMenuInteraction) => {
    await interaction.update({
      content: `אנא המתן בזמן שאני יוצר את ההודעה של הרווחים`,
      components: [],
    });
    const commandData = JSON.parse(interaction.values[0]);
    const investmentData = await dbManager.Investments.getInvestmentByID(
      commandData.id
    );
    if (investmentData) {
      let pageData = await checkWhatFunctionToRun(investmentData);
      for (let i = 0; i < RETRIES; i++) {
        if (pageData?.pricePC && pageData.priceConsole && pageData.image) {
          break;
        }
        pageData = await checkWhatFunctionToRun(investmentData);
      }
      if (investmentData.version !== "פודר" && pageData?.image) {
        let guild = null;
        if (investmentData.vip) {
          guild = await client.guilds.fetch(config.VIP_SERVER.INFO.ServerId);
        } else {
          guild = await client.guilds.fetch(config.SERVER.INFO.ServerId);
        }
        pageData.image = await addWatermarkToImage(
          pageData.image,
          guild.iconURL()
        );
      }
      if (pageData?.pricePC && pageData.priceConsole && pageData.image) {
        const flagEmoji = await countryNameToFlag(investmentData.nation);
        const profitPC =
          parseInt(pageData.pricePC.replace(/\D/g, "")) -
          parseInt(investmentData["pc price"].replace(/\D/g, ""));
        let profitPCLabel = "";
        if (profitPC > 0) {
          profitPCLabel = profitPC.toLocaleString();
        } else {
          profitPCLabel = "❌";
        }
        const profitConsole =
          parseInt(pageData.priceConsole.replace(/\D/g, "")) -
          parseInt(investmentData["console price"].replace(/\D/g, ""));
        let profitConsoleLabel = "";
        if (profitConsole > 0) {
          profitConsoleLabel = profitConsole.toLocaleString();
        } else {
          profitConsoleLabel = "❌";
        }
        let formattedText =
          `## ${flagEmoji} ${investmentData.name.toUpperCase()} ${
            investmentData.rating
          } ${flagEmoji}\n\n` +
          `${config.BOT.Emoji.XBox}${config.BOT.Emoji.PS} **:** +${profitConsoleLabel} ${config.BOT.Emoji.FifaCoins}\n` +
          `${config.BOT.Emoji.PC} **:** +${profitPCLabel} ${config.BOT.Emoji.FifaCoins}\n` +
          `${MESSAGES_BUFFER[commandData.interaction]}\n`;
        if (investmentData.vip) {
          formattedText +=
            `\n**:money_with_wings:השקעה זו עלתה רק לפרימיום:money_with_wings:**\n` +
            `איך אתם יכולים להיכנס?\n` +
            `כל הפרטים כאן:point_down:\n` +
            `https://discord.com/channels/919996404368306227/1287753477535039549\n`;
        }
        formattedText += `\n**||${interaction.guild?.roles.everyone}||**`;

        const channel = await client.channels.fetch(
          investmentData.channel.toString()
        );
        if (channel instanceof TextChannel) {
          const msg = await channel.messages.fetch(
            investmentData.msg.toString()
          );
          const files = await generateProfitImage(pageData.image, msg);
          const profitChannel = await client.channels.fetch(
            config.SERVER.CHANNELS.Profit.toString()
          );
          const vipChannel = await client.channels.fetch(
            config.VIP_SERVER.CHANNELS.Profit.toString()
          );
          if (
            profitChannel instanceof TextChannel &&
            vipChannel instanceof TextChannel
          ) {
            if (investmentData.vip) {
              await vipChannel.send({ content: formattedText, files });
            }
            const profitMsg = await profitChannel.send({
              content: formattedText,
              files,
            });
            await notifyInvestmentTracker(profitMsg, commandData.id);
          }
          await dbManager.Investments.deleteInvestmentByID(commandData.id);
        }
      }
    }
  }
);

export const postFirstExitMessage = withErrorHandling(
  async (interaction: StringSelectMenuInteraction) => {
    await interaction.update({
      content: `אנא המתן בזמן שאני יוצר את ההודעה של יציאה ראשונה`,
      components: [],
    });
    const commandData = JSON.parse(interaction.values[0]);
    const investmentData = await dbManager.Investments.getInvestmentByID(
      commandData.id
    );
    if (investmentData) {
      let pageData = await checkWhatFunctionToRun(investmentData);
      for (let i = 0; i < RETRIES; i++) {
        if (pageData?.image) {
          break;
        }
        pageData = await checkWhatFunctionToRun(investmentData);
      }
      if (pageData?.image) {
        pageData.image = await addWatermarkToImage(
          pageData.image,
          interaction.guild?.iconURL()
        );
      }
      if (pageData?.image) {
        const flagEmoji = await countryNameToFlag(investmentData.nation);
        const formattedText =
          `## ✅ יציאה ראשונה ✅\n` +
          `### ${flagEmoji} ${investmentData.name.toUpperCase()} ${
            investmentData.rating
          } ${flagEmoji}\n` +
          `${MESSAGES_BUFFER[commandData.interaction]}\n` +
          `**||${interaction.guild?.roles.everyone}||**`;
        if (investmentData.vip) {
          const exitChannel = await client.channels.fetch(
            config.VIP_SERVER.CHANNELS.FirstExit.toString()
          );
          if (exitChannel instanceof TextChannel) {
            const msg = await exitChannel.send({
              content: formattedText,
              files: [pageData.image],
            });
            await notifyInvestmentTracker(msg, commandData.id);
          }
        } else {
          const exitChannel = await client.channels.fetch(
            config.SERVER.CHANNELS.FirstExit.everyone.toString()
          );
          if (exitChannel instanceof TextChannel) {
            const msg = await exitChannel.send({
              content: formattedText,
              files: [pageData.image],
            });
            await notifyInvestmentTracker(msg, commandData.id);
          }
        }
      }
    }
  }
);

export const postEarlyExitMessage = withErrorHandling(
  async (interaction: StringSelectMenuInteraction) => {
    await interaction.update({
      content: `אנא המתן בזמן שאני יוצר את ההודעה של יציאה מוקדמת`,
      components: [],
    });
    const commandData = JSON.parse(interaction.values[0]);
    const investmentData = await dbManager.Investments.getInvestmentByID(
      commandData.id
    );
    if (investmentData) {
      let pageData = await checkWhatFunctionToRun(investmentData);
      for (let i = 0; i < RETRIES; i++) {
        if (pageData?.image) {
          break;
        }
        pageData = await checkWhatFunctionToRun(investmentData);
      }
      if (pageData?.image) {
        pageData.image = await addWatermarkToImage(
          pageData.image,
          interaction.guild?.iconURL()
        );
      }
      if (pageData?.image) {
        const flagEmoji = await countryNameToFlag(investmentData.nation);
        const formattedText =
          `## זמן למכור\n` +
          `### ${flagEmoji} ${investmentData.name.toUpperCase()} ${
            investmentData.rating
          } ${flagEmoji}\n` +
          `${MESSAGES_BUFFER[commandData.interaction]}\n` +
          `**||${interaction.guild?.roles.everyone}||**`;
        let exitChannel;
        if (investmentData.vip) {
          exitChannel = await client.channels.fetch(
            config.VIP_SERVER.CHANNELS.FirstExit.toString()
          );
        } else {
          exitChannel = await client.channels.fetch(
            config.SERVER.CHANNELS.FirstExit.everyone.toString()
          );
        }
        if (exitChannel instanceof TextChannel) {
          const msg = await exitChannel.send({
            content: formattedText,
            files: [pageData.image],
          });
          await notifyInvestmentTracker(msg, commandData.id);
        }
        try {
          fs.unlinkSync(
            `./src/images/investments/investment_${investmentData.msg}.png`
          );
        } catch (error) {
          console.log(
            "Error reading image file:",
            `investment_${investmentData.msg}.png`
          );
        }
        await dbManager.Investments.deleteInvestmentByID(commandData.id);
      }
    }
  }
);

export const postNewFoderInvestment = withErrorHandling(
  async (interaction: CommandInteraction) => {
    const foderRatingString = interaction.options
      .get("רייטינג")
      ?.value?.toString();
    const investmentRisk = interaction.options.get("סיכון")?.value?.toString();
    const priceDiff = interaction.options.get("חיסור-מחיר")?.value?.toString();
    await interaction.reply({
      content: `אנא המתן בזמן שאני יוצר את ההודעה של ההשקעה`,
      components: [],
      ephemeral: true,
    });
    if (foderRatingString) {
      const foderRating = parseInt(foderRatingString);
      let pageData = await getFutbinFoderPageData(foderRating);
      for (let i = 0; i < RETRIES; i++) {
        if (
          pageData &&
          pageData.country &&
          pageData.pricePC &&
          priceDiff &&
          investmentRisk &&
          pageData.minPCPrice &&
          pageData.priceConsole &&
          pageData.minConsolePrice
        ) {
          break;
        }
        pageData = await getFutbinFoderPageData(foderRating);
      }
      if (
        pageData &&
        pageData.country &&
        pageData.pricePC &&
        priceDiff &&
        investmentRisk &&
        pageData.minPCPrice &&
        pageData.priceConsole &&
        pageData.minConsolePrice
      ) {
        const flagEmoji = await countryNameToFlag(pageData.country);
        const pricePC =
          parseInt(pageData.pricePC.replace(/\D/g, "")) - parseInt(priceDiff);
        let pricePCLabel = pricePC.toLocaleString();
        if (pricePC < parseInt(pageData.minPCPrice.toString())) {
          pricePCLabel = parseInt(
            pageData.minPCPrice.toString()
          ).toLocaleString();
        }
        const priceConsole =
          parseInt(pageData.priceConsole.replace(/\D/g, "")) -
          parseInt(priceDiff);
        let priceConsoleLabel = priceConsole.toLocaleString();
        if (priceConsole < parseInt(pageData.minConsolePrice.toString())) {
          priceConsoleLabel = parseInt(
            pageData.minConsolePrice.toString()
          ).toLocaleString();
        }
        const everyoneRole = interaction.guild?.roles.everyone;
        const formattedText =
          `## ${flagEmoji} ${pageData.name.toUpperCase()} ${flagEmoji}\n\n` +
          `${config.BOT.Emoji.XBox}${config.BOT.Emoji.PS} **:** ${priceConsoleLabel} ${config.BOT.Emoji.FifaCoins}\n` +
          `${config.BOT.Emoji.PC} **:** ${pricePCLabel} ${config.BOT.Emoji.FifaCoins}\n` +
          `${investmentRisk}\n` +
          `||${interaction.user} **מפרסם ההשקעה** ||\n` +
          `**||${everyoneRole}||**`;

        const msg = await interaction.channel?.send({
          content: formattedText,
          files: [pageData.image],
        });
        let isVIP = interaction.guildId === config.VIP_SERVER.INFO.ServerId;
        if (msg) {
          fs.writeFileSync(
            `./src/images/investments/investment_${msg.id}.png`,
            new Uint8Array(pageData.image)
          );
          const insertedData = await dbManager.Investments.createNewInvestment(
            pageData.name,
            "https://www.futbin.com/stc/cheapest",
            pageData.country,
            "",
            "פודר",
            investmentRisk,
            interaction.channelId,
            priceConsoleLabel,
            pricePCLabel,
            interaction.user.id,
            msg.id,
            isVIP
          );
          await msg.edit({
            components: [
              await generateTrackerButtons(insertedData.insertedId.toString()),
            ],
          });
        }
      } else {
        await interaction.editReply({
          content: "הייתה שגיאה עם יצירת ההודעה, אנא נסה שוב",
        });
      }
    }
  }
);

export const postNewTOTWInvestment = withErrorHandling(
  async (interaction: CommandInteraction) => {
    const foderRatingString = interaction.options
      .get("רייטינג")
      ?.value?.toString();
    const investmentRisk = interaction.options.get("סיכון")?.value?.toString();
    const priceDiff = interaction.options.get("חיסור-מחיר")?.value?.toString();
    await interaction.reply({
      content: `אנא המתן בזמן שאני יוצר את ההודעה של ההשקעה`,
      components: [],
      ephemeral: true,
    });
    if (foderRatingString) {
      const foderRating = parseInt(foderRatingString);
      let pageData = await getFutbinTOTWPageData(foderRating);
      for (let i = 0; i < RETRIES; i++) {
        if (
          pageData &&
          pageData.country &&
          pageData.pricePC &&
          priceDiff &&
          investmentRisk &&
          pageData.minPCPrice &&
          pageData.priceConsole &&
          pageData.minConsolePrice
        ) {
          break;
        }
        pageData = await getFutbinTOTWPageData(foderRating);
      }
      if (
        pageData &&
        pageData.country &&
        pageData.pricePC &&
        priceDiff &&
        investmentRisk &&
        pageData.minPCPrice &&
        pageData.priceConsole &&
        pageData.minConsolePrice
      ) {
        const flagEmoji = await countryNameToFlag(pageData.country);
        const pricePC =
          parseInt(pageData.pricePC.replace(/\D/g, "")) - parseInt(priceDiff);
        let pricePCLabel = pricePC.toLocaleString();
        if (pricePC < parseInt(pageData.minPCPrice.toString())) {
          pricePCLabel = parseInt(
            pageData.minPCPrice.toString()
          ).toLocaleString();
        }
        const priceConsole =
          parseInt(pageData.priceConsole.replace(/\D/g, "")) -
          parseInt(priceDiff);
        let priceConsoleLabel = priceConsole.toLocaleString();
        if (priceConsole < parseInt(pageData.minConsolePrice.toString())) {
          priceConsoleLabel = parseInt(
            pageData.minConsolePrice.toString()
          ).toLocaleString();
        }
        const everyoneRole = interaction.guild?.roles.everyone;
        const formattedText =
          `## ${flagEmoji} ${pageData.name.toUpperCase()} ${flagEmoji}\n\n` +
          `${config.BOT.Emoji.XBox}${config.BOT.Emoji.PS} **:** ${priceConsoleLabel} ${config.BOT.Emoji.FifaCoins}\n` +
          `${config.BOT.Emoji.PC} **:** ${pricePCLabel} ${config.BOT.Emoji.FifaCoins}\n` +
          `${investmentRisk}\n` +
          `||${interaction.user} **מפרסם ההשקעה** ||\n` +
          `**||${everyoneRole}||**`;

        const msg = await interaction.channel?.send({
          content: formattedText,
          files: [pageData.image],
        });
        let isVIP = interaction.guildId === config.VIP_SERVER.INFO.ServerId;
        if (msg) {
          fs.writeFileSync(
            `./src/images/investments/investment_${msg.id}.png`,
            new Uint8Array(pageData.image)
          );
          const insertedData = await dbManager.Investments.createNewInvestment(
            pageData.name,
            "https://www.futbin.com/stc/cheapest",
            pageData.country,
            "",
            "פודר",
            investmentRisk,
            interaction.channelId,
            priceConsoleLabel,
            pricePCLabel,
            interaction.user.id,
            msg.id,
            isVIP
          );
          await msg.edit({
            components: [
              await generateTrackerButtons(insertedData.insertedId.toString()),
            ],
          });
        }
      } else {
        await interaction.editReply({
          content: "הייתה שגיאה עם יצירת ההודעה, אנא נסה שוב",
        });
      }
    }
  }
);

export const deleteInvestment = withErrorHandling(
  async (interaction: StringSelectMenuInteraction) => {
    const commandData = JSON.parse(interaction.values[0]);
    const data = await dbManager.Investments.getInvestmentByID(commandData.id);
    if (data) {
      const buttonAdd = new ButtonBuilder()
        .setCustomId(`confirm_delete_inv_${data._id}`)
        .setLabel("אישור מחיקה")
        .setStyle(ButtonStyle.Danger);

      const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        buttonAdd
      );

      await interaction.update({
        content: `## אישור מחיקה\nהודעה: https://discord.com/channels/${config.SERVER.INFO.ServerId}/${data.channel}/${data.msg}`,
        components: [actionRow],
      });
    }
  }
);

export const confirmDeleteInvestment = withErrorHandling(
  async (interaction: ButtonInteraction) => {
    const id = interaction.customId.split("confirm_delete_inv_")[1];
    const investmentData = await dbManager.Investments.getInvestmentByID(id);
    if (investmentData) {
      try {
        fs.unlinkSync(
          `./src/images/investments/investment_${investmentData.msg}.png`
        );
      } catch (error) {
        console.log(
          "Error reading image file:",
          `investment_${investmentData.msg}.png`
        );
      }
    }
    await dbManager.Investments.deleteInvestmentByID(id);
    await interaction.update({
      content: "נמחקה ההשקעה מהמסד נתונים",
      components: [],
    });
  }
);

export const countryNameToFlag = async (countryName: string) => {
  try {
    if (countryName === "TOTW Inform") {
      return config.BOT.Emoji.TOTW.toString();
    } else if (countryName === "Gold Foder") {
      return "✨";
    } else if (countryName.toLowerCase() === "england") {
      return ":england:";
    } else if (countryName.toLowerCase() === "korea republic") {
      return ":flag_kr:";
    } else if (countryName.toLowerCase() === "saudi arabia") {
      return ":flag_sa:";
    }
    const response = await axios.get(
      `https://restcountries.com/v3.1/name/${countryName}`
    );
    const countryData: { altSpellings: string }[] = response.data;

    if (countryData.length > 0) {
      const firstAltSpelling = countryData[0].altSpellings[0].toUpperCase();
      return firstAltSpelling
        .split("")
        .map((char) =>
          String.fromCodePoint(0x1f1e6 + char.charCodeAt(0) - "A".charCodeAt(0))
        )
        .join("");
    }
    return null;
  } catch (error) {
    return "Error fetching flag";
  }
};

const checkWhatFunctionToRun = withErrorHandling(async (data: any) => {
  if (data.version === "פודר") {
    if (data.name.toString().includes(" TOTW ")) {
      return await getFutbinTOTWPageData(
        parseInt(data.name.toString().split(" ")[0])
      );
    } else {
      return await getFutbinFoderPageData(
        parseInt(data.name.toString().split(" ")[0])
      );
    }
  } else {
    return await getFutbinPlayerPageData(data.link);
  }
});

const addWatermarkToImage = withErrorHandling(
  async (imageBuffer, watermarkImageURL) => {
    const watermarkImageResponse = await axios.get(watermarkImageURL, {
      responseType: "arraybuffer",
    });
    const watermarkImageBuffer = Buffer.from(watermarkImageResponse.data);
    const { width, height } = await sharp(imageBuffer).metadata();

    if (!width || !height) {
      console.log("Unable to retrieve image dimensions");
      return imageBuffer;
    } else if (width <= 600) {
      return imageBuffer;
    }

    const editedImageBuffer = await sharp(imageBuffer)
      .composite([
        {
          input: watermarkImageBuffer,
          left: 415,
          top: 145,
          blend: "over",
        },
      ])
      .toBuffer();

    return editedImageBuffer;
  }
);

const generateProfitImage = withErrorHandling(
  async (newImage: Buffer, investmentMsg: Message) => {
    const watermarkBorderPath = path.resolve(
      process.cwd(),
      "src",
      "images",
      "profit-watermark-border.png"
    );
    const watermarkTextPath = path.resolve(
      process.cwd(),
      "src",
      "images",
      "profit-watermark-text.png"
    );
    const files: (
      | Attachment
      | BufferResolvable
      | Stream
      | JSONEncodable<APIAttachment>
      | AttachmentBuilder
      | AttachmentPayload
    )[] = [];
    try {
      const imageBuffer = fs.readFileSync(
        `./src/images/investments/investment_${investmentMsg.id}.png`
      );
      fs.unlinkSync(
        `./src/images/investments/investment_${investmentMsg.id}.png`
      );
      if (imageBuffer) {
        const pageImageLoaded = await loadImage(newImage);
        const beforeImageLoaded = await loadImage(imageBuffer);
        const borderImage = await loadImage(watermarkBorderPath);
        const textImage = await loadImage(watermarkTextPath);

        const canvasWidth = Math.max(
          pageImageLoaded.width,
          beforeImageLoaded.width
        );
        const canvasHeight = pageImageLoaded.height + beforeImageLoaded.height;

        const canvas = createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext("2d");

        ctx.drawImage(pageImageLoaded, 0, 0);
        ctx.drawImage(beforeImageLoaded, 0, pageImageLoaded.height);

        const watermarkWidth = canvasWidth;
        const watermarkHeight = canvasHeight;
        const watermarkX = (canvasWidth - watermarkWidth) / 2;
        const watermarkY = (canvasHeight - watermarkHeight) / 2;
        ctx.globalAlpha = 1;
        ctx.drawImage(
          borderImage,
          watermarkX,
          watermarkY,
          watermarkWidth,
          watermarkHeight
        );

        const textHeight = canvasHeight;
        const textWidth = (textImage.width / textImage.height) * textHeight;
        const textX = (canvasWidth - textWidth) / 2;
        const textY = (canvasHeight - textHeight) / 2;

        // Draw the text image with adjusted dimensions
        ctx.drawImage(textImage, textX, textY, textWidth, textHeight);

        const combinedImageBuffer = canvas.toBuffer();
        const combinedImageAttachment = new AttachmentBuilder(
          combinedImageBuffer,
          { name: "profit-image.jpg" }
        );

        files.push(combinedImageAttachment);
      } else {
        files.push(
          new AttachmentBuilder(newImage, { name: "profit-image.jpg" })
        );
      }
      return files;
    } catch (error) {
      console.log(
        "Error reading image file:",
        `investment_${investmentMsg.id}.png`
      );
    }
    const attachment = investmentMsg.attachments.first();
    if (attachment) {
      const fileUrl = attachment.url;
      const response = await axios.get(fileUrl, {
        responseType: "arraybuffer",
      });
      const beforeImage = Buffer.from(response.data);

      const pageImageLoaded = await loadImage(newImage);
      const beforeImageLoaded = await loadImage(beforeImage);
      const borderImage = await loadImage(watermarkBorderPath);
      const textImage = await loadImage(watermarkTextPath);

      const canvasWidth = Math.max(
        pageImageLoaded.width,
        beforeImageLoaded.width
      );
      const canvasHeight = pageImageLoaded.height + beforeImageLoaded.height;

      const canvas = createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext("2d");

      ctx.drawImage(pageImageLoaded, 0, 0);
      ctx.drawImage(beforeImageLoaded, 0, pageImageLoaded.height);

      const watermarkWidth = canvasWidth;
      const watermarkHeight = canvasHeight;
      const watermarkX = (canvasWidth - watermarkWidth) / 2;
      const watermarkY = (canvasHeight - watermarkHeight) / 2;
      ctx.globalAlpha = 1;
      ctx.drawImage(
        borderImage,
        watermarkX,
        watermarkY,
        watermarkWidth,
        watermarkHeight
      );

      const textHeight = canvasHeight;
      const textWidth = (textImage.width / textImage.height) * textHeight;
      const textX = (canvasWidth - textWidth) / 2;
      const textY = (canvasHeight - textHeight) / 2;

      // Draw the text image with adjusted dimensions
      ctx.drawImage(textImage, textX, textY, textWidth, textHeight);

      const combinedImageBuffer = canvas.toBuffer();
      const combinedImageAttachment = new AttachmentBuilder(
        combinedImageBuffer,
        { name: "profit-image.jpg" }
      );

      files.push(combinedImageAttachment);
    } else {
      files.push(new AttachmentBuilder(newImage, { name: "profit-image.jpg" }));
    }
    return files;
  }
);
