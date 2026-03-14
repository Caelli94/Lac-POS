const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const PriceListSchema = new mongoose.Schema({
    organization_id: { type: mongoose.Schema.Types.Mixed, required: true },
    name: { type: String, required: true },
    is_active: { type: Boolean, default: true }
}, { timestamps: true });

const OrganizationSchema = new mongoose.Schema({
    name: String,
    slug: String
}, { strict: false });

const PriceList = mongoose.model('PriceList', PriceListSchema);
const Organization = mongoose.model('Organization', OrganizationSchema);

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

    // 1. Get All Orgs
    const companies = await Organization.find({});
    console.log(`Found ${companies.length} organizations.`);

    for (const company of companies) {
        console.log(`Checking Org: ${company.name} (${company._id})`);

        // Check for PRINCIPAL list
        const lists = await PriceList.find({ organization_id: company._id });
        const principal = lists.find(l => l.name === 'PRINCIPAL');

        if (!principal) {
            console.log(`  > PRINCIPAL list missing. Creating...`);
            try {
                await PriceList.create({
                    organization_id: company._id,
                    name: 'PRINCIPAL',
                    is_active: true
                });
                console.log(`  > Created successfully.`);
            } catch (err) {
                console.error(`  > Error creating list: ${err.message}`);
            }
        } else {
            console.log(`  > PRINCIPAL list exists.`);
        }
    }

    // Final check
    const allLists = await PriceList.find({});
    console.log('\n--- ALL PRICE LISTS IN DB ---');
    console.log(JSON.stringify(allLists, null, 2));

    mongoose.connection.close();
};

run();
