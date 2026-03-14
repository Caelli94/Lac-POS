
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Customer } from '../models/Customer';
import { CustomerAccount } from '../models/CustomerAccount';
import { AccountMovement } from '../models/AccountMovement';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lac-pos';

async function diagnose() {
    try {
        await mongoose.connect(MONGODB_URI);

        const names = ['Remotti Ayelen', 'Short de la Selva', 'Prueba'];

        console.log('--- ORGANIZACIONES ---');
        const Organization = mongoose.model('Organization', new mongoose.Schema({}, { strict: false }));
        const orgs = await Organization.find({});
        orgs.forEach((o: any) => console.log(`  Org: ${o.name || o.slug} - ID: ${o._id}`));

        console.log('\n--- USUARIOS ---');
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        const users = await User.find({ role: 'admin' });
        users.forEach((u: any) => console.log(`  User: ${u.email} - OrgID: ${u.organization} - Role: ${u.role}`));

        const user = users.find((u: any) => u.email === 'lucho@gmail.com');
        if (user) {
            console.log('\n--- PRUEBA DE COMPARACIÓN (BACKEND LOGIC) ---');
            const userOrg = (user as any).organization;
            // Simulate the controller's logic
            const userOrgId = userOrg._id ? userOrg._id.toString() : userOrg.toString();
            console.log(`  userOrgId calculado: "${userOrgId}" (type: ${typeof userOrgId})`);

            for (const name of names) {
                const customers = await Customer.find({ name: new RegExp(name, 'i') });
                for (const c of customers) {
                    const account = await CustomerAccount.findOne({ customer_id: c._id });
                    if (account) {
                        const accountOrgId = account.organization_id.toString();
                        console.log(`  Comparando con ${name} (Account): "${accountOrgId}"`);
                        const isMatch = userOrgId === accountOrgId;
                        console.log(`  ¿Coinciden?: ${isMatch}`);

                        if (!isMatch) {
                            console.log(`  MISMATCH DETECTADO para ${name}`);
                            console.log(`    userOrgId: [${userOrgId}]`);
                            console.log(`    accountOrgId: [${accountOrgId}]`);
                        }
                    }
                }
            }
        }

        console.log('\n--- DIAGNÓSTICO DE CLIENTES ---');
        for (const name of names) {
            console.log(`\n> Buscando: ${name}`);
            const customers = await Customer.find({ name: new RegExp(name, 'i') });
            for (const c of customers) {
                console.log(`  ID: ${c._id}`);
                const account = await CustomerAccount.findOne({ customer_id: c._id });
                if (account) {
                    console.log(`    AccountID: ${account._id}`);
                    console.log(`    customer_id en Cuenta: ${(account as any).customer_id} (${typeof (account as any).customer_id})`);
                    console.log(`    OrgID en Cuenta: ${account.organization_id} (${typeof account.organization_id})`);
                    const movements = await AccountMovement.find({ account_id: account._id });
                    console.log(`    Movimientos: ${movements.length}`);
                }
            }
        }

        console.log('\n--- FIN DIAGNÓSTICO ---');
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

diagnose();
