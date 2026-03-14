
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { PriceList } from '../models/PriceList';
import { CashRegister, CashSession } from '../models/Cash';
import { Organization } from '../models/Organization';

dotenv.config();

const cleanupAndFix = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || '');
        console.log('[DEBUG] Connected to DB');

        const orgSlug = 'glossprueba';
        const org = await Organization.findOne({ slug: { $regex: new RegExp(`^${orgSlug}$`, 'i') } });
        if (!org) { console.error('Org not found'); return; }

        console.log(`[INFO] Fixing data for Organization: ${org.name} (${org._id})`);

        // 1. DELETE DUPLICATE PRICELISTS (Redundant check but safe)
        const idsToDelete = ['69517fe4bb55c75785fb1ee1', '69517fe4bb55c75785fb1ee4'];
        const deleteRes = await PriceList.deleteMany({ _id: { $in: idsToDelete } });
        console.log(`[SUCCESS] Deleted ${deleteRes.deletedCount} Duplicate PriceLists.`);

        // 2. FIX CASH REGISTER ORPHANS
        // Find registers that do NOT match the target Org ID (essentially reassigning all others to this one)
        // CAUTION: This assumes this is a single-tenant local DB for this user. 
        // Given the context (local dev, restoration), this is the desired behavior.
        const orphanedRegisters = await CashRegister.find({ organization: { $ne: org._id } });
        console.log(`[INFO] Found ${orphanedRegisters.length} Registers belonging to other/orphaned Orgs.`);

        const regUpdateRes = await CashRegister.updateMany(
            { organization: { $ne: org._id } },
            { $set: { organization: org._id } }
        );
        console.log(`[SUCCESS] Reassigned ${regUpdateRes.modifiedCount} Registers to '${org.name}'.`);

        // 3. FIX CASH SESSIONS
        // Find ALL registers now belonging to this org
        const allRegisters = await CashRegister.find({ organization: org._id });
        const registerIds = allRegisters.map(r => r._id);
        console.log(`[INFO] Total Registers for '${org.name}': ${registerIds.length}`);

        // Reassign sessions linked to these registers
        const sessionUpdateRes = await CashSession.updateMany(
            { cashRegister: { $in: registerIds }, organization: { $ne: org._id } },
            { $set: { organization: org._id } }
        );
        console.log(`[SUCCESS] Reassigned ${sessionUpdateRes.modifiedCount} CashSessions to '${org.name}'.`);

    } catch (error) {
        console.error('[ERROR]', error);
    } finally {
        await mongoose.disconnect();
    }
};

cleanupAndFix();
