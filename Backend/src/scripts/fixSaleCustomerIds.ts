
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const fixCustomerIds = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || '');
        console.log('[DEBUG] Connected to DB');

        const sales = await mongoose.connection.collection('sales').find({}).toArray();
        let updatedCount = 0;

        for (const sale of sales) {
            if (sale.customer_id && typeof sale.customer_id === 'string') {
                try {
                    const objectId = new mongoose.Types.ObjectId(sale.customer_id);
                    await mongoose.connection.collection('sales').updateOne(
                        { _id: sale._id },
                        { $set: { customer_id: objectId } }
                    );
                    updatedCount++;
                } catch (e) {
                    console.log(`[WARN] Skipping invalid id: ${sale.customer_id}`);
                }
            }
        }

        console.log(`[INFO] Updated ${updatedCount} sales with ObjectId customer_id.`);

    } catch (error) {
        console.error('[ERROR]', error);
    } finally {
        await mongoose.disconnect();
    }
};

fixCustomerIds();
