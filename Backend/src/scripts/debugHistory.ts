
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { CashSession } from '../models/Cash';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI || "";
        await mongoose.connect(uri);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

const run = async () => {
    await connectDB();

    try {
        console.log('--- Checking Cash Sessions ---');
        const sessions = await CashSession.find({}).sort({ openedAt: -1 }).limit(20);

        if (sessions.length === 0) {
            console.log('No sessions found.');
        } else {
            console.log(`Found ${sessions.length} sessions (showing last 20):`);
            sessions.forEach(s => {
                console.log(`ID: ${s._id}`);
                console.log(`  Org: ${s.organization}`);
                console.log(`  Register: ${s.cashRegister}`);
                console.log(`  Status: ${s.status}`);
                console.log(`  OpenedAt: ${s.openedAt} (Local: ${s.openedAt.toLocaleString()})`);
                console.log(`  ClosedAt: ${s.closedAt ? s.closedAt + ' (Local: ' + s.closedAt.toLocaleString() + ')' : 'N/A'}`);
                console.log('--------------------------');
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

run();
