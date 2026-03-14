
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const debugRawBranches = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || '');
        console.log('[DEBUG] Connected to DB');

        // Use native collection to bypass Schema restrictions
        const branches = await mongoose.connection.collection('branches').find({}).toArray();
        console.log(`[INFO] Found ${branches.length} Branches in collection 'branches'.`);

        branches.forEach(b => {
            console.log('\n--- Branch ---');
            console.log(`ID: ${b._id}`);
            console.log(`Name: ${b.name}`);
            console.log(`Organization (Field): ${b.organization}`);
            console.log(`OrganizationID (Field): ${b.organization_id}`);
            // Check keys
            console.log('Keys:', Object.keys(b));
        });

    } catch (error) {
        console.error('[ERROR]', error);
    } finally {
        await mongoose.disconnect();
    }
};

debugRawBranches();
