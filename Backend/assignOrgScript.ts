
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './src/models/User';
import { Organization } from './src/models/Organization';

dotenv.config();

const assignOrg = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || '');
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Debug: List all Orgs
        const allOrgs = await Organization.find({});
        console.log("Available Organizations:", allOrgs.map(o => `${o.name} (Slug: ${o.slug})`));

        const email = 'Luchincaelli@gmail.com';
        const orgSlug = 'glossprueba';

        const org = await Organization.findOne({ slug: orgSlug });
        if (!org) {
            console.error(`Organization with slug '${orgSlug}' not found!`);
            process.exit(1);
        }
        console.log(`Found Organization: ${org.name} (ID: ${org._id})`);

        // Case insensitive email search just in case
        const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
        if (!user) {
            console.error(`User with email '${email}' not found!`);
            process.exit(1);
        }
        console.log(`Found User: ${user.name} (ID: ${user._id})`);

        user.organization = org._id;
        await user.save();

        console.log('SUCCESS: User assigned to Organization.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

assignOrg();
