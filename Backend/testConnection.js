
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI || "";

console.log("Intentando conectar...");

mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
    .then(() => {
        console.log("✅ CONEXIÓN EXITOSA");
        process.exit(0);
    })
    .catch(err => {
        console.error("❌ ERROR DE CONEXIÓN:", err);
        process.exit(1);
    });
