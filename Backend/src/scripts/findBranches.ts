import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lac-pos';

async function diagnose() {
    try {
        await mongoose.connect(MONGODB_URI);
        const Branch = mongoose.model('Branch', new mongoose.Schema({}, { strict: false }));
        const branches = await Branch.find({});
        console.log('ALL BRANCHES IN DB:', branches.length);
        branches.forEach((b: any) => {
            console.log(`Branch: ${b.name} - ID: ${b._id} - OrgID: ${b.organization_id}`);
        });
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

diagnose();
