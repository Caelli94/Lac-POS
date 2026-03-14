
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

const findOrphans = async () => {
    await connectDB();

    try {
        // Use lean() to get plain JS objects and avoid TS document type issues
        const allCustomers: any[] = await Customer.find({}).lean();
        console.log(`Checking ${allCustomers.length} customers...`);

        const orphans = allCustomers.filter((c: any) => {
            if (!c.organization_id) return true;
            // Check if it's a valid objectId
            if (!mongoose.Types.ObjectId.isValid(c.organization_id.toString())) return true;
            return false;
        });

        console.log(`Found ${orphans.length} orphaned customers:`);
        orphans.forEach((o: any) => {
            console.log(`- ID: ${o._id} | Name: ${o.name} | OrgID: ${o.organization_id} | Update: ${o.updatedAt}`);
        });

        // Also, check specifically for any customer updated in the last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recent = allCustomers.filter(c => new Date(c.updatedAt) > oneHourAgo);
        console.log(`Recently updated customers (${recent.length}):`);
        recent.forEach(c => {
            console.log(`- ID: ${c._id} | Name: ${c.name} | OrgID: ${c.organization_id}`);
        });

    } catch (error) {
        console.error('Error finding orphans:', error);
    } finally {
        mongoose.disconnect();
    }
};

findOrphans();
