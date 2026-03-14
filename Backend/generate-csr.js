const forge = require('node-forge');
const fs = require('fs');

console.log("Generando par de claves RSA de 2048 bits...");
const keys = forge.pki.rsa.generateKeyPair(2048);

console.log("Creando Solicitud de Certificado (CSR)...");
const csr = forge.pki.createCertificationRequest();
csr.publicKey = keys.publicKey;
csr.setSubject([
    { name: 'commonName', value: 'Testing' },
    { name: 'countryName', value: 'AR' },
    { name: 'organizationName', value: 'Testing' },
    { name: 'serialNumber', value: 'CUIT 20376292046' } // Using the CUIT provided by user
]);

csr.sign(keys.privateKey, forge.md.sha256.create());

const pemCsr = forge.pki.certificationRequestToPem(csr);
const pemKey = forge.pki.privateKeyToPem(keys.privateKey);

fs.writeFileSync('pedido.csr', pemCsr);
fs.writeFileSync('privado.key', pemKey);

console.log("---------------------------------------------------");
console.log("ARCHIVOS GENERADOS EXITOSAMENTE:");
console.log("1. privado.key (CLAVE PRIVADA - NO COMPARTIR)");
console.log("2. pedido.csr (SOLICITUD PARA AFIP)");
console.log("---------------------------------------------------");
console.log("CONTENIDO DE pedido.csr (Copiar y pegar en AFIP):");
console.log(pemCsr);
