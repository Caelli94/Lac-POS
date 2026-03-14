
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Sale } from '../models/Sale';

dotenv.config();

const debugCustomerTypes = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || '');
        console.log('[DEBUG] Connected to DB');

        const sales = await mongoose.connection.collection('sales').find({}).sort({ date: -1 }).limit(5).toArray();
        console.log(`[INFO] Checked last ${sales.length} Sales.`);
        sales.forEach(s => {
            const custId = s.customer_id;
            const type = custId ? custId.constructor.name : 'undefined';
            console.log(`Sale: ${s._id} | CustomerID Type: ${type} | Value: ${custId}`);
        });

    } catch (error) {
        console.error('[ERROR]', error);
    } finally {
        await mongoose.disconnect();
    }
};

debugCustomerTypes();
