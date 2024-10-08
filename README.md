# Nadav's TypeScript Discord Bot

A powerful Discord bot built with TypeScript and `discord.js`. This bot provides essential features for managing a Discord server and serves as a foundation for further development.

## Features

- **Ticket System:** A basic ticket system to help and sgive support to discord server members
- **Log System:** A basic logging system to keep track of what is going on in the discord server
- **Default Role:** Give default role on member join
- **Private Chat:** A private chat system with server admins and a specific user
- **VIP Auto Private Chat:** Open and close a private chat for user with a specific role
- **Automation FIFA Investments:** Posts and handles EA FC cards investments
- **Investments Tracking:** Custom and personal investments tracking system

## Software Requirements

To develop and run this Discord bot, you'll need the following software installed:

### **Node.js** 

- **Download Node.js:** [nodejs.org](https://nodejs.org/)
- **Verify Installation:**

   ```bash
   node -v
   ```

### **npm** (Node Package Manager)

- **Included with Node.js**. Verify installation:

   ```bash
   npm -v
   ```

### **TypeScript**

- **Install TypeScript Globally:**

   ```bash
   npm install -g typescript
   ```

- **Verify Installation:**

   ```bash
   tsc -v
   ```

### **Git**

- **Download Git:** [git-scm.com](https://git-scm.com/)
- **Verify Installation:**

   ```bash
   git --version
   ```

## Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/NadavMozeson/typescript-discord-bot.git
   ```

2. **Navigate to the Project Directory**

   ```bash
   cd typescript-discord-bot
   ```

3. **Install Dependencies**

   ```bash
   npm install
   ```

4. **Configure the Bot**

   Create a `.env` file in the root directory and add your bot token:

   ```env
   MONGO_CONNECTION_STRING='YOUR_CONNECTION_STRING'
   DEVELOPER_DISCORD_ID=YOUR_DISCORD_USER_ID
   YOUTUBE_CHANNEL_ID=YOUR_YOUTUBE_CHANNEL_ID
   YOUTUBE_API_KEY=YOUR_YOUTUBE_API_KEY
   ```

5. **Start the Bot**

   ```bash
   npm start
   ```

6. **Run for Development without Build**

   ```bash
   npm run dev
   ```

6. **Build**

   ```bash
   npm run build
   ```

## MongoDB Structure

### Collections
- config
- tickets
- private_dm
- investments
- investments_trackers

### Config Structure
```js
{
  "_id": {
    "$oid": "AUTO_GENERATED_ID_BY_MONGODB"
  },
  "BOT": {
    "Prefix": "!",
    "Token": "YOUR_BOT_TOKEN"
    "Emoji": {
      "PC": "BOT_PC_EMOJI_MARKDOWN",
      "PS": "BOT_PS_EMOJI_MARKDOWN",
      "XBox": "BOT_XBOX_EMOJI_MARKDOWN",
      "FifaCoins": "BOT_FIFACOINS_EMOJI_MARKDOWN"
    }
  },
  "SERVER": {
    "INFO": {
      "ServerId": "SERVER_ID",
      "Owners": [
          "SERVER_OWNER1"
      ],
      "TicketIdle": 10
    },
    "ROLES": {
      "Member": "MEMBER_ROLE_ID",
      "VIP": "VIP_ROLE_ID",
      "Support": "TICKET_SUPPORT_ROLE_ID",
      "Manager": "MANAGER_ROLE_ID"
    },
    "CHANNELS": {
      "LOG": {
        "Main": "MAIN_LOG_CHANNEL_ID",
        "SuggestLog": "SUGGESTIONS_LOG_CHANNEL_ID"
      },
      "STATS": {
        "StatsYouTube": "YOUR_YOUTUBE_STATS_CHANNEL_ID",
        "StatsDiscord": "YOUR_DISCORD_STATS_CHANNEL_ID"
      },
      "InvestmentTracker": {
        "everyone": "INVESTMENTS_TRACKER_ALL_CHANNEL_ID",
        "VIP": "INVESTMENTS_TRACKER_VIP_CHANNEL_ID"
      },
      "Ticket": "TICKET_OPEN_MESSAGE_CHANNEL_ID",
      "Profit": "PROFIT_MESSAGES_CHANNEL_ID",
      "Suggest": "SUGGEST_INPUT_MESSAGES_CHANNEL_ID"
    }
  }
}
```

## Acknowledgments

- [discord.js](https://discord.js.org/) - A powerful library for interacting with the Discord API.
- [TypeScript](https://www.typescriptlang.org/) - A superset of JavaScript that adds static types.

For questions or support, please open an issue on GitHub or contact [nadavson02@gmail.com](mailto:nadavson02@gmail.com).
