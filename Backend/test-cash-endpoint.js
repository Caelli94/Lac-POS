

// If node-fetch is not available, try native fetch.
// 69516bf00f336a4d44b3161d is the OrgID I saw in logs.
const orgId = '69516bf00f336a4d44b3161d';
const url = `http://localhost:3001/api/cash/registers/org/${orgId}`;

console.log(`Fetching from ${url}...`);

(async () => {
    try {
        const res = await fetch(url);
        const text = await res.text();
        console.log(`Status: ${res.status}`);
        console.log(`Body: ${text}`);
    } catch (e) {
        console.error("Error:", e);
    }
})();
