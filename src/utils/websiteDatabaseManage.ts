import { createConnection, Connection } from 'mysql2/promise';

class WebsiteDatabaseManager {
  private connection: Connection | null = null;

  constructor() {
    this.connect()
  }

  private async connect() {
    if (this.connection) {
      return; 
    }

    try {
      this.connection = await createConnection({
        host: process.env.WEBSITE_DB_HOST,
        user: process.env.WEBSITE_DB_USER,
        password: process.env.WEBSITE_DB_PASSWORD,
        database: process.env.WEBSITE_DB_NAME,
      });

      console.log('Database connected successfully');
    } catch (error) {
      console.error('Error connecting to the database:', error);
    }
  }

  private async sendSQLCommand(query: string): Promise<any> {
    if (!this.connection) {
      await this.connect(); 
    }

    try {
      const [rows] = await this.connection!.execute(query);
      return rows;
    } catch (error) {
      console.error('Query error:', error);
    }
  }

  private async close() {
    if (this.connection) {
      try {
        await this.connection.end();
        console.log('Database connection closed');
      } catch (error) {
        console.error('Error closing the database connection:', error);
      } finally {
        this.connection = null; 
      }
    }
  }

  public async isUserVIP(discordID: string): Promise<boolean> {
    try {
        const findResult = await this.sendSQLCommand(`SELECT id, user_id, membership_id, status, enddate FROM wp_pmpro_memberships_users WHERE user_id IN (SELECT user_id FROM wp_usermeta WHERE meta_key = "_ets_pmpro_discord_user_id" AND meta_value = "${discordID}") AND membership_id IN (4, 5, 6) AND status = "active" AND (enddate = '0000-00-00' OR enddate > NOW());`);
        return findResult.length >= 1
    } catch (error) {
        console.error('Error checking if user is VIP', error)
    }
    return false
  }

  public async getAllVIPs(): Promise<string[] | null> {
    try {
        const findResults = await this.sendSQLCommand(`SELECT meta_value FROM wp_usermeta WHERE meta_key = "_ets_pmpro_discord_user_id" AND user_id IN (SELECT user_id FROM wp_pmpro_memberships_users WHERE membership_id IN (4, 5, 6) AND status = "active");`);
        return findResults.map((result: any) => result.meta_value)
    } catch (error) {
        console.error('Error checking if user is VIP', error)
    }
    return null
  }
}

export const wordpressDBManager = new WebsiteDatabaseManager();
