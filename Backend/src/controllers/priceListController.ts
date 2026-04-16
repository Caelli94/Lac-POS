import { Request, Response } from 'express';
import { PriceList } from '../models/PriceList';
import { Organization } from '../models/Organization';
import mongoose from 'mongoose';

// @desc    Get all price lists for an organization
// @route   GET /api/price-lists/:orgId
export const getPriceLists = async (req: Request, res: Response) => {
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

        console.log(`[GET PriceLists] Request for OrgID: ${orgId}`);

        let lists = await PriceList.find({ organization_id: orgId }).sort({ createdAt: 1 });
        console.log(`[GET PriceLists] Found ${lists.length} lists for OrgID: ${orgId}`);

        // Ensure PRINCIPAL list exists
        const principal = lists.find(l => l.name === 'PRINCIPAL');
        if (!principal) {
            console.log(`[GET PriceLists] PRINCIPAL list missing for ${orgId}, creating...`);
            const newPrincipal = await PriceList.create({
                organization_id: orgId,
                name: 'PRINCIPAL',
                is_active: true
            });
            lists = [newPrincipal, ...lists];
        }

        res.json(lists);
    } catch (error) {
        console.error("Error getting price lists:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create or Update Price List
// @route   POST /api/price-lists
export const upsertPriceList = async (req: Request, res: Response) => {
    try {
        const { organization_id, id, name, is_active } = req.body;

        if (id) {
            const updated = await PriceList.findByIdAndUpdate(id, { name, is_active }, { new: true });
            return res.json(updated);
        }

        // Check duplicates
        const exists = await PriceList.findOne({ organization_id, name });
        if (exists) return res.status(400).json({ message: 'Ya existe una lista con ese nombre' });

        // CHECK LIMITS
        const org = await Organization.findById(organization_id);
        if (org?.settings?.price_lists_limit !== undefined && org.settings.price_lists_limit !== -1) {
            const currentCount = await PriceList.countDocuments({ organization_id });
            if (currentCount >= org.settings.price_lists_limit) {
                return res.status(403).json({ message: 'LIMIT_REACHED_PRICELISTS' });
            }
        }

        const newList = await PriceList.create({
            organization_id,
            name,
            is_active: is_active !== undefined ? is_active : true
        });

        res.status(201).json(newList);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete Price List
// @route   DELETE /api/price-lists/:id
export const deletePriceList = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const list = await PriceList.findById(id);
        if (!list) return res.status(404).json({ message: 'Lista no encontrada' });
        if (list.name === 'PRINCIPAL') return res.status(400).json({ message: 'No se puede eliminar la lista PRINCIPAL' });

        await list.deleteOne();
        res.json({ message: 'Lista eliminada' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Toggle Status
// @route   PUT /api/price-lists/:id/status
export const togglePriceListStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        const list = await PriceList.findByIdAndUpdate(id, { is_active }, { new: true });
        res.json(list);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
