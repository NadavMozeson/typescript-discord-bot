import { MongoClient, Collection, Db, WithId, Document, ObjectId, Long } from 'mongodb';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { disableInvestmentButtons } from '../assets/investmentTracker.js';

// MongoDB connection URL and database name
const CONNECTION_URL = process.env.MONGO_CONNECTION_STRING as string;
const currentDir = dirname(fileURLToPath(import.meta.url));
const dbName = currentDir.includes('sw33t') ? 'TestBot' : 'Oziman';

// Create a new MongoClient
const client = new MongoClient(CONNECTION_URL);

// Collections mapping
const collections: Record<string, Collection> = {};

export async function initializeDatabase() {
	try {
		await client.connect();
		const db: Db = client.db(dbName);
		collections.giveaways = db.collection('giveaways');
		collections.investments = db.collection('investments');
		collections.temp_users = db.collection('temp_users');
		collections.vip_videos = db.collection('vip_videos');
		collections.private_dm = db.collection('private_dm');
		collections.tickets = db.collection('tickets');
		collections.config = db.collection('config');
		collections.polls = db.collection('polls');
		collections.polls_answers = db.collection('polls_answers');
		collections.investments_trackers = db.collection('investments_trackers');
		collections.payslips = db.collection('payslips');
		collections.daily_login = db.collection('daily_login');
		collections.questions = db.collection('questions');
	} catch (error) {
		console.error('Error connecting to MongoDB', error);
	}
}

const addDataToDatabase = async (collectionName: string, data: any) => {
	const collection = collections[collectionName];
	return await collection.insertOne(data);
};

const deleteDataFromDatabase = async (collectionName: string, data: any) => {
	const collection = collections[collectionName];
	await collection.deleteOne(data);
};

const bulkDeleteDataFromDatabase = async (collectionName: string, data: any) => {
	const collection = collections[collectionName];
	await collection.deleteMany(data);
};

const checkIfDataInDatabase = async (collectionName: string, data: any) => {
	const collection = collections[collectionName];
	const result = await collection.findOne(data);
	return result !== null;
};

const updateOneData = async (collectionName: string, data: any, update: any) => {
	const collection = collections[collectionName];
	await collection.updateOne(data, { $set: update });
};

const getDataFromDatabase = async (collectionName: string, data: any): Promise<WithId<Document> | null>  => {
	const collection = collections[collectionName];
	if (await checkIfDataInDatabase(collectionName, data)) {
		return await collection.findOne(data);
	}
	return null;
};

const getAllDataFromDatabase = async (collectionName: string) => {
	const collection = collections[collectionName];
	const data = await collection.find().toArray();
	return data;
};

const getAllDataWithSearchInDatabase = async (collectionName: string, data: any) => {
	const collection = collections[collectionName];
	const searchResults = await collection.find(data).toArray();
	return searchResults;
};

interface Config {
    _id: {
      $oid: string;
    };
    BOT: {
      Prefix: string;
      Token: string;
      Emoji: {
        PC: string,
        PS: string,
        XBox: string,
        FifaCoins: string,
        TOTW: string,
        Like: string,
        Dislike: string
      }
    };
    SERVER: {
      INFO: {
        ServerId: string;
        Owners: string[];
        TicketIdle: number;
      };
      ROLES: {
        Member: string;
        everyone: string;
        VIP: string;
        Support: string;
        Manager: string;
      };
      CHANNELS: {
        LOG: {
          Main: string;
          SuggestLog: string;
          StaffForms: string;
          EditorForms: string;
          VIPLog: string;
        };
        FirstExit: {
          everyone: string;
          VIP: string;
        };
        STATS: {
          StatsYouTube: string;
          StatsInstagram: number;
          StatsDiscord: string;
          StatsTemp: number;
          StatsVIP: number;
        };
        InvestmentTracker: {
          VIP: string;
          everyone: string;
        },
        Ticket: string;
        Profit: string;
        Managment: string;
        Suggest: string;
        TeamRating: string;
        DailyLogin: string;
        VotingChannel: string[];
        FAQ: string;
        SyncGuide: string;
      };
    };
    VIP_SERVER: {
      INFO: {
        ServerId: string;
        Owners: string[];
      };
      ROLES: {
        VIP: string;
      };
      CHANNELS: {
        FirstExit: string;
        Profit: string;
        Welcome: string;
        VIPStats: string;
      };
    }
}

const isConfig = (data: any): data is Config => {
  return data && typeof data === 'object' &&
    typeof data.BOT === 'object' &&
    typeof data.SERVER === 'object';
};

export const getConfigFromDatabase = async (): Promise<Config> => {
  const collection = collections.config;
  const data: WithId<Document>[] = await collection.find().toArray();
  
  const result = data[0];

  if (!isConfig(result)) {
    throw new Error('Invalid configuration data');
  }

  return result;
};


class DatabaseHandler {
	collectionName: string;

	constructor(collectionName: string) {
		this.collectionName = collectionName;
	}

	async addData(data: any) {
		return await addDataToDatabase(this.collectionName, data);
	}

	async getData(data: any) {
		return await getDataFromDatabase(this.collectionName, data);
	}

	async getAllData() {
		return await getAllDataFromDatabase(this.collectionName);
	}

	async checkIfExists(data: any) {
		return await checkIfDataInDatabase(this.collectionName, data);
	}

	async deleteData(data: any) {
		await deleteDataFromDatabase(this.collectionName, data);
	}

	async bulkDeleteData(data: any) {
		await bulkDeleteDataFromDatabase(this.collectionName, data);
	}

	async getAllDataWithSearch(data: any) {
		return await getAllDataWithSearchInDatabase(this.collectionName, data);
	}

	async updateOneData(data: any, update: any) {
		await updateOneData(this.collectionName, data, update);
	}
}

class TicketsManager {
  ticketsHandler = new DatabaseHandler('tickets')
  async getAllTickets() {
      return await this.ticketsHandler.getAllData()
  }
  async createNewTicket(userID: string, channelID: string) {
      await this.ticketsHandler.addData({ 'user': userID, 'channel': channelID })
  }
  async checkIfTicketExists(userID: string) {
      return await this.ticketsHandler.checkIfExists({ 'user': userID })
  }
  async getTicketChannel(userID: string) {
      const data = await this.ticketsHandler.getData({ 'user': userID })
      return data?.channel
  }
  async deleteTicket(channelID: string) {
      await this.ticketsHandler.deleteData({ 'channel': channelID })
  }
}

class PrivateChatManager {
  privateDMHandler = new DatabaseHandler('private_dm')
  async getAll() {
      return await this.privateDMHandler.getAllData()
  }
  async createNewChat(userID: string, channelID: string, isVIP: boolean = false) {
      await this.privateDMHandler.addData({ 'user': userID, 'channel': channelID, 'VIP': isVIP })
  }
  async checkIfChatExists(userID: string) {
      return await this.privateDMHandler.checkIfExists({ 'user': userID })
  }
  async getChatChannel(userID: string) {
      const data = await this.privateDMHandler.getData({ 'user': userID })
      return data?.channel
  }
  async deleteChat(channelID: string) {
      await this.privateDMHandler.deleteData({ 'channel': channelID })
  }
}

class InvestmentsManager {
  investmentsHandler = new DatabaseHandler('investments')
  async createNewInvestment(name:string, link: string, nation: string, rating: string, version: string, risk: string, channel: string, console_price: string, pc_price: string, user: string, msg: string, isVIP: boolean = false ) {
      const insertedData = await this.investmentsHandler.addData({
        "name": name,
        "nation": nation,
        "rating": rating,
        "link": link,
        "risk": risk,
        "channel": channel,
        "console price": console_price,
        "pc price": pc_price,
        "user": user,
        "msg": msg,
        "version": version,
        "vip": isVIP
      })
      return insertedData
  }
  async getAllInvestment(){
    return await this.investmentsHandler.getAllData()
  }
  async getInvestmentByID(id: string){
    return await this.investmentsHandler.getData({ '_id': new ObjectId(id) })
  }
  async deleteInvestmentByID(id: string) {
    await (new InvestmentsTrackerManager()).deleteAllTrackerOfInvestment(id)
    const deletedData = await this.investmentsHandler.deleteData({ '_id': new ObjectId(id) })
    return deletedData
  }
}

class InvestmentsTrackerManager {
  InvestmentsTrackerHandler = new DatabaseHandler('investments_trackers')
  async createNewTracker(userID: string, investmentID: string ) {
    return await this.InvestmentsTrackerHandler.addData({ 'user': userID, 'investment': investmentID })
  }
  async deleteTracker(userID: string, investmentID: string) {
    return await this.InvestmentsTrackerHandler.deleteData({ 'user': userID, 'investment': investmentID })
  }
  async checkIfExists(userID: string, investmentID: string) {
    return await this.InvestmentsTrackerHandler.checkIfExists({ 'user': userID, 'investment': investmentID })
  }
  async getAllTrackerOfInvestment(investmentID: string) {
    return await this.InvestmentsTrackerHandler.getAllDataWithSearch({ 'investment': investmentID })
  }
  async deleteAllTrackerOfInvestment(investmentID: string) {
    await disableInvestmentButtons(investmentID)
    return await this.InvestmentsTrackerHandler.bulkDeleteData({ 'investment': investmentID })
  }
}

class FAQManager {
  FAQHandler = new DatabaseHandler('questions')
  async createNewQuestion(question: string, answer: string) {
    return await this.FAQHandler.addData({ 'question': question, 'answer': answer })
  }
  async getAllQuestions() {
    return await this.FAQHandler.getAllData()
  }
  async getAnswer(id: string) {
    return await this.FAQHandler.getData({ '_id': new ObjectId(id) })
  }
}

class DatabaseManagerClass {
    Tickets = new TicketsManager()
    DM = new PrivateChatManager()
    Investments = new InvestmentsManager()
    InvestmentsTracker = new InvestmentsTrackerManager()
    FAQ = new FAQManager()
}

export const dbManager = new DatabaseManagerClass()