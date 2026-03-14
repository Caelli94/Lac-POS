
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Organization } from '../models/Organization';
import { Branch } from '../models/Branch';
import { CashRegister } from '../models/Cash';
import { PriceList } from '../models/PriceList';

dotenv.config();

const debugDuplicates = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || '');
        console.log('[DEBUG] Connected to DB');

        const orgSlug = 'glossprueba';
        const org = await Organization.findOne({ slug: { $regex: new RegExp(`^${orgSlug}$`, 'i') } });

        if (!org) {
            console.error(`[ERROR] Target Organization '${orgSlug}' NOT FOUND.`);
            return;
        }

        console.log(`[INFO] Checking Duplicates for: ${org.name} (ID: ${org._id})`);

        // Check PriceLists
        const priceLists = await PriceList.find({ organization_id: org._id });
        console.log(`\n[INFO] PriceLists Found: ${priceLists.length}`);
        priceLists.forEach(pl => console.log(` - ID: ${pl._id}, Name: ${pl.name}`));

        // Check Branches
        const branches = await Branch.find({ organization_id: org._id });
        console.log(`\n[INFO] Branches Found: ${branches.length}`);
        branches.forEach(b => console.log(` - ID: ${b._id}, Name: ${b.name}`));

        // Check Registers
        const registers = await CashRegister.find({ organization_id: org._id });
        console.log(`\n[INFO] Registers Found: ${registers.length}`);
        registers.forEach(r => console.log(` - ID: ${r._id}, Name: ${r.name}, Branch: ${r.branch_id}`));

    } catch (error) {
        console.error('[ERROR]', error);
    } finally {
        await mongoose.disconnect();
    }
};

debugDuplicates();
