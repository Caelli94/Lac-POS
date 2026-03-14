
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const debugMixedTypes = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || '');
        console.log('[DEBUG] Connected to DB');

        const sales = await mongoose.connection.collection('sales').find({}).limit(5).toArray();
        console.log(`[INFO] Checked ${sales.length} Sales.`);
        sales.forEach(s => {
            const orgId = s.organization_id;
            const type = orgId ? orgId.constructor.name : 'undefined';
            console.log(`Sale: ${s._id} | OrgID Type: ${type} | Value: ${orgId}`);
        });

        const sessions = await mongoose.connection.collection('cashsessions').find({}).limit(5).toArray();
        console.log(`[INFO] Checked ${sessions.length} CashSessions.`);
        sessions.forEach(s => {
            const orgId = s.organization;
            const type = orgId ? orgId.constructor.name : 'undefined';
            console.log(`Session: ${s._id} | OrgID Type: ${type} | Value: ${orgId}`);
        });

    } catch (error) {
        console.error('[ERROR]', error);
    } finally {
        await mongoose.disconnect();
    }
};

debugMixedTypes();
