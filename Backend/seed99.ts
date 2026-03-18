import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Organization } from './src/models/Organization';
import { Product } from './src/models/Product';
import { Customer } from './src/models/Customer';
import { Supplier } from './src/models/Supplier';

dotenv.config();

const runSeed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || '');
        console.log('Conectado a MongoDB...');

        const org = await Organization.findOne({ slug: 'glossprueba' });
        if (!org) {
            console.log('No se encontró la organización glossprueba');
            process.exit(1);
        }

        const orgId = org._id;

        // Products
        const prodCount = await Product.countDocuments({ organization_id: orgId });
        const prodsToAdd = Math.max(0, 99 - prodCount);
        for (let i = 0; i < prodsToAdd; i++) {
            await Product.create({
                name: `Producto de Prueba ${prodCount + i + 1}`,
                price: Math.floor(Math.random() * 10000) + 100,
                cost: Math.floor(Math.random() * 5000) + 50,
                stock: Math.floor(Math.random() * 100),
                organization_id: orgId,
                sku: `TEST-PROD-${prodCount + i + 1}`
            });
        }
        console.log(`Agregados ${prodsToAdd} productos (Total: ${prodCount + prodsToAdd}).`);

        // Customers
        const custCount = await Customer.countDocuments({ organization_id: orgId });
        const custsToAdd = Math.max(0, 99 - custCount);
        for (let i = 0; i < custsToAdd; i++) {
            await Customer.create({
                name: `Cliente de Prueba ${custCount + i + 1}`,
                doc_number: `20${Math.floor(10000000 + Math.random() * 90000000)}9`,
                organization_id: orgId
            });
        }
        console.log(`Agregados ${custsToAdd} clientes (Total: ${custCount + custsToAdd}).`);

        // Suppliers
        const suppCount = await Supplier.countDocuments({ organization_id: orgId });
        const suppsToAdd = Math.max(0, 99 - suppCount);
        for (let i = 0; i < suppsToAdd; i++) {
            await Supplier.create({
                name: `Proveedor de Prueba ${suppCount + i + 1}`,
                tax_id: `30${Math.floor(10000000 + Math.random() * 90000000)}9`,
                organization_id: orgId
            });
        }
        console.log(`Agregados ${suppsToAdd} proveedores (Total: ${suppCount + suppsToAdd}).`);

        console.log('Seed completado exitosamente.');
        process.exit(0);
    } catch (error) {
        console.error('Error en el seed:', error);
        process.exit(1);
    }
};

runSeed();
