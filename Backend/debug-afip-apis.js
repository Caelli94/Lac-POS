const Afip = require('afip-apis');
console.log('Library Type:', typeof Afip);
console.log('Keys:', Object.keys(Afip));

if (Afip.Wsfev1) {
    console.log('Wsfev1 found. Type:', typeof Afip.Wsfev1);
    try {
        const test = new Afip.Wsfev1({
            cuit: 20111111112,
            cert: './cert',
            key: './key'
        });
        console.log('Wsfev1 Instantiated Successfully!');
    } catch (e) {
        console.log('Wsfev1 Instantiation Error:', e.message);
    }
}
