import { API_URL, getHeaders } from '@/lib/api-config';

export const productService = {
    async getAll(orgId: string, params: {
        page?: number;
        limit?: number;
        search?: string;
        branch?: string;
        stock?: string;
        visibility?: string;
        supplierId?: string;
        categoryId?: string;
        sortBy?: string;
        sortOrder?: string;
    } = {}) {
        try {
            const queryParams = new URLSearchParams();
            if (params.page) queryParams.append('page', params.page.toString());
            if (params.limit) queryParams.append('limit', params.limit.toString());
            if (params.search) queryParams.append('search', params.search);
            if (params.branch) queryParams.append('branch', params.branch);
            if (params.stock) queryParams.append('stock', params.stock);
            if (params.visibility) queryParams.append('visibility', params.visibility);
            if (params.supplierId) queryParams.append('supplier_id', params.supplierId);
            if (params.categoryId) queryParams.append('category_id', params.categoryId);
            if (params.sortBy) queryParams.append('sortBy', params.sortBy);
            if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

            const url = `${API_URL}/products/${orgId}?${queryParams.toString()}`;

            // SAFE MODE: If offline, don't even try to fetch
            if (typeof window !== 'undefined' && !navigator.onLine) {
                return { data: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 1 }, offline: true };
            }

            const headers = await getHeaders();
            const response = await fetch(url, {
                cache: 'no-store',
                headers
            });
            if (!response.ok) return { data: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 1 } };
            return await response.json();
        } catch (error) {
            console.error("Error fetching products", error);
            return { data: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 1 }, error: true };
        }
    },

    async getById(id: string) {
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/products/detail/${id}`, {
                cache: 'no-store',
                headers
            });
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error("Error fetching product by id", error);
            return null;
        }
    },

    async create(data: any) {
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/products`, {
                method: 'POST',
                headers,
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error creating product');
            }

            return await response.json();
        } catch (error) {
            console.error("Error creating product", error);
            throw error;
        }
    },

    async update(data: any) {
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/products/${data.id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error updating product');
            }

            return await response.json();
        } catch (error) {
            console.error("Error updating product", error);
            throw error;
        }
    },

    async delete(id: string) {
        try {
            const headers = await getHeaders();
            await fetch(`${API_URL}/products/${id}`, {
                method: 'DELETE',
                headers
            });
            return true;
        } catch (error) {
            return false;
        }
    },

    async checkSku(orgId: string, sku: string) {
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/products/check-sku/${orgId}?sku=${sku}`, {
                cache: 'no-store',
                headers
            });
            if (!response.ok) return { exists: false };
            return await response.json();
        } catch (error) {
            return { exists: false };
        }
    },

    async getStatistics(orgId: string, params?: { from?: string, to?: string, limit?: number }) {
        try {
            const query = new URLSearchParams(params as any).toString();
            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/products/${orgId}/statistics?${query}`, {
                cache: 'no-store',
                headers
            });
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error("Error fetching product stats", error);
            return null;
        }
    },

    async massUpdate(data: { selection: any, updates: any[] }) {
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/products/mass-update`, {
                method: 'POST',
                headers,
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error en actualización masiva');
            }

            return await response.json();
        } catch (error) {
            console.error("Error in massUpdate:", error);
            throw error;
        }
    }
};
