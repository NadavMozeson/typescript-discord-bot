import { TextChannel } from "discord.js";
import { client } from "../index.js";
import { withErrorHandling } from "../utils/errorHandler";
import { dbManager } from "../utils/databaseManager.js";
import { wordpressDBManager } from "../utils/websiteDatabaseManage.js";

export const updateExpiringMessage = withErrorHandling(async () => {
  await sendExpiringMessage();
  setInterval(async () => {
    await sendExpiringMessage();
  }, 24 * 60 * 60 * 1000);
});

const sendExpiringMessage = withErrorHandling(async () => {
  const expiringVIPs = await wordpressDBManager.getExpiringVIPs();
  if (!expiringVIPs) return;
  const surveyLink =
    "https://docs.google.com/forms/d/e/1FAIpQLSc1AGrQ_cuoNUJ7-CDWqGA1-G8hKZXzaTLXDfV7hJeFlH2Njg/viewform?usp=header";
  for (const id of expiringVIPs) {
    const channelId = await dbManager.DM.getChatChannel(id);
    if (channelId) {
      const channel = await client.channels.fetch(channelId);
      if (channel && channel instanceof TextChannel) {
        const msg =
          `<@${id}> היי!\n\n` +
          `שמנו לב שהמינוי שלך עומד לפוג בקרוב. אנחנו מצטערים לראות אותך עוזב ומודים לך מכל הלב על כל התמיכה שלך בקהילה שלנו! ❤️\n\n` +
          `נשמח אם תוכל/י למלא את סקר החוויה והשיפורים שלנו, כדי שנוכל להשתפר ולהעניק לך שירות טוב יותר בעתיד:\n` +
          `${surveyLink}\n\n` +
          `תודה רבה על הזמן וההשקעה,\n` +
          `צוות עוזימן`;
        await channel.send({ content: msg });
      }
    }
  }
});
