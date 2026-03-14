const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/lac-pos')
    .then(async () => {
        console.log('Connected to MongoDB');
        await checkRecentSales();
    })
    .catch(err => console.error('Could not connect to MongoDB', err));

const SaleSchema = new mongoose.Schema({}, { strict: false });
const Sale = mongoose.model('Sale', SaleSchema);

async function checkRecentSales() {
    try {
        const sales = await Sale.find().sort({ date: -1 }).limit(5);
        console.log("Recent 5 Sales:");
        console.log(JSON.stringify(sales, null, 2));
    } catch (error) {
        console.error("Error fetching sales:", error);
    } finally {
        mongoose.disconnect();
    }
}

checkRecentSales();
