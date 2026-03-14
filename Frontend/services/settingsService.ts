import { API_URL, getHeaders } from '@/lib/api-config';

export const settingsService = {
    // --- BRANCHES ---
    async getBranches(orgId: string) {
        try {
            const headers = await getHeaders();
            const url = `${API_URL}/branches/${orgId}`;
            console.log(`[DEBUG] Fetching branches from: ${url}`);

            const response = await fetch(url, {
                cache: 'no-store',
                headers
            });
            console.log(`[DEBUG] Branches response status: ${response.status}`);

            if (!response.ok) {
                console.error(`[DEBUG] Failed to fetch branches: ${response.statusText}`);
                return [];
            }
            const data = await response.json();
            console.log(`[DEBUG] Branches found: ${data.length}`);
            return data;
        } catch (error) {
            console.error("Error fetching branches", error);
            return [];
        }
    },

    async getOrganizationBySlug(slug: string) {
        try {
            const url = `${API_URL}/organizations/by-slug/${slug}`;
            console.log("Fetching org by slug:", url);
            const response = await fetch(url, {
                cache: 'no-store'
            });
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error("Error fetching organization by slug", error);
            return null;
        }
    },

    async upsertBranch(data: any) {
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/branches`, {
                method: 'POST',
                headers,
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Error saving branch');
            return await response.json();
        } catch (error) {
            console.error("Error saving branch", error);
            throw error;
        }
    },

    async deleteBranch(id: string) {
        try {
            const headers = await getHeaders();
            await fetch(`${API_URL}/branches/${id}`, {
                method: 'DELETE',
                headers
            });
            return true;
        } catch (error) {
            return false;
        }
    },

    // --- TICKET SETTINGS ---
    async getTicketSettings(orgId: string) {
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/ticket-settings/${orgId}`, {
                cache: 'no-store',
                headers
            });
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            return null;
        }
    },

    async upsertTicketSettings(data: any) {
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/ticket-settings`, {
                method: 'POST',
                headers,
                body: JSON.stringify(data)
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    },

    // --- PRICE LISTS ---
    async getPriceLists(orgId: string) {
        try {
            const headers = await getHeaders();
            const url = `${API_URL}/price-lists/${orgId}`;
            console.log("settingsService.getPriceLists calling:", url);
            const response = await fetch(url, {
                cache: 'no-store',
                headers
            });
            console.log("settingsService.getPriceLists status:", response.status);
            if (!response.ok) return [];
            const data = await response.json();
            console.log("settingsService.getPriceLists data:", data);
            return data;
        } catch (error) {
            console.error("settingsService.getPriceLists error:", error);
            return [];
        }
    },

    async upsertPriceList(data: any) {
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/price-lists`, {
                method: 'POST',
                headers,
                body: JSON.stringify(data)
            });
            if (!response.ok) return { success: false, error: (await response.json()).message };
            return { success: true, data: await response.json() };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    async deletePriceList(id: string) {
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/price-lists/${id}`, {
                method: 'DELETE',
                headers
            });
            if (!response.ok) return { success: false, error: (await response.json()).message };
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    async togglePriceListStatus(id: string, is_active: boolean) {
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/price-lists/${id}/status`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ is_active })
            });
            if (!response.ok) return { success: false };
            return { success: true };
        } catch (error) {
            return { success: false };
        }
    }
};
