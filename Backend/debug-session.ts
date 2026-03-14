
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { CashRegister, CashSession } from './src/models/Cash';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lac-pos';

const run = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        const registerId = '695189b412a09e39503a0acd'; // ID obtained from user screenshot

        const register = await CashRegister.findById(registerId);
        console.log('--- REGISTER ---');
        console.log(register);

        const openSession = await CashSession.findOne({ cashRegister: registerId, status: 'open' });
        console.log('--- OPEN SESSION ---');
        console.log(openSession);

        const lastSession = await CashSession.findOne({ cashRegister: registerId }).sort({ createdAt: -1 });
        console.log('--- LAST SESSION (ANY) ---');
        console.log(lastSession);

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
