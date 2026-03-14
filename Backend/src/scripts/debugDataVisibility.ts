
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Product } from '../models/Product';
import { Sale } from '../models/Sale';
import { Customer } from '../models/Customer';
import { Supplier } from '../models/Supplier';
import { Branch } from '../models/Branch';
import { CashRegister } from '../models/Cash';
import { PriceList } from '../models/PriceList';

dotenv.config();

const debugVisibility = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || '');
        console.log('[DEBUG] Connected to DB');

        // 1. Find the Organization 'GlossPrueba'
        // Trying slug first, then name
        const orgSlug = 'glossprueba';
        let org = await Organization.findOne({ slug: { $regex: new RegExp(`^${orgSlug}$`, 'i') } });

        if (!org) {
            console.log(`[ERROR] Organization with slug '${orgSlug}' NOT FOUND.`);
            // Try to find ANY org to see what's there
            const allOrgs = await Organization.find({}).limit(5);
            console.log('[INFO] Available Orgs:', allOrgs.map(o => ({ id: o._id, slug: o.slug, name: o.name })));
            return;
        }

        console.log(`[INFO] Found Org: ${org.name} (ID: ${org._id})`);

        // 2. Check Data linked to this Org ID
        const activeProductCount = await Product.countDocuments({ organization_id: org._id, deleted: { $ne: true } });
        const deletedProductCount = await Product.countDocuments({ organization_id: org._id, deleted: true });
        const saleCount = await Sale.countDocuments({ organization_id: org._id });
        const customerCount = await Customer.countDocuments({ organization_id: org._id });
        const supplierCount = await Supplier.countDocuments({ organization_id: org._id });
        const branchCount = await Branch.countDocuments({ organization_id: org._id });
        const registerCount = await CashRegister.countDocuments({ organization_id: org._id });
        const priceListCount = await PriceList.countDocuments({ organization_id: org._id });

        console.log(`[INFO] Data for Org ID ${org._id}:`);
        console.log(`   - Active Products: ${activeProductCount}`);
        console.log(`   - Deleted Products: ${deletedProductCount}`);
        console.log(`   - Sales: ${saleCount}`);
        console.log(`   - Customers: ${customerCount}`);
        console.log(`   - Suppliers: ${supplierCount}`);
        console.log(`   - Branches: ${branchCount}`);
        console.log(`   - Registers: ${registerCount}`);
        console.log(`   - PriceLists: ${priceListCount}`);

        // 3. Check for Orphaned Data
        const totalProducts = await Product.countDocuments({});
        const totalCustomers = await Customer.countDocuments({});
        const totalSuppliers = await Supplier.countDocuments({});
        const totalBranches = await Branch.countDocuments({});
        const totalRegisters = await CashRegister.countDocuments({});
        const totalPriceLists = await PriceList.countDocuments({});

        console.log(`[INFO] Global DB Counts:`);
        console.log(`   - Total Products: ${totalProducts}`);
        console.log(`   - Total Customers: ${totalCustomers}`);
        console.log(`   - Total Suppliers: ${totalSuppliers}`);
        console.log(`   - Total Branches: ${totalBranches}`);
        console.log(`   - Total Registers: ${totalRegisters}`);
        console.log(`   - Total PriceLists: ${totalPriceLists}`);

        if (totalProducts > 0 && activeProductCount === 0) {
            console.log(`[WARN] Mismatch detected! User has CORRECT Org ID, but 0 products found with that ID.`);
            console.log(`[HINT] Check if products have a different Org ID or are deleted.`);
            const sample = await Product.findOne({});
            console.log('   - Sample Product Org ID:', sample?.organization_id);
        }

        // 4. Check the User (assuming we know the email, let's try the one mentioned before or list admins)
        // Adjust email as needed based on context context
        const email = 'lucho@gmail.com';
        const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });

        if (user) {
            console.log(`[INFO] User '${email}' found.`);
            console.log(`   - User Org ID: ${user.organization}`);
            console.log(`   - Match? ${user.organization?.toString() === org._id.toString() ? 'YES' : 'NO'}`);
            if (user.organization?.toString() !== org._id.toString()) {
                console.log('[CRITICAL] User is linked to a DIFFERENT Organization ID!');
            }
        } else {
            console.log(`[WARN] User '${email}' not found.`);
        }

    } catch (error) {
        console.error('[ERROR]', error);
    } finally {
        await mongoose.disconnect();
    }
};

debugVisibility();
