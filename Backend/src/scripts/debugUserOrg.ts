
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
// Import models to ensure registration
import '../models/Organization';
import { User } from '../models/User';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || '');
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

const debugUsers = async () => {
    await connectDB();

    // Manual check to ensure model is registered
    if (!mongoose.models.Organization) {
        console.log("Registering Organization model manually...");
        require('../models/Organization');
    }

    const users = await User.find({}).populate('organization');

    console.log('--- USER DEBUG DUMP ---');
    users.forEach(u => {
        const orgName = (u.organization as any)?.name || 'N/A';
        const orgId = (u.organization as any)?._id || u.organization; // In case populate fails or is raw ID
        console.log(`User: ${u.email} | Role: ${u.role} | Org: ${orgName} (${orgId})`);
    });
    console.log('-----------------------');

    process.exit();
};

debugUsers();
