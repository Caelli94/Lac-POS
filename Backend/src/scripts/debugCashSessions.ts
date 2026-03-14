
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { CashSession } from '../models/Cash';

dotenv.config({ path: 'e:/LAC-POS/Backend/.env' });

const connectDB = async () => {
    try {
        const uri = 'mongodb+srv://LuchinCaelli:4631911-Lac3762@cluster0.yyzeliw.mongodb.net/mi_sistema_saas?appName=Cluster0';
        await mongoose.connect(uri);
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};

const checkSessions = async () => {
    await connectDB();
    try {
        const sessions = await CashSession.find({}).sort({ openedAt: -1 }).limit(5).lean();

        console.log(`Checking last 5 sessions:`);
        sessions.forEach((s: any) => {
            console.log(`- ID: ${s._id} | Status: ${s.status} | OpeningBalance: ${s.openingBalance} (Type: ${typeof s.openingBalance}) | Org: ${s.organization}`);
        });

    } catch (error) {
        console.error('Error checking sessions:', error);
    } finally {
        mongoose.disconnect();
    }
};

checkSessions();
