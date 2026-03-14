async function listOrgs() {
    try {
        const response = await fetch('http://127.0.0.1:3001/api/organizations');
        if (!response.ok) {
            console.log('Error:', response.status, response.statusText);
            return;
        }
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Fetch error:', error.message);
    }
}

listOrgs();
