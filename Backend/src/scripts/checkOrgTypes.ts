import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkOrgTypes() {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) throw new Error('MONGO_URI not found');

        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const Customer = mongoose.model('Customer', new mongoose.Schema({}, { strict: false }));
        
        const sampleCustomers = await Customer.find().limit(10) as any[];
        console.log('\n--- Muestra de Clientes ---');
        sampleCustomers.forEach(c => {
            const orgValue = c.organization_id;
            const type = typeof orgValue;
            const isObjectId = mongoose.Types.ObjectId.isValid(orgValue) && (orgValue instanceof mongoose.Types.ObjectId || (typeof orgValue === 'object' && orgValue._bsontype === 'ObjectID'));
            console.log(`ID: ${c._id} | orgId: ${orgValue} | Type: ${type} | isObjectId: ${isObjectId}`);
        });

        const stringOrgs = await Customer.countDocuments({ organization_id: { $type: 'string' } } as any);
        const objectIdOrgs = await Customer.countDocuments({ organization_id: { $type: 'objectId' } } as any);

        console.log('\n--- Totales en Clientes ---');
        console.log(`Total String orgId: ${stringOrgs}`);
        console.log(`Total ObjectId orgId: ${objectIdOrgs}`);

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkOrgTypes();
