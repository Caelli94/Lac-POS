import { Request, Response } from 'express';
import { Branch } from '../models/Branch';
import { Organization } from '../models/Organization';
import mongoose from 'mongoose';

// @desc    Get all branches for an organization
// @route   GET /api/branches/:orgId
export const getBranches = async (req: Request, res: Response) => {
    try {
        const { orgId } = req.params;
        const user = (req as any).user;
        const userOrgId = user.organization?._id?.toString() || user.organization?.toString() || '';

        // SECURITY: Strict Tenant Isolation (Exempt Super Admin)
        const isInternalMember = userOrgId && (userOrgId === orgId.toString());
        const isSystemAdmin = user.role === 'superadmin' || user.role === 'admin';

        if (!isInternalMember && !isSystemAdmin) {
            return res.status(403).json({ message: 'Acceso denegado.' });
        }

        const branches = await Branch.find({ organization_id: orgId }).sort({ name: 1 });
        res.json(branches);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Upsert a branch (Create or Update)
// @route   POST /api/branches
export const upsertBranch = async (req: Request, res: Response) => {
    try {
        const { id, organization_id, ...data } = req.body;

        let branch;
        if (id) {
            branch = await Branch.findByIdAndUpdate(id, data, { new: true });
        } else {
            // CHECK LIMITS
            const org = await Organization.findById(organization_id);
            if (org?.settings?.branches_limit !== undefined && org.settings.branches_limit !== -1) {
                const currentCount = await Branch.countDocuments({ organization_id });
                if (currentCount >= org.settings.branches_limit) {
                    return res.status(403).json({ message: 'LIMIT_REACHED_BRANCHES' });
                }
            }
            branch = await Branch.create({ organization_id, ...data });
        }

        res.json(branch);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a branch
// @route   DELETE /api/branches/:id
export const deleteBranch = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await Branch.findByIdAndDelete(id);
        res.json({ message: 'Branch deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
