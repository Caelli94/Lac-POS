
const mongoose = require('mongoose');
const path = require('path');
// Importar el modelo usando require y path si es necesario, o simplemente definir un esquema temporal
// dado que estamos en un entorno donde ts-node es el estándar.
// Usaremos un script que se ejecute con ts-node.

async function run() {
    await mongoose.connect('mongodb://localhost:27017/lac-pos');
    const SaleSchema = new mongoose.Schema({
        external_reference: String,
        source: String,
        total_amount: Number,
        organization_id: mongoose.Schema.Types.ObjectId
    }, { strict: false });

    const Sale = mongoose.model('Sale', SaleSchema);

    const latestSales = await Sale.find({ organization_id: '67389a196726695f26941198' })
        .sort({ createdAt: -1 })
        .limit(3);

    console.log('Últimas ventas registradas:');
    latestSales.forEach(s => {
        console.log(`- ID: ${s._id} | Ref: ${s.external_reference} | Origen: ${s.source} | Total: ${s.total_amount}`);
    });

    await mongoose.disconnect();
}

run().catch(console.error);
