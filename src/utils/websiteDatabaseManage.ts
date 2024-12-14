import { createConnection, Connection } from 'mysql2/promise';

const API_URL = 'http://oziman.shop/wp-json/custom/v1/'

class WebsiteDatabaseManager {
  public async isUserVIP(discordID: string): Promise<boolean> {
    try {
      const response = await fetch(API_URL + 'isUserVIP/' + discordID, {
          method: 'GET',
          headers: {
              'Content-Type': 'application/json',
          },
      });

      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.is_vip;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
  }

  public async getAllVIPs(): Promise<string[] | null> {
    try {
      const response = await fetch(API_URL + 'getAllVIP', {
          method: 'GET',
          headers: {
              'Content-Type': 'application/json',
          },
      });

      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.status === 'success') {
        return data.vips;
      } else {
        return []
      }
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
  }
}

export const wordpressDBManager = new WebsiteDatabaseManager();
