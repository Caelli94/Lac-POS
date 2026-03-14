
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../models/User';
import { Organization } from '../models/Organization'; // Register model

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('Connection Error:', error);
        process.exit(1);
    }
};

const debugUsers = async () => {
    await connectDB();

    // Force registration of Organization model
    try {
        await Organization.init();
    } catch (e) {
        // ignore if already init
    }

    try {
        const users = await User.find({}).populate('organization');
        console.log(`\n--- FOUND ${users.length} USERS ---\n`);

        for (const u of users) {
            console.log(`ID: ${u._id}`);
            console.log(`Name: ${u.name}`);
            console.log(`Email: ${u.email}`);
            console.log(`Role: ${u.role}`);
            // Safe access to organization populated fields
            const orgName = u.organization && (u.organization as any).name ? (u.organization as any).name : 'NONE';
            const orgSlug = u.organization && (u.organization as any).slug ? (u.organization as any).slug : 'NONE';

            console.log(`Org: ${orgName} (${orgSlug})`);
            console.log(`Failed Attempts: ${u.failedLoginAttempts}`);
            console.log(`Locked Until: ${u.lockUntil ? u.lockUntil.toISOString() : 'Not Locked'}`);
            console.log(`Pass starts with: ${u.password?.substring(0, 10)}... (Is Hash? ${u.password && u.password.startsWith('$2')})`);

            // AUTO-UNLOCK Luco
            if (u.email.toLowerCase() === 'luco@gmail.com') {
                console.log('>>> UNLOCKING LUCO ACCOUNT <<<');
                u.failedLoginAttempts = 0;
                u.lockUntil = undefined;
                await u.save();
                console.log('>>> LUCO UNLOCKED <<<');
            }

            console.log('------------------------------');
        }

    } catch (error) {
        console.error('Error debugging users:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

debugUsers();
