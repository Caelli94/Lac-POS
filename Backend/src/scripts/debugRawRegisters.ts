
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { CashRegister } from '../models/Cash';

dotenv.config();

const debugRawRegisters = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || '');
        console.log('[DEBUG] Connected to DB');

        // Use native collection to bypass Schema restrictions
        const registers = await mongoose.connection.collection('cashregisters').find({}).toArray();
        console.log(`[INFO] Found ${registers.length} Registers in collection 'cashregisters'.`);

        registers.forEach(r => {
            console.log('\n--- Register ---');
            console.log(`ID: ${r._id}`);
            console.log(`Name: ${r.name}`);
            console.log(`Organization (Field): ${r.organization}`);
            console.log(`OrganizationID (Field): ${r.organization_id}`);
            // Check keys
            console.log('Keys:', Object.keys(r));
        });

    } catch (error) {
        console.error('[ERROR]', error);
    } finally {
        await mongoose.disconnect();
    }
};

debugRawRegisters();
