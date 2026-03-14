const AfipLocation = require.resolve('@afipsdk/afip.js');
console.log('Library Location:', AfipLocation);

const AfipLibrary = require('@afipsdk/afip.js');
console.log('Library Type:', typeof AfipLibrary);

(async () => {
    if (typeof AfipLibrary === 'function') {
        try {
            console.log('Trying new AfipLibrary()...');
            const afip = new AfipLibrary({
                CUIT: 20376292046,
                cert: './uploads/certs/69516bf00f336a4d44b3161d/certificate.crt',
                key: './uploads/certs/69516bf00f336a4d44b3161d/private_key.key',
                production: false
            });
            console.log('Instance created. Testing connection...');

            // Try simple method
            try {
                const lastVoucher = await afip.ElectronicBilling.getLastVoucher(1, 11); // Pto 1, Factura C
                console.log('getLastVoucher SUCCESS:', lastVoucher);
            } catch (err) {
                console.error('getLastVoucher FAILED:', err.message);
                if (err.data) console.error('Error Data:', err.data);
            }

            // Try dummy status
            try {
                const status = await afip.ElectronicBilling.getServerStatus();
                console.log('getServerStatus SUCCESS:', status);
            } catch (err) {
                console.error('getServerStatus FAILED:', err.message);
            }

        } catch (e) {
            console.log('Error in test:', e.message);
        }
    }
})();
