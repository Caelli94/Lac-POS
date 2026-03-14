const orgId = '69516bf00f336a4d44b3161d';
const url = `http://localhost:3001/api/products/${orgId}`;

console.log(`Fetching products from ${url}...`);

(async () => {
    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.error('Error fetching:', res.status, res.statusText);
            const text = await res.text();
            console.error('Body:', text);
            return;
        }
        const products = await res.json();
        console.log(`Found ${products.length} products.`);
        if (products.length > 0) {
            console.log('First product sample:');
            console.log(JSON.stringify(products[0], null, 2));
        }
    } catch (e) {
        console.error("Error:", e);
    }
})();
