
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { PriceList } from '../models/PriceList';
import { CashRegister } from '../models/Cash';

dotenv.config();

const cleanupDuplicates = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || '');
        console.log('[DEBUG] Connected to DB');

        // 1. Clean Duplicate PriceLists
        const idsToDelete = [
            '69517fe4bb55c75785fb1ee1',
            '69517fe4bb55c75785fb1ee4'
        ]; // The 2nd and 3rd duplicates found

        const deleteRes = await PriceList.deleteMany({ _id: { $in: idsToDelete } });
        console.log(`[SUCCESS] Deleted ${deleteRes.deletedCount} Duplicate PriceLists.`);

        // 2. Debug Registers (Global)
        const allRegisters = await CashRegister.find({});
        console.log(`[INFO] Global Registers Found: ${allRegisters.length}`);
        allRegisters.forEach(r => {
            console.log(` - Reg ID: ${r._id}, Name: ${r.name}, OrgID: ${r.organization}, BranchID: ${r.branch_id}`);
        });

    } catch (error) {
        console.error('[ERROR]', error);
    } finally {
        await mongoose.disconnect();
    }
};

cleanupDuplicates();
