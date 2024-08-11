# Nadav's TypeScript Discord Bot

A powerful Discord bot built with TypeScript and `discord.js`. This bot provides essential features for managing a Discord server and serves as a foundation for further development.

## Features

- **Ticket System:** A basic ticket system to help and sgive support to discord server members
- **Log System:** A basic logging system to keep track of what is going on in the discord server
- **Default Role:** Give default role on member join
- **Private Chat:** A private chat system with server admins and a specific user
- **VIP Auto Private Chat:** Open and close a private chat for user with a specific role

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

### **TypeScript** (version 5.x or later)

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

## Acknowledgments

- [discord.js](https://discord.js.org/) - A powerful library for interacting with the Discord API.
- [TypeScript](https://www.typescriptlang.org/) - A superset of JavaScript that adds static types.

For questions or support, please open an issue on GitHub or contact [nadavson02@gmail.com](mailto:nadavson02@gmail.com).
