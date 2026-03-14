import { Request, Response } from 'express';
import { createBackup as createBackupService, listBackups, getBackupPath, restoreBackup, listRestoreLogs, getRestoreLog } from '../services/backupService';
import path from 'path';
import fs from 'fs';

// ... (existing code)

// @desc    Get Restore History
// @route   GET /api/backups/restore-history
// @desc    Get Restore History
// @route   GET /api/backups/restore-history
export const getRestoreHistory = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        let orgId = user.organization?._id;

        // SuperAdmin Context Switch (via Header)
        if ((user.role === 'superadmin' || user.role === 'admin') && req.headers['x-organization-id']) {
            // Lazy load model to avoid top-level import conflicts/diffs
            const { Organization } = require('../models/Organization');
            const targetOrg = await Organization.findOne({ slug: req.headers['x-organization-id'] });
            if (targetOrg) {
                orgId = targetOrg._id;
            }
        }

        const logs = await listRestoreLogs(orgId);
        res.json(logs);
    } catch (error) {
        console.error('Error fetching restore history:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Restore Log Details
// @route   GET /api/backups/restore-history/:id@gmau
export const getRestoreLogDetails = async (req: Request, res: Response) => {
    try {
        const log = await getRestoreLog(req.params.id);
        if (!log) return res.status(404).json({ message: 'Log not found' });
        res.json(log);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};


// @desc    Get list of backups
// @route   GET /api/backups
export const getBackups = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const headerOrgSlug = req.headers['x-organization-id'] as string; // Frontend sends Slug here

        // SECURITY: Allow access if user is superadmin/admin OR has a matching organization
        const isSystemAdmin = user.role === 'superadmin' || user.role === 'admin';
        const userOrgSlug = (user.organization as any)?.slug;

        let orgSlug = userOrgSlug;

        if (isSystemAdmin && headerOrgSlug) {
            orgSlug = headerOrgSlug;
        }

        if (!orgSlug) {
            console.warn(`[Security] User ${user?.email} tried to access backups without Organization context.`);
            return res.status(403).json({ message: 'Access Denied: Organization context missing.' });
        }

        // Final security check for non-system admins
        if (!isSystemAdmin && orgSlug !== userOrgSlug) {
            return res.status(403).json({ message: 'Access Denied: You can only access your own organization backups.' });
        }

        console.log(`[BackupController] Fetching backups for OrgSlug: ${orgSlug}`);

        const backups = await listBackups(orgSlug);
        res.json(backups);
    } catch (error) {
        console.error('[BackupController] Error in getBackups:', error);
        res.status(500).json({ message: 'Server Error', error: String(error) });
    }
};

// @desc    Trigger explicit backup
// @route   POST /api/backups
export const generateBackup = async (req: Request, res: Response) => {
    try {
        const { label, type, organizationId } = req.body; // organizationId is the SLUG from frontend
        const user = (req as any).user;

        const isSystemAdmin = user.role === 'superadmin' || user.role === 'admin';
        const userOrgSlug = (user.organization as any)?.slug;

        let orgId = userOrgSlug;

        if (isSystemAdmin && organizationId) {
            orgId = organizationId;
        }

        if (!orgId) {
            return res.status(403).json({ message: 'Organization context missing' });
        }

        // const orgId = organizationId || req.headers['x-organization-id'] || req.query.organizationId; // OLD INSECURE WAY

        const result = await createBackupService(type, label, orgId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Download backup file
// @route   GET /api/backups/download/:filename
export const downloadBackup = async (req: Request, res: Response) => {
    try {
        const { filename } = req.params;
        const user = (req as any).user;

        const isSystemAdmin = user.role === 'superadmin' || user.role === 'admin';
        const userOrgSlug = (user.organization as any)?.slug || '';

        // Security Check: If not system admin, filename MUST contain the user's organization slug
        if (!isSystemAdmin && !filename.toLowerCase().includes(userOrgSlug.toLowerCase())) {
            console.warn(`[Security Alert] User ${user.email} (Org: ${userOrgSlug}) tried to download unauthorized file: ${filename}`);
            return res.status(403).json({ message: 'Access Denied: This backup does not belong to your organization.' });
        }

        // Basic Security Check (Filename validation handled in service logic mostly, but check here too)
        if (!filename.endsWith('.json.gz')) {
            return res.status(400).json({ message: 'Invalid file type' });
        }

        const safePath = getBackupPath(filename);

        res.download(safePath, filename, (err) => {
            if (err) {
                if (!res.headersSent) {
                    res.status(404).json({ message: 'Backup file not found' });
                }
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Restore from uploaded file
// @route   POST /api/backups/restore
export const restore = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const user = (req as any).user;
        let orgId = user.organization?._id;

        // SuperAdmin Context Switch
        if ((user.role === 'superadmin' || user.role === 'admin') && req.headers['x-organization-id']) {
            const { Organization } = require('../models/Organization');
            const targetOrg = await Organization.findOne({ slug: req.headers['x-organization-id'] });
            if (targetOrg) orgId = targetOrg._id;
        }

        const result: any = await restoreBackup(req.file.path, req.file.originalname, orgId);

        // Cleanup uploaded file
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Error deleting temp upload:', err);
        });

        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json({ message: 'Restore failed', error: result.error });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
