import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function migrateOrgIds() {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) throw new Error('MONGO_URI not found');

        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const Customer = mongoose.model('Customer', new mongoose.Schema({}, { strict: false }));
        const CustomerAccount = mongoose.model('CustomerAccount', new mongoose.Schema({}, { strict: false }));

        // 1. Migrate Customers
        const customersToMigrate = await Customer.find({ organization_id: { $type: 'string' } });
        console.log(`Clientes encontrados para migrar: ${customersToMigrate.length}`);

        let migratedCustomers = 0;
        for (const customer of customersToMigrate) {
            const orgIdStr = (customer as any).organization_id;
            if (mongoose.Types.ObjectId.isValid(orgIdStr)) {
                await Customer.updateOne(
                    { _id: customer._id },
                    { $set: { organization_id: new mongoose.Types.ObjectId(orgIdStr) } }
                );
                migratedCustomers++;
            }
        }
        console.log(`Clientes migrados exitosamente: ${migratedCustomers}`);

        // 2. Migrate CustomerAccounts
        const accountsToMigrate = await CustomerAccount.find({ organization_id: { $type: 'string' } });
        console.log(`Cuentas encontradas para migrar: ${accountsToMigrate.length}`);

        let migratedAccounts = 0;
        for (const account of accountsToMigrate) {
            const orgIdStr = (account as any).organization_id;
            if (mongoose.Types.ObjectId.isValid(orgIdStr)) {
                await CustomerAccount.updateOne(
                    { _id: account._id },
                    { $set: { organization_id: new mongoose.Types.ObjectId(orgIdStr) } }
                );
                migratedAccounts++;
            }
        }
        console.log(`Cuentas migradas exitosamente: ${migratedAccounts}`);

        await mongoose.disconnect();
        console.log('\nMigración completada.');
    } catch (error) {
        console.error('Error durante la migración:', error);
    }
}

migrateOrgIds();
