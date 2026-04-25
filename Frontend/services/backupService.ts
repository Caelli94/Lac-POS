import { API_URL } from '@/lib/api-config';
import { apiFetch } from '@/lib/api-fetch';

export interface BackupFile {
    filename: string;
    size: string;
    date: string;
    label?: string;
    itemCounts?: Record<string, number>;
    createdBy?: string;
    createdByRole?: string;
}

export const backupService = {
    // List all backups
    getAll: async (organizationId?: string) => {
        const headers: any = { 'Content-Type': 'application/json' };
        if (organizationId) headers['x-organization-id'] = organizationId;

        const res = await apiFetch(`${API_URL}/backups`, {
            method: 'GET',
            headers,
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Error fetching backups');
        return res.json();
    },

    // Trigger manual creation
    create: async (label: string, organizationId?: string) => {
        const headers: any = {
            'Content-Type': 'application/json'
        };
        if (organizationId) {
            headers['x-organization-id'] = organizationId;
        }

        const res = await apiFetch(`${API_URL}/backups`, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({ label, type: 'manual', organizationId })
        });
        if (!res.ok) throw new Error('Error creating backup');
        return res.json();
    },

    // Get Download URL
    getDownloadUrl: (filename: string) => {
        return `${API_URL}/backups/download/${filename}`;
    },

    // Download via Blob
    downloadFile: async (filename: string) => {
        const res = await apiFetch(`${API_URL}/backups/download/${filename}`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!res.ok) throw new Error('Download failed');

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    // Analyze before restore
    analyze: async (file: File) => {
        const formData = new FormData();
        formData.append('backup', file);

        const res = await apiFetch(`${API_URL}/backups/analyze`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Analysis failed');
        }
        return res.json();
    },

    // Restore from file
    restore: async (file: File, collectionsToRestore?: string[]) => {
        const formData = new FormData();
        formData.append('backup', file);
        if (collectionsToRestore) {
            formData.append('collectionsToRestore', JSON.stringify(collectionsToRestore));
        }

        const res = await apiFetch(`${API_URL}/backups/restore`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Restore failed');
        }
        return res.json();
    },

    // Get Restore History
    getHistory: async () => {
        const res = await apiFetch(`${API_URL}/backups/restore-history`, {
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to fetch history');
        return res.json();
    },

    // Get History Details
    getHistoryDetails: async (id: string) => {
        const res = await apiFetch(`${API_URL}/backups/restore-history/${id}`, {
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to fetch details');
        return res.json();
    }
};
