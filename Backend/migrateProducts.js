const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const ProductSchema = new mongoose.Schema({}, { strict: false });
const Product = mongoose.model('Product', ProductSchema);

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

const run = async () => {
    await connectDB();
    const products = await Product.find({});
    console.log(`Found ${products.length} products. Migrating...`);

    for (const p of products) {
        let updated = false;
        const updateData = {};

        // 1. Migrate organization_id (String -> ObjectId)
        if (typeof p.organization_id === 'string' && p.organization_id.length === 24) {
            updateData.organization_id = new mongoose.Types.ObjectId(p.organization_id);
            updated = true;
        }

        // 2. Migrate supplier_id (String -> ObjectId)
        if (typeof p.supplier_id === 'string' && p.supplier_id.length === 24) {
            updateData.supplier_id = new mongoose.Types.ObjectId(p.supplier_id);
            updated = true;
        }

        // 3. Migrate category_id (String) -> category_ids ([ObjectId])
        if (!p.category_ids || p.category_ids.length === 0) {
            if (typeof p.category_id === 'string' && p.category_id.length === 24) {
                updateData.category_ids = [new mongoose.Types.ObjectId(p.category_id)];
                // Optional: unset category_id if you want to clean up, but keeping it is safer for now
                updated = true;
            } else {
                updateData.category_ids = []; // Ensure array exists
                updated = true;
            }
        }

        // 4. Ensure variants array exists
        if (!Array.isArray(p.variants)) {
            updateData.variants = [];
            updated = true;
        }

        // 5. Ensure pricing array exists
        if (!Array.isArray(p.pricing)) {
            updateData.pricing = [];
            updated = true;
        }

        if (updated) {
            console.log(`Updating product ${p.name} (${p._id})...`);
            await Product.updateOne({ _id: p._id }, { $set: updateData });
        }
    }

    console.log('Migration complete.');
    mongoose.connection.close();
};

run();
