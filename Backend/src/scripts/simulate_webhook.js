
const axios = require('axios');

async function simulateTiendaNubeWebhook() {
    // Intentar obtener una Org ID válida de la base de datos o usar una conocida
    // Por ahora usamos la del script anterior
    const orgId = '67389a196726695f26941198';
    const url = `http://localhost:3001/api/integrations/webhooks/tiendanube/${orgId}`;

    const mockOrder = {
        id: "TN-SIMULATED-" + Math.floor(Math.random() * 1000000),
        total: "15500.50",
        created_at: new Date().toISOString(),
        customer: {
            name: "Juan Perez (Simulación)",
            email: "juan@test.com"
        }
    };

    try {
        console.log(`Simulando Webhook para Org ${orgId}...`);
        const res = await axios.post(url, mockOrder);
        console.log('Resultado del servidor:', res.data);
    } catch (err) {
        console.error('Error en simulación:', err.response?.data || err.message);
    }
}

simulateTiendaNubeWebhook();
