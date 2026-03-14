const API_URL = 'http://127.0.0.1:3001/api';

const run = async () => {
    // 1. Get a product ID
    try {
        console.log(`Fetching products from ORG: 69516bf00f336a4d44b3161d ...`);
        const res = await fetch(`${API_URL}/products/69516bf00f336a4d44b3161d`);
        const products = await res.json();

        if (products.length === 0) {
            console.log("No products found to update.");
            return;
        }

        const product = products[0];
        console.log(`Attempting to update Product: ${product.name} (${product._id})`);

        const updatePayload = {
            name: product.name + " UPDATED",
            price: 1500,
            sku: "TEST-UPDATE",
            organization_id: product.organization_id,
            category_ids: product.category_ids || [],
            variants: [],
            pricing: []
        };

        const updateRes = await fetch(`${API_URL}/products/${product.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatePayload)
        });

        if (updateRes.ok) {
            const updated = await updateRes.json();
            console.log("Update SUCCESS:", updated);
        } else {
            console.log("Update FAILED:", updateRes.status, await updateRes.text());
        }

    } catch (e) {
        console.error("Script Error:", e);
    }
};

run();
