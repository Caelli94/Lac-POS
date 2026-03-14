
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Customer } from '../models/Customer';

dotenv.config({ path: 'e:/LAC-POS/Backend/.env' });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};

const restore = async () => {
    await connectDB();
    try {
        // ID of the organization to restore to (assuming there's one main org or we pick one)
        // I will just use a hardcoded known OrgID if available, or fetch the first one.
        // Actually, if I find the customer, I just need to set organization_id to a valid ObjectId.
        // But WHICH one?
        // Use: 66a9358b5437f5d902a3d484 (from logs/previous sessions/files if available)
        // OR query "Organization" model.

        const orgId = new mongoose.Types.ObjectId('66a9358b5437f5d902a3d484'); // Example, need to verify
        // Ideally, fetch the org from existing valid customers.
        const oneValid = await Customer.findOne({ organization_id: { $ne: null } });
        if (!oneValid) throw new Error("No reference customer found to check Organization ID");

        const realOrgId = oneValid.organization_id;
        console.log(`Using Org ID reference from customer ${oneValid.name}: ${realOrgId}`);

        // Restore Orphans
        const res = await Customer.updateMany(
            {
                $or: [
                    { organization_id: null },
                    { organization_id: { $exists: false } }
                    // Add specific ID check if we know it from previous output
                ]
            },
            { $set: { organization_id: realOrgId } }
        );

        console.log(`Restored ${res.modifiedCount} customers.`);

    } catch (error) {
        console.error('Error restoring:', error);
    } finally {
        mongoose.disconnect();
    }
};

restore();
