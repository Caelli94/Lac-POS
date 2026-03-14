const DB_NAME = 'lac_pos_db';
const DB_VERSION = 2;

export interface OfflineSale {
    id: string;
    data: any;
    timestamp: number;
    synced: boolean;
    error?: string;
}

class PosDB {
    private db: IDBDatabase | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            this.initDB();
        }
    }

    private initDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event: any) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('products')) {
                    db.createObjectStore('products', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('customers')) {
                    db.createObjectStore('customers', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('pending_sales')) {
                    db.createObjectStore('pending_sales', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('price_lists')) {
                    db.createObjectStore('price_lists', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('suppliers')) {
                    db.createObjectStore('suppliers', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('sync_metadata')) {
                    db.createObjectStore('sync_metadata', { keyPath: 'key' });
                }
            };

            request.onsuccess = (event: any) => {
                this.db = event.target.result;
                resolve(this.db!);
            };

            request.onerror = (event: any) => {
                reject(event.target.error);
            };
        });
    }

    private async getDB(): Promise<IDBDatabase> {
        if (this.db) return this.db;
        return this.initDB();
    }

    // --- PRODUCTS ---
    async saveProducts(products: any[]) {
        const db = await this.getDB();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction('products', 'readwrite');
            const store = tx.objectStore('products');
            products.forEach(p => store.put(p));
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async getProducts(searchTerm?: string): Promise<any[]> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('products', 'readonly');
            const store = tx.objectStore('products');
            const request = store.getAll();
            request.onsuccess = () => {
                const all = request.result;
                if (!searchTerm) {
                    resolve(all);
                    return;
                }
                const term = searchTerm.toLowerCase();
                resolve(all.filter((p: any) =>
                    p.name.toLowerCase().includes(term) ||
                    (p.sku && p.sku.toLowerCase().includes(term))
                ));
            };
            request.onerror = () => reject(request.error);
        });
    }

    // --- CUSTOMERS ---
    async saveCustomers(customers: any[]) {
        const db = await this.getDB();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction('customers', 'readwrite');
            const store = tx.objectStore('customers');
            customers.forEach(c => store.put(c));
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async getCustomers(searchTerm?: string): Promise<any[]> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('customers', 'readonly');
            const store = tx.objectStore('customers');
            const request = store.getAll();
            request.onsuccess = () => {
                const all = request.result;
                if (!searchTerm) {
                    resolve(all);
                    return;
                }
                const term = searchTerm.toLowerCase();
                resolve(all.filter((c: any) =>
                    c.name.toLowerCase().includes(term) ||
                    (c.doc_number && String(c.doc_number).includes(term)) ||
                    (c.email && c.email.toLowerCase().includes(term))
                ));
            };
            request.onerror = () => reject(request.error);
        });
    }

    // --- SUPPLIERS ---
    async saveSuppliers(suppliers: any[]) {
        const db = await this.getDB();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction('suppliers', 'readwrite');
            const store = tx.objectStore('suppliers');
            suppliers.forEach(s => store.put(s));
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async getSuppliers(searchTerm?: string): Promise<any[]> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('suppliers', 'readonly');
            const store = tx.objectStore('suppliers');
            const request = store.getAll();
            request.onsuccess = () => {
                const all = request.result;
                if (!searchTerm) {
                    resolve(all);
                    return;
                }
                const term = searchTerm.toLowerCase();
                resolve(all.filter((s: any) =>
                    s.name.toLowerCase().includes(term) ||
                    (s.tax_id && String(s.tax_id).includes(term)) ||
                    (s.email && s.email.toLowerCase().includes(term))
                ));
            };
            request.onerror = () => reject(request.error);
        });
    }

    // --- PAGINATED LOCAL FETCHING ---
    async getPaginatedItems(storeName: 'products' | 'customers' | 'suppliers', page: number, limit: number, searchTerm?: string): Promise<{ data: any[], total: number }> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                let all = request.result;
                if (searchTerm) {
                    const term = searchTerm.toLowerCase();
                    all = all.filter((item: any) =>
                        (item.name && item.name.toLowerCase().includes(term)) ||
                        (item.sku && String(item.sku).toLowerCase().includes(term)) ||
                        (item.doc_number && String(item.doc_number).includes(term)) ||
                        (item.tax_id && String(item.tax_id).includes(term))
                    );
                }

                const total = all.length;
                const start = (page - 1) * limit;
                const paginated = all.slice(start, start + limit);
                resolve({ data: paginated, total });
            };
            request.onerror = () => reject(request.error);
        });
    }

    // --- SYNC METADATA ---
    async getLastSync(key: string): Promise<string | null> {
        const db = await this.getDB();
        return new Promise((resolve) => {
            const tx = db.transaction('sync_metadata', 'readonly');
            const store = tx.objectStore('sync_metadata');
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result?.date || null);
            request.onerror = () => resolve(null);
        });
    }

    async setLastSync(key: string, date: string) {
        const db = await this.getDB();
        const tx = db.transaction('sync_metadata', 'readwrite');
        tx.objectStore('sync_metadata').put({ key, date });
    }

    // --- SALES ---
    async savePendingSale(sale: any): Promise<OfflineSale> {
        const db = await this.getDB();
        const offlineSale: OfflineSale = {
            id: sale.id || crypto.randomUUID(),
            data: sale,
            timestamp: Date.now(),
            synced: false
        };
        return new Promise((resolve, reject) => {
            const tx = db.transaction('pending_sales', 'readwrite');
            const store = tx.objectStore('pending_sales');
            const request = store.put(offlineSale);
            request.onsuccess = () => resolve(offlineSale);
            request.onerror = () => reject(request.error);
        });
    }

    async getPendingSales(): Promise<OfflineSale[]> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('pending_sales', 'readonly');
            const store = tx.objectStore('pending_sales');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deletePendingSale(id: string) {
        const db = await this.getDB();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction('pending_sales', 'readwrite');
            const store = tx.objectStore('pending_sales');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async updatePendingSaleError(id: string, error: string) {
        const db = await this.getDB();
        const tx = db.transaction('pending_sales', 'readwrite');
        const store = tx.objectStore('pending_sales');
        const getReq = store.get(id);
        getReq.onsuccess = () => {
            const sale = getReq.result;
            if (sale) {
                sale.error = error;
                store.put(sale);
            }
        };
    }
}

export const posDB = new PosDB();
