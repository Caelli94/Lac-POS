
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const debugBranchType = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || '');
        console.log('[DEBUG] Connected to DB');

        const branches = await mongoose.connection.collection('branches').find({}).toArray();

        console.log(`[INFO] Found ${branches.length} branches.`);

        branches.forEach(b => {
            const orgId = b.organization_id;
            const type = orgId ? orgId.constructor.name : 'undefined';
            console.log(`Branch: ${b.name}`);
            console.log(` - organization_id value: ${orgId}`);
            console.log(` - organization_id type: ${type}`);
        });

    } catch (error) {
        console.error('[ERROR]', error);
    } finally {
        await mongoose.disconnect();
    }
};

debugBranchType();
