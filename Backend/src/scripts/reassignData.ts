
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Organization } from '../models/Organization';
import { Customer } from '../models/Customer';
import { Supplier } from '../models/Supplier';
import { Branch } from '../models/Branch';
import { CashRegister } from '../models/Cash';
import { Sale } from '../models/Sale';
import { PriceList } from '../models/PriceList';

dotenv.config();

const reassignData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || '');
        console.log('[DEBUG] Connected to DB');

        // 1. Find the Target Organization 'GlossPrueba'
        const orgSlug = 'glossprueba';
        const org = await Organization.findOne({ slug: { $regex: new RegExp(`^${orgSlug}$`, 'i') } });

        if (!org) {
            console.error(`[ERROR] Target Organization '${orgSlug}' NOT FOUND.`);
            return;
        }

        console.log(`[INFO] Target Org: ${org.name} (ID: ${org._id})`);

        // 2. Reassign Customers
        const customerResult = await Customer.updateMany(
            { organization_id: { $ne: org._id } }, // Update if NOT already this org (covers null/missing/wrong)
            { $set: { organization_id: org._id } }
        );
        console.log(`[SUCCESS] Reassigned ${customerResult.modifiedCount} Customers to '${org.name}'.`);

        // 3. Reassign Suppliers
        const supplierResult = await Supplier.updateMany(
            { organization_id: { $ne: org._id } },
            { $set: { organization_id: org._id } }
        );
        console.log(`[SUCCESS] Reassigned ${supplierResult.modifiedCount} Suppliers to '${org.name}'.`);

        // 4. Reassign Branches
        const branchResult = await Branch.updateMany(
            { organization_id: { $ne: org._id } },
            { $set: { organization_id: org._id } }
        );
        console.log(`[SUCCESS] Reassigned ${branchResult.modifiedCount} Branches to '${org.name}'.`);

        // 5. Reassign Cash Registers
        const cashResult = await CashRegister.updateMany(
            { organization_id: { $ne: org._id } },
            { $set: { organization_id: org._id } }
        );
        console.log(`[SUCCESS] Reassigned ${cashResult.modifiedCount} Cash Registers to '${org.name}'.`);

        // 6. Reassign Sales
        const saleResult = await Sale.updateMany(
            { organization_id: { $ne: org._id } },
            { $set: { organization_id: org._id } }
        );
        console.log(`[SUCCESS] Reassigned ${saleResult.modifiedCount} Sales to '${org.name}'.`);

        // 7. Reassign PriceLists
        const priceListResult = await PriceList.updateMany(
            { organization_id: { $ne: org._id } },
            { $set: { organization_id: org._id } }
        );
        console.log(`[SUCCESS] Reassigned ${priceListResult.modifiedCount} PriceLists to '${org.name}'.`);

    } catch (error) {
        console.error('[ERROR]', error);
    } finally {
        await mongoose.disconnect();
    }
};

reassignData();
