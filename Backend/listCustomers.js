async function listCustomers() {
    try {
        // Fetch all customers for a specific organization or just dump all if we had an endpoint (which we don't usually for all tenants)
        // But since we are debugging, let's use the mongoose model directly or just query the DB if we can.
        // Since I can't easily import mongoose models in a standalone script without setup, I'll use fetch to the API.
        // I need an orgId. I'll fetch the org first.

        // 1. Get Alpha Org
        const orgRes = await fetch('http://127.0.0.1:3001/api/organizations/by-slug/alpha-sa');
        if (!orgRes.ok) {
            console.log("Error fetching org alpha-sa");
            return;
        }
        const org = await orgRes.json();
        const orgId = org._id || org.id;
        console.log("Org ID:", orgId);

        // 2. Get Customers
        const custRes = await fetch(`http://127.0.0.1:3001/api/customers/${orgId}`);
        const customers = await custRes.json();

        console.log("Customers in DB:", JSON.stringify(customers, null, 2));

    } catch (error) {
        console.error('Script error:', error.message);
    }
}

listCustomers();
