import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Product } from '../models/Product';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lac-pos';

async function diagnose() {
    try {
        await mongoose.connect(MONGODB_URI);
        const products = await Product.find({ sku: '111' });
        console.log('PRODUCTS FOUND WITH SKU 111:', products.length);
        products.forEach((p: any) => {
            console.log('PRODUCT ID:', p._id);
            console.log('NAME:', p.name);
            console.log('PRICE:', p.price);
            console.log('SKU:', p.sku);
            console.log('VARIANTS count:', p.variants?.length);
            console.log('VARIANTS DETAILS:', JSON.stringify(p.variants, null, 2));
        });
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

diagnose();
